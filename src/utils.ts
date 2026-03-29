import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';

import {
  CACHE_DIR,
  CONFIG_DIR,
  CONFIG_FILE,
  IH_BASE_URL,
  IH_POST_URL,
  IH_PRODUCT_URL,
} from './constants.js';

export function getAppDirectory(): string {
  return path.join(resolveHomeDirectory(), CONFIG_DIR);
}

export function getConfigPath(): string {
  return path.join(getAppDirectory(), CONFIG_FILE);
}

export function getDefaultCacheDirectory(): string {
  return path.join(getAppDirectory(), CACHE_DIR);
}

export function ensureAbsoluteUrl(value: string): string {
  return new URL(value, IH_BASE_URL).toString();
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeMultilineText(value: string): string {
  const lines = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim());

  const normalized: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (normalized.at(-1) !== '') {
        normalized.push('');
      }
      continue;
    }

    normalized.push(line);
  }

  return normalized
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function numericTextToNumber(
  value: string | null | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/[^\d.-]/g, '');
  if (!digits) {
    return undefined;
  }

  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toNullableString(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}

export function extractPostId(input: string): string {
  const value = stripUrlDecorations(input);
  const pathname = getPathname(value);
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments.at(-1);

  if (!lastSegment) {
    return value;
  }

  const token = lastSegment.split('-').at(-1);
  return token || lastSegment;
}

export function extractProductSlug(input: string): string {
  const value = stripUrlDecorations(input);
  const pathname = getPathname(value);
  const segments = pathname.split('/').filter(Boolean);
  const productIndex = segments.indexOf('product');

  if (productIndex >= 0) {
    return segments[productIndex + 1] ?? segments.at(-1) ?? value;
  }

  return segments.at(-1) ?? value;
}

export function buildPostUrl(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }

  const value = stripUrlDecorations(input);
  return value.startsWith('/post/')
    ? ensureAbsoluteUrl(value)
    : IH_POST_URL(value);
}

export function buildProductUrl(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }

  const value = stripUrlDecorations(input);
  return value.startsWith('/product/')
    ? ensureAbsoluteUrl(value)
    : IH_PRODUCT_URL(value);
}

export function stripUrlDecorations(value: string): string {
  return value.replace(/[?#].*$/, '').trim();
}

export function hashCacheKey(value: string): string {
  return createHash('sha1').update(value).digest('hex');
}

export function toIsoStringFromTimestamp(
  value: number | null | undefined,
): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function getPathname(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return new URL(value).pathname;
  }

  return value;
}

function resolveHomeDirectory(): string {
  const envHome =
    process.env.HOME ||
    process.env.USERPROFILE ||
    (process.env.HOMEDRIVE && process.env.HOMEPATH
      ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)
      : undefined);

  return envHome || homedir();
}
