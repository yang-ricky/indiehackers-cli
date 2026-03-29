import type { Command } from 'commander';

import { AnonymousAuth } from '../auth/anonymous.js';
import { ScraperBackend } from '../backends/scraper.js';
import type { DoctorReport } from '../backends/types.js';
import { FileCache } from '../cache/file-cache.js';
import { type LoadedConfig, loadConfig } from '../config.js';
import { ArgumentError, CLIError, isCLIError } from '../errors.js';
import {
  formatConfigView,
  formatDoctor,
  formatPostDetail,
  formatPostsTable,
  formatProduct,
} from '../formatter.js';
import {
  errorOutput,
  type Post,
  type PostDetail,
  type Product,
  successOutput,
} from '../models/index.js';
import { resolveOutputMode } from '../output.js';
import { serializeOutput } from '../serializer.js';

export interface GlobalOptions {
  json?: boolean;
  limit?: number | string;
  page?: number | string;
  verbose?: boolean;
  yaml?: boolean;
}

export interface RuntimeContext {
  backend: ScraperBackend;
  cache: FileCache;
  loadedConfig: LoadedConfig;
}

export async function createRuntime(): Promise<RuntimeContext> {
  const loadedConfig = await loadConfig();
  const authProvider = new AnonymousAuth(loadedConfig.values.request.userAgent);
  const cache = new FileCache(
    loadedConfig.values.cache.dir,
    loadedConfig.values.cache.ttl,
    loadedConfig.values.cache.cacheErrors,
  );
  const backend = new ScraperBackend({
    authProvider,
    cache,
    config: loadedConfig.values,
  });

  return { backend, cache, loadedConfig };
}

export function getGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals<GlobalOptions>();
}

export function readPositiveInt(
  value: number | string | undefined,
  fallback: number,
  key: 'limit' | 'page',
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ArgumentError(`\`${key}\` must be a positive integer.`);
  }

  return parsed;
}

export function printFormattedResult(
  data: Post[] | PostDetail | Product | DoctorReport | LoadedConfig['values'],
  kind: 'config' | 'doctor' | 'post' | 'posts' | 'product',
  options: GlobalOptions,
  sources?: Record<string, string>,
): void {
  const output = resolveOutputMode(options);

  if (output.warning) {
    console.error(output.warning);
  }

  emitVerboseWarnings(kind, data, options.verbose);

  if (output.mode === 'table') {
    switch (kind) {
      case 'posts':
        console.log(formatPostsTable(data as Post[]));
        return;
      case 'post':
        console.log(formatPostDetail(data as PostDetail));
        return;
      case 'product':
        console.log(formatProduct(data as Product));
        return;
      case 'doctor':
        console.log(formatDoctor(data as DoctorReport));
        return;
      case 'config':
        console.log(
          formatConfigView(data as unknown as Record<string, unknown>, sources),
        );
        return;
    }
  }

  if (kind === 'config' && sources) {
    console.log(
      serializeOutput(
        successOutput({
          sources,
          values: data,
        }),
        output.mode,
      ),
    );
    return;
  }

  console.log(serializeOutput(successOutput(data), output.mode));
}

export function handleCommandError(error: unknown): never {
  const resolved =
    error instanceof Error ? error : new CLIError('Unknown error');
  const code = isCLIError(resolved) ? resolved.code : 'unexpected_error';
  const exitCode = isCLIError(resolved) ? resolved.exitCode : 1;
  const mode = resolveOutputMode({
    json: process.argv.includes('--json'),
    yaml: process.argv.includes('--yaml'),
  }).mode;

  if (mode === 'json' || mode === 'yaml' || !process.stderr.isTTY) {
    console.log(
      serializeOutput(
        errorOutput(code, resolved.message, exitCode),
        mode === 'table' ? 'json' : mode,
      ),
    );
  } else {
    console.error(resolved.message);
  }

  process.exitCode = exitCode;
  process.exit();
}

function emitVerboseWarnings(
  kind: 'config' | 'doctor' | 'post' | 'posts' | 'product',
  data: Post[] | PostDetail | Product | DoctorReport | LoadedConfig['values'],
  verbose = false,
): void {
  if (!verbose) {
    return;
  }

  const warnings: string[] = [];

  if (kind === 'posts') {
    for (const post of data as Post[]) {
      if (post.score === undefined) {
        warnings.push(`Post ${post.id} is missing fragile field: score`);
      }
    }
  }

  if (kind === 'post') {
    const post = data as PostDetail;
    if (post.score === undefined) {
      warnings.push(`Post ${post.id} is missing fragile field: score`);
    }
    if (!post.relatedPosts?.length) {
      warnings.push(`Post ${post.id} is missing fragile field: relatedPosts`);
    }
  }

  if (kind === 'product') {
    const product = data as Product;
    if (product.revenue === undefined) {
      warnings.push(
        `Product ${product.name} is missing fragile field: revenue`,
      );
    }
    if (!product.milestones?.length) {
      warnings.push(
        `Product ${product.name} is missing fragile field: milestones`,
      );
    }
  }

  for (const warning of warnings) {
    console.error(`warning: ${warning}`);
  }
}
