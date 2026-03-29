import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnonymousAuth } from '../../src/auth/anonymous.js';
import { ScraperBackend } from '../../src/backends/scraper.js';
import type { Cache } from '../../src/cache/types.js';
import type { ResolvedConfig } from '../../src/config.js';
import {
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  IH_BASE_URL,
  IH_FIREBASE_DB_URL,
  IH_RSS_URL,
  KNOWN_POST_SLUG,
  KNOWN_PRODUCT_SLUG,
} from '../../src/constants.js';
import { parsePostDetailFromHtml } from '../../src/parsers/post.js';
import { parseProductFromHtml } from '../../src/parsers/product.js';
import {
  buildPostUrl,
  buildProductUrl,
  extractPostId,
} from '../../src/utils.js';

const originalFetch = globalThis.fetch;
const brokenRssUrl = 'https://feed.indiehackers.world/posts.rss';

const cache: Cache = {
  async clear() {},
  async get() {
    return null;
  },
  async getStats() {
    return {
      hitRateLast24Hours: 0,
      hitsLast24Hours: 0,
      lastSuccessfulFetchAt: null,
      missesLast24Hours: 0,
    };
  },
  async set() {},
};

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

function createBackend(
  overrides: Partial<ResolvedConfig> = {},
): ScraperBackend {
  return new ScraperBackend({
    authProvider: new AnonymousAuth(DEFAULT_USER_AGENT),
    cache,
    config: {
      cache: {
        cacheErrors: false,
        dir: path.join(process.cwd(), '.tmp-test-cache'),
        enabled: false,
        ttl: DEFAULT_CACHE_TTL,
        ...overrides.cache,
      },
      request: {
        delayMs: 0,
        retries: 0,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        userAgent: DEFAULT_USER_AGENT,
        ...overrides.request,
      },
      rss: {
        url: IH_RSS_URL,
        ...overrides.rss,
      },
    },
  });
}

function installFetchMock(
  responder: (url: string) => Promise<Response> | Response,
): void {
  globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    return responder(url);
  }) as typeof fetch;
}

describe('ScraperBackend', () => {
  it('falls back to HTML when the Firebase post request fails', async () => {
    const url = buildPostUrl(KNOWN_POST_SLUG);
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/post-page.sample.html'),
      'utf8',
    );

    installFetchMock((requestedUrl) => {
      if (requestedUrl === url) {
        return new Response(html, { status: 200 });
      }

      if (
        requestedUrl ===
        `${IH_FIREBASE_DB_URL}/posts/${extractPostId(KNOWN_POST_SLUG)}.json`
      ) {
        throw new Error('connect ETIMEDOUT');
      }

      throw new Error(`Unexpected URL: ${requestedUrl}`);
    });

    const post = await createBackend().getPost(KNOWN_POST_SLUG);

    expect(post).toEqual(parsePostDetailFromHtml(html, url));
  });

  it('falls back to product HTML when Firebase is unavailable', async () => {
    const url = buildProductUrl(KNOWN_PRODUCT_SLUG);
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/product-card.sample.html'),
      'utf8',
    );

    installFetchMock((requestedUrl) => {
      if (
        requestedUrl ===
        `${IH_FIREBASE_DB_URL}/products/${KNOWN_PRODUCT_SLUG}.json`
      ) {
        throw new Error('connect ECONNRESET');
      }

      if (requestedUrl === url) {
        return new Response(html, { status: 200 });
      }

      throw new Error(`Unexpected URL: ${requestedUrl}`);
    });

    const product = await createBackend().getProduct(KNOWN_PRODUCT_SLUG);

    expect(product).toEqual(parseProductFromHtml(html, url));
  });

  it('uses RSS fallbacks and reports Firebase probe failures in doctor', async () => {
    const homeHtml = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/home-page.html'),
      'utf8',
    );
    const postHtml = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/post-page.sample.html'),
      'utf8',
    );
    const rssXml = await readFile(
      path.join(process.cwd(), 'tests/fixtures/rss/feed.xml'),
      'utf8',
    );

    installFetchMock((requestedUrl) => {
      if (requestedUrl === IH_BASE_URL) {
        return new Response(homeHtml, { status: 200 });
      }

      if (requestedUrl === brokenRssUrl) {
        return new Response('missing', { status: 404 });
      }

      if (requestedUrl === IH_RSS_URL) {
        return new Response(rssXml, {
          headers: { 'content-type': 'application/rss+xml' },
          status: 200,
        });
      }

      if (requestedUrl === buildPostUrl(KNOWN_POST_SLUG)) {
        return new Response(postHtml, { status: 200 });
      }

      if (
        requestedUrl ===
        `${IH_FIREBASE_DB_URL}/products/${KNOWN_PRODUCT_SLUG}.json`
      ) {
        throw new Error('connect ETIMEDOUT');
      }

      throw new Error(`Unexpected URL: ${requestedUrl}`);
    });

    const doctor = await createBackend({
      rss: {
        url: brokenRssUrl,
      },
    }).doctor();

    expect(doctor.connectivity.websiteReachable).toBe(true);
    expect(doctor.connectivity.rssItems).toBeGreaterThan(0);
    expect(
      doctor.providers.find((provider) => provider.name === 'rss'),
    ).toMatchObject({
      status: 'active',
    });
    expect(
      doctor.providers.find((provider) => provider.name === 'firebase'),
    ).toMatchObject({
      status: 'unavailable',
    });
  });
});
