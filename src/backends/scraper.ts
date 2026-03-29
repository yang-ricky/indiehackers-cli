import { access, constants, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AuthProvider } from '../auth/types.js';
import { FileCache } from '../cache/file-cache.js';
import type { Cache, CacheBucket } from '../cache/types.js';
import type { ResolvedConfig } from '../config.js';
import {
  IH_BASE_URL,
  IH_FIREBASE_DB_URL,
  IH_RSS_FALLBACK_URLS,
  IH_RSS_URL,
  KNOWN_POST_SLUG,
  KNOWN_PRODUCT_SLUG,
} from '../constants.js';
import { CLIError, NetworkError, NotFoundError } from '../errors.js';
import { HttpClient } from '../http.js';
import type { Post, PostDetail, Product, User } from '../models/index.js';
import {
  parseLatestPostsFromHtml,
  parsePostDetailFromHtml,
} from '../parsers/post.js';
import {
  parseProductFromHtml,
  productFromFirebaseRecord,
} from '../parsers/product.js';
import { parseRssFeed } from '../parsers/rss.js';
import {
  buildPostUrl,
  buildProductUrl,
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

interface RssProbeResult {
  items: number;
  responseTimeMs: number;
  url: string;
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
    const firebase = await this.http
      .getJson<FirebasePostRecord | null>(
        `${IH_FIREBASE_DB_URL}/posts/${postId}.json`,
      )
      .catch((error) => {
        if (htmlDetail) {
          return null;
        }

        throw error;
      });

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

    const productUrl = buildProductUrl(slug);
    let firebaseError: unknown;
    let htmlError: unknown;
    const productRecord = await this.http
      .getJson<FirebaseProductRecord | null>(
        `${IH_FIREBASE_DB_URL}/products/${slug}.json`,
      )
      .catch((error) => {
        firebaseError = error;
        return null;
      });

    let product: Product | undefined;

    if (productRecord) {
      const stats = await this.http
        .getJson<FirebaseProductStats | null>(
          `${IH_FIREBASE_DB_URL}/indexes/productStats/${slug}.json`,
        )
        .catch(() => null);

      const founderId = Object.keys(productRecord.userRoles ?? {}).at(0);
      const founder = founderId
        ? await this.getUserLabel(founderId).catch(() => undefined)
        : undefined;

      product = compactObject({
        ...productFromFirebaseRecord(slug, productRecord),
        maker: founder,
        revenue: stats?.revenue ?? stats?.monthlyRevenue,
      });
    }

    if (!product) {
      const html = await this.http.getText(productUrl).catch(() => null);

      if (html) {
        try {
          product = parseProductFromHtml(html, productUrl);
        } catch (error) {
          htmlError = error;
        }
      }
    }

    if (!product) {
      if (firebaseError instanceof Error) {
        throw firebaseError;
      }

      if (htmlError instanceof Error) {
        throw htmlError;
      }

      throw new NotFoundError(`Product not found: ${slug}`);
    }

    await this.setCached('product', slug, product);
    return product;
  }

  async doctor(): Promise<DoctorReport> {
    const websiteStart = Date.now();
    const homeHtml = await this.http.getText(IH_BASE_URL).catch(() => null);
    const websiteResponseTime = homeHtml ? Date.now() - websiteStart : null;

    const rssProbe = await this.probeRss();

    const postHtml = await this.http
      .getText(buildPostUrl(KNOWN_POST_SLUG))
      .catch(() => null);
    const firebaseProduct = await this.http
      .getJson<FirebaseProductRecord | null>(
        `${IH_FIREBASE_DB_URL}/products/${KNOWN_PRODUCT_SLUG}.json`,
      )
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
        rssItems: rssProbe?.items ?? null,
        rssResponseTimeMs: rssProbe?.responseTimeMs ?? null,
        websiteReachable: !!homeHtml,
      },
      fixes: buildFixes({
        homeFeedMatches,
        postPageMatches,
        productCardsMatch,
        rssReachable: !!rssProbe,
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
          detail: rssProbe
            ? `Unofficial RSS reachable at ${rssProbe.url} with ${rssProbe.items} items.`
            : 'Unofficial RSS is unreachable.',
          name: 'rss',
          status: rssProbe ? 'active' : 'degraded',
        },
        {
          detail: firebaseProduct
            ? `Realtime Database is reachable for ${KNOWN_PRODUCT_SLUG}.`
            : 'Realtime Database probe failed for the known product endpoint.',
          name: 'firebase',
          status: firebaseProduct ? 'active' : 'unavailable',
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
    let lastError: unknown;

    for (const url of this.getRssCandidateUrls()) {
      try {
        const xml = await this.http.getText(url);
        const posts = await parseRssFeed(xml);

        if (posts.length > 0) {
          return paginate(posts, limit, page);
        }

        lastError = new NetworkError(`RSS feed returned no items: ${url}`);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new NetworkError('No reachable RSS feed candidates were found.');
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

  private getRssCandidateUrls(): string[] {
    return [
      ...new Set([
        this.options.config.rss.url,
        IH_RSS_URL,
        ...IH_RSS_FALLBACK_URLS,
      ]),
    ];
  }

  private async probeRss(): Promise<RssProbeResult | null> {
    for (const url of this.getRssCandidateUrls()) {
      const startedAt = Date.now();

      try {
        const xml = await this.http.getText(url);
        const items = (await parseRssFeed(xml)).length;

        return {
          items,
          responseTimeMs: Date.now() - startedAt,
          url,
        };
      } catch {}
    }

    return null;
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
