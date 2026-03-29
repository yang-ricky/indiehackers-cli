import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { AnonymousAuth } from '../../src/auth/anonymous.js';
import { ScraperBackend } from '../../src/backends/scraper.js';
import { FileCache } from '../../src/cache/file-cache.js';
import {
  DEFAULT_CACHE_TTL,
  DEFAULT_DELAY_MS,
  DEFAULT_RETRIES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  IH_RSS_URL,
  KNOWN_POST_SLUG,
  KNOWN_PRODUCT_SLUG,
} from '../../src/constants.js';

const liveIt = process.env.IH_LIVE_TESTS === '1' ? it : it.skip;
const cacheDirectory = await mkdtemp(path.join(tmpdir(), 'ih-live-cache-'));

afterAll(async () => {
  await rm(cacheDirectory, { force: true, recursive: true });
});

describe('ScraperBackend integration', () => {
  liveIt(
    'fetches latest posts, a known post, a known product, and doctor output',
    { timeout: 30_000 },
    async () => {
      const backend = new ScraperBackend({
        authProvider: new AnonymousAuth(DEFAULT_USER_AGENT),
        cache: new FileCache(cacheDirectory, DEFAULT_CACHE_TTL, false),
        config: {
          cache: {
            cacheErrors: false,
            dir: cacheDirectory,
            enabled: true,
            ttl: DEFAULT_CACHE_TTL,
          },
          request: {
            delayMs: DEFAULT_DELAY_MS,
            retries: DEFAULT_RETRIES,
            timeoutMs: DEFAULT_TIMEOUT_MS,
            userAgent: DEFAULT_USER_AGENT,
          },
          rss: {
            url: IH_RSS_URL,
          },
        },
      });

      const latest = await backend.getLatest({ limit: 1, page: 1 });
      expect(latest).toHaveLength(1);
      expect(latest[0]?.id).toBeTruthy();
      expect(latest[0]?.title).toBeTruthy();

      const post = await backend.getPost(KNOWN_POST_SLUG);
      expect(post.id).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.body).toBeTruthy();

      const product = await backend.getProduct(KNOWN_PRODUCT_SLUG);
      expect(product.name).toBeTruthy();
      expect(product.url).toContain(`/product/${KNOWN_PRODUCT_SLUG}`);

      const doctor = await backend.doctor();
      expect(doctor.connectivity.websiteReachable).toBe(true);
      expect(doctor.providers.length).toBeGreaterThan(0);
    },
  );
});
