import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const cleanupDirectories: string[] = [];
const originalEnv = { ...process.env };

afterEach(async () => {
  process.env = { ...originalEnv };
  vi.resetModules();
  await Promise.all(
    cleanupDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('config', () => {
  it('loads defaults when no env or file config is present', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'ih-config-defaults-'));
    cleanupDirectories.push(home);
    process.env.HOME = home;

    const { loadConfig } = await import('../../src/config.js');
    const loaded = await loadConfig();

    expect(loaded.values.cache.ttl).toEqual({
      feed: 300,
      post: 600,
      product: 3600,
      user: 1800,
    });
    expect(loaded.values.cache.dir).toBe(
      path.join(home, '.indiehackers-cli', 'cache'),
    );
    expect(loaded.sources['request.retries']).toBe('default');
  });

  it('applies precedence cli > env > file > defaults', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'ih-config-precedence-'));
    cleanupDirectories.push(home);
    process.env.HOME = home;
    process.env.IH_REQUEST_RETRIES = '8';
    process.env.IH_CACHE_TTL_PRODUCT = '222';

    const configDir = path.join(home, '.indiehackers-cli');
    await mkdir(configDir, { recursive: true });
    await writeFile(
      path.join(configDir, 'config.yaml'),
      'request:\n  retries: 7\ncache:\n  ttl:\n    product: 333\n  enabled: false\n',
      'utf8',
    );

    const { loadConfig } = await import('../../src/config.js');
    const loaded = await loadConfig({
      cache: {
        ttl: {
          product: 111,
        },
      },
      request: {
        retries: 9,
      },
    });

    expect(loaded.values.request.retries).toBe(9);
    expect(loaded.values.cache.ttl.product).toBe(111);
    expect(loaded.values.cache.enabled).toBe(false);
    expect(loaded.sources['request.retries']).toBe('cli');
    expect(loaded.sources['cache.ttl.product']).toBe('cli');
    expect(loaded.sources['cache.enabled']).toBe('file');
  });

  it('writes config values and reads them back', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'ih-config-write-'));
    cleanupDirectories.push(home);
    process.env.HOME = home;

    const { loadConfig, setConfigValue } = await import('../../src/config.js');
    await setConfigValue('request.retries', '5');
    await setConfigValue('cache.enabled', 'false');

    const raw = await readFile(
      path.join(home, '.indiehackers-cli', 'config.yaml'),
      'utf8',
    );
    expect(raw).toContain('retries: 5');
    expect(raw).toContain('enabled: false');

    const loaded = await loadConfig();
    expect(loaded.values.request.retries).toBe(5);
    expect(loaded.values.cache.enabled).toBe(false);
    expect(loaded.sources['request.retries']).toBe('file');
  });
});
