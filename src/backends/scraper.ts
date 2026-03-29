import { access, constants, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AuthProvider } from '../auth/types.js';
import { FileCache } from '../cache/file-cache.js';
import type { Cache, CacheBucket } from '../cache/types.js';
import type { ResolvedConfig } from '../config.js';
import {
  IH_BASE_URL,
  IH_FIREBASE_DB_URL,
  KNOWN_POST_SLUG,
} from '../constants.js';
import { CLIError, NotFoundError } from '../errors.js';
import { HttpClient } from '../http.js';
import type { Post, PostDetail, Product, User } from '../models/index.js';
import {
  parseLatestPostsFromHtml,
  parsePostDetailFromHtml,
} from '../parsers/post.js';
import { productFromFirebaseRecord } from '../parsers/product.js';
import { parseRssFeed } from '../parsers/rss.js';
import {
  buildPostUrl,
  compactObject,
  extractPostId,
  extractProductSlug,
  toIsoStringFromTimestamp,
} from '../utils.js';
import type { Backend, DoctorReport, LatestOptions } from './types.js';

interface FirebasePostRecord {
  body?: string;
  createdTimestamp?: number;
  numReplies?: number;
  title?: string;
  updatedTimestamp?: number;
  username?: string;
}

interface FirebaseProductRecord {
  description?: string;
  name?: string;
  tagline?: string;
  userRoles?: Record<string, { role?: string }>;
  websiteUrl?: string;
}

interface FirebaseProductStats {
  monthlyRevenue?: string;
  numViews?: number;
  revenue?: string;
}

interface FirebaseUserRecord {
  fullName?: string;
  name?: string;
  username?: string;
}

export interface ScraperBackendOptions {
  authProvider: AuthProvider;
  cache: Cache;
  config: ResolvedConfig;
}

export class ScraperBackend implements Backend {
  private readonly http: HttpClient;

  constructor(private readonly options: ScraperBackendOptions) {
    this.http = new HttpClient({
      authProvider: options.authProvider,
      delayMs: options.config.request.delayMs,
      retries: options.config.request.retries,
      timeoutMs: options.config.request.timeoutMs,
    });
  }

  async getLatest(options: LatestOptions = {}): Promise<Post[]> {
    const limit = options.limit ?? 20;
    const page = options.page ?? 1;
    const cacheKey = `latest:${page}:${limit}`;

    const cached = await this.getCached<Post[]>('feed', cacheKey);
    if (cached) {
      return cached;
    }

    let posts: Post[] | undefined;
    try {
      posts = await this.getLatestViaRss(limit, page);
    } catch {
      posts = undefined;
    }

    if (!posts?.length) {
      posts = await this.getLatestViaHtml(limit, page);
    }

    await this.setCached('feed', cacheKey, posts);
    return posts;
  }

  async getPost(slug: string): Promise<PostDetail> {
    const cacheKey = slug;
    const cached = await this.getCached<PostDetail>('post', cacheKey);
    if (cached) {
      return cached;
    }

    const url = buildPostUrl(slug);
    let htmlDetail: PostDetail | undefined;

    try {
      const html = await this.http.getText(url);
      htmlDetail = parsePostDetailFromHtml(html, url);
    } catch {
      htmlDetail = undefined;
    }

    const postId = extractPostId(slug);
    const firebase = await this.http.getJson<FirebasePostRecord | null>(
      `${IH_FIREBASE_DB_URL}/posts/${postId}.json`,
    );

    if (!firebase && !htmlDetail) {
      throw new NotFoundError(`Post not found: ${slug}`);
    }

    const merged = compactObject({
      author: htmlDetail?.author ?? firebase?.username,
      body: htmlDetail?.body ?? firebase?.body,
      commentCount: htmlDetail?.commentCount ?? firebase?.numReplies,
      comments: htmlDetail?.comments,
      date:
        htmlDetail?.date ??
        toIsoStringFromTimestamp(
          firebase?.createdTimestamp ?? firebase?.updatedTimestamp,
        ),
      id: postId,
      score: htmlDetail?.score,
      title: htmlDetail?.title ?? firebase?.title,
      url,
    }) as PostDetail;

    if (!merged.title || !merged.body) {
      throw new NotFoundError(`Post payload is incomplete for ${slug}`);
    }

    await this.setCached('post', cacheKey, merged);
    return merged;
  }

