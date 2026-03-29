import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

import {
  DEFAULT_CACHE_TTL,
  DEFAULT_DELAY_MS,
  DEFAULT_RETRIES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  IH_RSS_URL,
} from './constants.js';
import { ConfigError } from './errors.js';
import { getConfigPath, getDefaultCacheDirectory } from './utils.js';

export interface ResolvedConfig {
  cache: {
    cacheErrors: boolean;
    dir: string;
    enabled: boolean;
    ttl: {
      feed: number;
      post: number;
      product: number;
      user: number;
    };
  };
  request: {
    delayMs: number;
    retries: number;
    timeoutMs: number;
    userAgent: string;
  };
  rss: {
    url: string;
  };
}

export type ConfigKey =
  | 'cache.enabled'
  | 'cache.dir'
  | 'cache.cacheErrors'
  | 'cache.ttl.feed'
  | 'cache.ttl.post'
  | 'cache.ttl.product'
  | 'cache.ttl.user'
  | 'request.delayMs'
  | 'request.timeoutMs'
  | 'request.retries'
  | 'request.userAgent'
  | 'rss.url';

export interface LoadedConfig {
  sources: Record<ConfigKey, 'default' | 'env' | 'file' | 'cli'>;
  values: ResolvedConfig;
}

type ConfigObject = Record<string, unknown>;
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown>
    ? DeepPartial<T[K]>
    : T[K];
};

const DEFAULT_CONFIG: ResolvedConfig = {
  cache: {
    cacheErrors: false,
    dir: getDefaultCacheDirectory(),
    enabled: true,
    ttl: {
      feed: DEFAULT_CACHE_TTL.feed,
      post: DEFAULT_CACHE_TTL.post,
      product: DEFAULT_CACHE_TTL.product,
      user: DEFAULT_CACHE_TTL.user,
    },
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
};

export async function loadConfig(
  overrides: DeepPartial<ResolvedConfig> = {},
): Promise<LoadedConfig> {
  const fileConfig = pruneUndefinedDeep(await loadConfigFile());
  const envConfig = pruneUndefinedDeep(loadEnvironmentConfig());
  const cliConfig = pruneUndefinedDeep(overrides);

  const merged: ResolvedConfig = {
    cache: {
      cacheErrors: pickFirstDefined(
        cliConfig.cache?.cacheErrors,
        envConfig.cache?.cacheErrors,
        fileConfig.cache?.cacheErrors,
        DEFAULT_CONFIG.cache.cacheErrors,
      ),
      dir: pickFirstDefined(
        cliConfig.cache?.dir,
        envConfig.cache?.dir,
        fileConfig.cache?.dir,
        DEFAULT_CONFIG.cache.dir,
      ),
      enabled: pickFirstDefined(
        cliConfig.cache?.enabled,
        envConfig.cache?.enabled,
        fileConfig.cache?.enabled,
        DEFAULT_CONFIG.cache.enabled,
      ),
      ttl: {
        feed: pickFirstDefined(
          cliConfig.cache?.ttl?.feed,
          envConfig.cache?.ttl?.feed,
          fileConfig.cache?.ttl?.feed,
          DEFAULT_CONFIG.cache.ttl.feed,
        ),
        post: pickFirstDefined(
          cliConfig.cache?.ttl?.post,
          envConfig.cache?.ttl?.post,
          fileConfig.cache?.ttl?.post,
          DEFAULT_CONFIG.cache.ttl.post,
        ),
        product: pickFirstDefined(
          cliConfig.cache?.ttl?.product,
          envConfig.cache?.ttl?.product,
          fileConfig.cache?.ttl?.product,
          DEFAULT_CONFIG.cache.ttl.product,
        ),
        user: pickFirstDefined(
          cliConfig.cache?.ttl?.user,
          envConfig.cache?.ttl?.user,
          fileConfig.cache?.ttl?.user,
          DEFAULT_CONFIG.cache.ttl.user,
        ),
      },
    },
    request: {
      delayMs: pickFirstDefined(
        cliConfig.request?.delayMs,
        envConfig.request?.delayMs,
        fileConfig.request?.delayMs,
        DEFAULT_CONFIG.request.delayMs,
      ),
      retries: pickFirstDefined(
        cliConfig.request?.retries,
        envConfig.request?.retries,
        fileConfig.request?.retries,
        DEFAULT_CONFIG.request.retries,
      ),
      timeoutMs: pickFirstDefined(
        cliConfig.request?.timeoutMs,
        envConfig.request?.timeoutMs,
        fileConfig.request?.timeoutMs,
        DEFAULT_CONFIG.request.timeoutMs,
      ),
      userAgent: pickFirstDefined(
        cliConfig.request?.userAgent,
        envConfig.request?.userAgent,
        fileConfig.request?.userAgent,
        DEFAULT_CONFIG.request.userAgent,
      ),
    },
    rss: {
      url: pickFirstDefined(
        cliConfig.rss?.url,
        envConfig.rss?.url,
        fileConfig.rss?.url,
        DEFAULT_CONFIG.rss.url,
      ),
    },
  };

  return {
    sources: buildSourceMap(fileConfig, envConfig, cliConfig),
    values: validateConfig(merged),
  };
}

export async function setConfigValue(
  key: ConfigKey,
  rawValue: string,
): Promise<void> {
  const configPath = getConfigPath();
  const current = await loadConfigFile();
  const parsedValue = parseConfigValue(key, rawValue);
  const next = structuredClone(current);

  setNestedValue(next, key, parsedValue);

  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, yaml.dump(next), 'utf8');
}

export async function readRawConfigFile(): Promise<Record<string, unknown>> {
  return (await loadConfigFile()) as Record<string, unknown>;
}

