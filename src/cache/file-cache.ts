import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CACHE_META_FILE, DEFAULT_CACHE_TTL } from '../constants.js';
import { hashCacheKey } from '../utils.js';
import type {
  Cache,
  CacheBucket,
  CacheSetOptions,
  CacheStats,
} from './types.js';

interface CacheFileRecord<T> {
  bucket: CacheBucket;
  expiresAt: string;
  key: string;
  storedAt: string;
  value: T;
}

interface CacheEvent {
  at: string;
  type: 'hit' | 'miss';
}

interface CacheMeta {
  lastSuccessfulFetchAt: string | null;
  recentEvents: CacheEvent[];
}

const DEFAULT_META: CacheMeta = {
  lastSuccessfulFetchAt: null,
  recentEvents: [],
};

export class FileCache implements Cache {
  constructor(
    private readonly directory: string,
    private readonly ttlSecondsByBucket: Record<CacheBucket, number> = {
      feed: DEFAULT_CACHE_TTL.feed,
      post: DEFAULT_CACHE_TTL.post,
      product: DEFAULT_CACHE_TTL.product,
      user: DEFAULT_CACHE_TTL.user,
    },
    private readonly cacheErrors = false,
  ) {}

  async get<T>(bucket: CacheBucket, key: string): Promise<T | null> {
    const filePath = this.getBucketFilePath(bucket, key);

    try {
      const raw = await readFile(filePath, 'utf8');
      const record = JSON.parse(raw) as CacheFileRecord<T>;

      if (Date.parse(record.expiresAt) <= Date.now()) {
        await unlink(filePath).catch(() => undefined);
        await this.recordEvent('miss');
        return null;
      }

      await this.recordEvent('hit');
      return record.value;
    } catch {
      await this.recordEvent('miss');
      return null;
    }
  }

  async set<T>(
    bucket: CacheBucket,
    key: string,
    value: T,
    options: CacheSetOptions = {},
  ): Promise<void> {
    if (options.isError && !this.cacheErrors) {
      return;
    }

    await this.ensureBucketDirectory(bucket);

    const now = new Date();
    const ttlSeconds = options.ttlSeconds ?? this.ttlSecondsByBucket[bucket];
    const filePath = this.getBucketFilePath(bucket, key);
    const record: CacheFileRecord<T> = {
      bucket,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      key,
      storedAt: now.toISOString(),
      value,
    };

    await writeFile(filePath, JSON.stringify(record), 'utf8');
    await this.updateMeta((meta) => ({
      ...meta,
      lastSuccessfulFetchAt: now.toISOString(),
    }));
  }

  async clear(bucket?: CacheBucket): Promise<void> {
    if (bucket) {
      await rm(path.join(this.directory, bucket), {
        force: true,
        recursive: true,
      });
      return;
    }

    await rm(this.directory, { force: true, recursive: true });
  }

  async getStats(): Promise<CacheStats> {
    const meta = await this.readMeta();
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = meta.recentEvents.filter(
      (event) => Date.parse(event.at) >= since,
    );
    const hitsLast24Hours = recentEvents.filter(
      (event) => event.type === 'hit',
    ).length;
    const missesLast24Hours = recentEvents.filter(
      (event) => event.type === 'miss',
    ).length;
    const total = hitsLast24Hours + missesLast24Hours;

    return {
      hitRateLast24Hours: total === 0 ? 0 : hitsLast24Hours / total,
      hitsLast24Hours,
      lastSuccessfulFetchAt: meta.lastSuccessfulFetchAt,
      missesLast24Hours,
    };
  }

  private getBucketFilePath(bucket: CacheBucket, key: string): string {
    return path.join(this.directory, bucket, `${hashCacheKey(key)}.json`);
  }

  private async ensureBucketDirectory(bucket: CacheBucket): Promise<void> {
    await mkdir(path.join(this.directory, bucket), { recursive: true });
  }

  private async readMeta(): Promise<CacheMeta> {
    try {
      const raw = await readFile(
        path.join(this.directory, CACHE_META_FILE),
        'utf8',
      );
      const parsed = JSON.parse(raw) as CacheMeta;
      return {
        lastSuccessfulFetchAt: parsed.lastSuccessfulFetchAt ?? null,
        recentEvents: Array.isArray(parsed.recentEvents)
          ? parsed.recentEvents
          : [],
      };
    } catch {
      return { ...DEFAULT_META };
    }
  }

  private async recordEvent(type: CacheEvent['type']): Promise<void> {
    await this.updateMeta((meta) => ({
      ...meta,
      recentEvents: [
        ...meta.recentEvents.filter(
          (event) =>
            Date.parse(event.at) >= Date.now() - 7 * 24 * 60 * 60 * 1000,
        ),
        { at: new Date().toISOString(), type },
      ],
    }));
  }

  private async updateMeta(
    update: (meta: CacheMeta) => CacheMeta,
  ): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const filePath = path.join(this.directory, CACHE_META_FILE);
    const current = await this.readMeta();
    const next = update(current);
    await writeFile(filePath, JSON.stringify(next), 'utf8');
  }
}