  async getProduct(slugInput: string): Promise<Product> {
    const slug = extractProductSlug(slugInput);
    const cached = await this.getCached<Product>('product', slug);
    if (cached) {
      return cached;
    }

    const productRecord = await this.http.getJson<FirebaseProductRecord | null>(
      `${IH_FIREBASE_DB_URL}/products/${slug}.json`,
    );

    if (!productRecord) {
      throw new NotFoundError(`Product not found: ${slug}`);
    }

    const stats = await this.http
      .getJson<FirebaseProductStats | null>(
        `${IH_FIREBASE_DB_URL}/indexes/productStats/${slug}.json`,
      )
      .catch(() => null);

    const founderId = Object.keys(productRecord.userRoles ?? {}).at(0);
    const founder = founderId
      ? await this.getUserLabel(founderId).catch(() => undefined)
      : undefined;

    const product = compactObject({
      ...productFromFirebaseRecord(slug, productRecord),
      maker: founder,
      revenue: stats?.revenue ?? stats?.monthlyRevenue,
    });

    await this.setCached('product', slug, product);
    return product;
  }

  async doctor(): Promise<DoctorReport> {
    const websiteStart = Date.now();
    const homeHtml = await this.http.getText(IH_BASE_URL).catch(() => null);
    const websiteResponseTime = homeHtml ? Date.now() - websiteStart : null;

    const rssStart = Date.now();
    const rssXml = await this.http
      .getText(this.options.config.rss.url)
      .catch(() => null);
    const rssResponseTime = rssXml ? Date.now() - rssStart : null;
    const rssItems = rssXml ? (await parseRssFeed(rssXml)).length : null;

    const postHtml = await this.http
      .getText(buildPostUrl(KNOWN_POST_SLUG))
      .catch(() => null);
    const homeFeedMatches =
      !!homeHtml && parseLatestPostsFromHtml(homeHtml).length > 0;
    const postPageMatches = (() => {
      if (!postHtml) {
        return false;
      }

      try {
        return !!parsePostDetailFromHtml(
          postHtml,
          buildPostUrl(KNOWN_POST_SLUG),
        ).body;
      } catch {
        return false;
      }
    })();
    const productCardsMatch =
      !!homeHtml && homeHtml.includes('entry__product-name');

    const cacheStats = await this.options.cache.getStats();
    const writable = await isDirectoryWritable(this.options.config.cache.dir);

    return {
      cache: {
        directory: this.options.config.cache.dir,
        hitRateLast24Hours: cacheStats.hitRateLast24Hours,
        hitsLast24Hours: cacheStats.hitsLast24Hours,
        lastSuccessfulFetchAt: cacheStats.lastSuccessfulFetchAt,
        missesLast24Hours: cacheStats.missesLast24Hours,
        writable,
      },
      connectivity: {
        responseTimeMs: websiteResponseTime,
        rssItems,
        rssResponseTimeMs: rssResponseTime,
        websiteReachable: !!homeHtml,
      },
      fixes: buildFixes({
        homeFeedMatches,
        postPageMatches,
        productCardsMatch,
        rssReachable: !!rssXml,
        writable,
      }),
      knownIssues: [],
      providers: [
        {
          detail:
            homeFeedMatches && postPageMatches
              ? 'Homepage feed and post pages are parseable.'
              : 'Some HTML selectors are not matching.',
          name: 'html',
          status: homeFeedMatches && postPageMatches ? 'active' : 'degraded',
        },
        {
          detail: rssXml
            ? `Unofficial RSS reachable with ${rssItems ?? 0} items.`
            : 'Unofficial RSS is unreachable.',
          name: 'rss',
          status: rssXml ? 'active' : 'degraded',
        },
        {
          detail:
            'Realtime Database endpoints for posts and products are publicly readable.',
          name: 'firebase',
          status: 'active',
        },
      ],
      selectors: {
        homeFeedMatches,
        postPageMatches,
        productCardsMatch,
      },
    };
  }