async function loadConfigFile(): Promise<DeepPartial<ResolvedConfig>> {
  const configPath = getConfigPath();

  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = yaml.load(raw);
    return isConfigObject(parsed)
      ? (parsed as DeepPartial<ResolvedConfig>)
      : {};
  } catch {
    return {};
  }
}

function loadEnvironmentConfig(): DeepPartial<ResolvedConfig> {
  return {
    cache: {
      cacheErrors: parseBoolean(process.env.IH_CACHE_ERRORS),
      dir: process.env.IH_CACHE_DIR,
      enabled: parseBoolean(process.env.IH_CACHE_ENABLED),
      ttl: {
        feed: parseNumber(process.env.IH_CACHE_TTL_FEED),
        post: parseNumber(process.env.IH_CACHE_TTL_POST),
        product: parseNumber(process.env.IH_CACHE_TTL_PRODUCT),
        user: parseNumber(process.env.IH_CACHE_TTL_USER),
      },
    },
    request: {
      delayMs: parseNumber(
        process.env.IH_REQUEST_DELAY_MS ?? process.env.IH_REQUEST_DELAY,
      ),
      retries: parseNumber(process.env.IH_REQUEST_RETRIES),
      timeoutMs: parseNumber(
        process.env.IH_REQUEST_TIMEOUT_MS ?? process.env.IH_REQUEST_TIMEOUT,
      ),
      userAgent: process.env.IH_REQUEST_USER_AGENT,
    },
    rss: {
      url: process.env.IH_RSS_URL,
    },
  };
}

function validateConfig(config: ResolvedConfig): ResolvedConfig {
  const entries = [
    ['cache.ttl.feed', config.cache.ttl.feed],
    ['cache.ttl.post', config.cache.ttl.post],
    ['cache.ttl.product', config.cache.ttl.product],
    ['cache.ttl.user', config.cache.ttl.user],
    ['request.delayMs', config.request.delayMs],
    ['request.timeoutMs', config.request.timeoutMs],
    ['request.retries', config.request.retries],
  ] as const;

  for (const [key, value] of entries) {
    if (!Number.isFinite(value) || value < 0) {
      throw new ConfigError(`Invalid numeric config value for ${key}`);
    }
  }

  if (!config.request.userAgent.trim()) {
    throw new ConfigError('request.userAgent cannot be empty');
  }

  if (!config.rss.url.trim()) {
    throw new ConfigError('rss.url cannot be empty');
  }

  return config;
}

function buildSourceMap(
  fileConfig: DeepPartial<ResolvedConfig>,
  envConfig: DeepPartial<ResolvedConfig>,
  cliConfig: DeepPartial<ResolvedConfig>,
): Record<ConfigKey, 'default' | 'env' | 'file' | 'cli'> {
  const sources = Object.fromEntries(
    ALL_CONFIG_KEYS.map((key) => [key, 'default']),
  ) as Record<ConfigKey, 'default' | 'env' | 'file' | 'cli'>;

  for (const key of ALL_CONFIG_KEYS) {
    if (hasNestedValue(fileConfig, key)) {
      sources[key] = 'file';
    }
    if (hasNestedValue(envConfig, key)) {
      sources[key] = 'env';
    }
    if (hasNestedValue(cliConfig, key)) {
      sources[key] = 'cli';
    }
  }

  return sources;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) {
    return false;
  }

  throw new ConfigError(`Invalid boolean value: ${value}`);
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ConfigError(`Invalid number value: ${value}`);
  }

  return parsed;
}

function parseConfigValue(
  key: ConfigKey,
  rawValue: string,
): string | number | boolean {
  switch (key) {
    case 'cache.enabled':
    case 'cache.cacheErrors':
      return parseBoolean(rawValue) ?? false;
    case 'cache.ttl.feed':
    case 'cache.ttl.post':
    case 'cache.ttl.product':
    case 'cache.ttl.user':
    case 'request.delayMs':
    case 'request.timeoutMs':
    case 'request.retries':
      return parseNumber(rawValue) ?? 0;
    default:
      return rawValue;
  }
}

function setNestedValue(
  target: ConfigObject,
  key: ConfigKey,
  value: unknown,
): void {
  const segments = key.split('.');
  let cursor = target;

  for (const segment of segments.slice(0, -1)) {
    const existing = cursor[segment];
    if (!isConfigObject(existing)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as ConfigObject;
  }

  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    throw new ConfigError(`Invalid config key: ${key}`);
  }

  cursor[lastSegment] = value;
}

function hasNestedValue(target: unknown, key: ConfigKey): boolean {
  const segments = key.split('.');
  let cursor = target as Record<string, unknown> | undefined;

  for (const segment of segments) {
    if (!cursor || !(segment in cursor)) {
      return false;
    }

    cursor = cursor[segment] as Record<string, unknown> | undefined;
  }

  return true;
}

function pruneUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefinedDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entryValue]) => {
        if (entryValue === undefined) {
          return [];
        }

        return [[key, pruneUndefinedDeep(entryValue)]];
      }),
    ) as T;
  }

  return value;
}

function isConfigObject(value: unknown): value is ConfigObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pickFirstDefined<T>(...values: Array<T | undefined>): T {
  for (const value of values) {
    if (value !== undefined) {
      return value;
    }
  }

  throw new ConfigError('Missing configuration value');
}

const ALL_CONFIG_KEYS: ConfigKey[] = [
  'cache.enabled',
  'cache.dir',
  'cache.cacheErrors',
  'cache.ttl.feed',
  'cache.ttl.post',
  'cache.ttl.product',
  'cache.ttl.user',
  'request.delayMs',
  'request.timeoutMs',
  'request.retries',
  'request.userAgent',
  'rss.url',
];
