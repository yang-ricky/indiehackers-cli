import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { FileCache } from '../../src/cache/file-cache.js';

const cleanupDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('FileCache', () => {
  it('supports get/set/clear', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ih-cache-test-'));
    cleanupDirectories.push(directory);
    const cache = new FileCache(directory);

    await cache.set('feed', 'latest:1:20', { ok: true });
    expect(await cache.get('feed', 'latest:1:20')).toEqual({ ok: true });

    await cache.clear();
    expect(await cache.get('feed', 'latest:1:20')).toBeNull();
  });

  it('expires entries when ttl has elapsed', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ih-cache-ttl-'));
    cleanupDirectories.push(directory);
    const cache = new FileCache(directory);

    await cache.set('post', 'post:one', { ok: true }, { ttlSeconds: 0 });
    expect(await cache.get('post', 'post:one')).toBeNull();
  });

  it('skips caching error payloads when cacheErrors is false', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'ih-cache-errors-'));
    cleanupDirectories.push(directory);
    const cache = new FileCache(directory, undefined, false);

    await cache.set('product', 'broken', { ok: false }, { isError: true });
    expect(await cache.get('product', 'broken')).toBeNull();
  });
});