  async getTop(): Promise<Post[]> {
    throw new CLIError('`ih top` is not implemented yet.');
  }

  async getUser(username: string): Promise<User> {
    throw new CLIError(`User lookup is not implemented yet: ${username}`);
  }

  async search(query: string): Promise<Post[]> {
    throw new CLIError(`Search is not implemented yet: ${query}`);
  }

  private async getLatestViaRss(limit: number, page: number): Promise<Post[]> {
    const xml = await this.http.getText(this.options.config.rss.url);
    const posts = await parseRssFeed(xml);
    return paginate(posts, limit, page);
  }

  private async getLatestViaHtml(limit: number, page: number): Promise<Post[]> {
    const html = await this.http.getText(IH_BASE_URL);
    const posts = parseLatestPostsFromHtml(html);
    return paginate(posts, limit, page);
  }

  private async getCached<T>(
    bucket: CacheBucket,
    key: string,
  ): Promise<T | null> {
    if (!this.options.config.cache.enabled) {
      return null;
    }

    return this.options.cache.get<T>(bucket, key);
  }

  private async setCached<T>(
    bucket: CacheBucket,
    key: string,
    value: T,
  ): Promise<void> {
    if (!this.options.config.cache.enabled) {
      return;
    }

    await this.options.cache.set(bucket, key, value);
  }

  private async getUserLabel(userId: string): Promise<string | undefined> {
    const userRecord = await this.http.getJson<FirebaseUserRecord | null>(
      `${IH_FIREBASE_DB_URL}/users/${userId}.json`,
    );

    return userRecord?.fullName || userRecord?.name || userRecord?.username;
  }
}

function paginate<T>(items: T[], limit: number, page: number): T[] {
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;
  return items.slice(offset, offset + safeLimit);
}

async function isDirectoryWritable(directory: string): Promise<boolean> {
  try {
    await mkdir(directory, { recursive: true });
    const probe = path.join(directory, '.doctor-write-test');
    await writeFile(probe, 'ok', 'utf8');
    await unlink(probe);
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function buildFixes(input: {
  homeFeedMatches: boolean;
  postPageMatches: boolean;
  productCardsMatch: boolean;
  rssReachable: boolean;
  writable: boolean;
}): string[] {
  const fixes: string[] = [];

  if (!input.rssReachable) {
    fixes.push(
      'Set `rss.url` to a reachable unofficial feed or rely on HTML fallback for `ih latest`.',
    );
  }
  if (!input.homeFeedMatches) {
    fixes.push(
      'Update homepage selectors in `src/selectors.ts` for `.story` cards.',
    );
  }
  if (!input.postPageMatches) {
    fixes.push(
      'Refresh post selectors in `src/selectors.ts` for `.post-page__*` markup.',
    );
  }
  if (!input.productCardsMatch) {
    fixes.push('Refresh build-board product selectors in `src/selectors.ts`.');
  }
  if (!input.writable) {
    fixes.push(
      'Ensure the cache directory is writable or disable cache via `IH_CACHE_ENABLED=false`.',
    );
  }

  return fixes;
}

export function createDefaultBackend(
  config: ResolvedConfig,
  authProvider: AuthProvider,
): Backend {
  return new ScraperBackend({
    authProvider,
    cache: new FileCache(
      config.cache.dir,
      config.cache.ttl,
      config.cache.cacheErrors,
    ),
    config,
  });
}
