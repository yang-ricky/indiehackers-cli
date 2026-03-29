import chalk from 'chalk';
import Table from 'cli-table3';

import type { DoctorReport } from './backends/types.js';
import type { Post, PostDetail, Product } from './models/index.js';

function valueOrDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === ''
    ? '-'
    : String(value);
}

export function formatPostsTable(posts: Post[]): string {
  const table = new Table({
    head: ['Title', 'Author', 'Date', 'Score', 'Comments'],
    style: { head: [chalk.cyan('Title')] },
    wordWrap: true,
  });

  for (const post of posts) {
    table.push([
      post.title,
      valueOrDash(post.author),
      valueOrDash(post.date),
      valueOrDash(post.score),
      valueOrDash(post.commentCount),
    ]);
  }

  return table.toString();
}

export function formatPostDetail(post: PostDetail): string {
  const lines = [
    chalk.bold(post.title),
    `URL: ${post.url}`,
    `Author: ${valueOrDash(post.author)}`,
    `Date: ${valueOrDash(post.date)}`,
    `Score: ${valueOrDash(post.score)}`,
    `Comments: ${valueOrDash(post.commentCount)}`,
    '',
    post.body,
  ];

  if (post.comments?.length) {
    lines.push('', chalk.bold(`Comments (${post.comments.length})`));

    for (const [index, comment] of post.comments.entries()) {
      lines.push(
        `${index + 1}. ${valueOrDash(comment.author)} · ${valueOrDash(comment.date)}`,
        comment.body,
        '',
      );
    }
  }

  return lines.join('\n').trimEnd();
}

export function formatProduct(product: Product): string {
  const lines = [
    chalk.bold(product.name),
    `URL: ${product.url}`,
    `Tagline: ${valueOrDash(product.tagline)}`,
    `Maker: ${valueOrDash(product.maker)}`,
    `Revenue: ${valueOrDash(product.revenue)}`,
  ];

  if (product.description) {
    lines.push('', product.description);
  }

  if (product.milestones?.length) {
    lines.push('', chalk.bold('Milestones'));
    for (const [index, milestone] of product.milestones.entries()) {
      lines.push(
        `${index + 1}. ${valueOrDash(milestone.description ?? milestone.revenue ?? milestone.date)}`,
      );
    }
  }

  return lines.join('\n');
}

export function formatDoctor(report: DoctorReport): string {
  const lines = [
    chalk.bold('Connectivity'),
    `Website: ${report.connectivity.websiteReachable ? 'ok' : 'down'} (${valueOrDash(report.connectivity.responseTimeMs)} ms)`,
    `RSS: ${report.connectivity.rssItems ?? 0} items (${valueOrDash(report.connectivity.rssResponseTimeMs)} ms)`,
    '',
    chalk.bold('Selectors'),
    `Home feed: ${report.selectors.homeFeedMatches ? 'ok' : 'broken'}`,
    `Post page: ${report.selectors.postPageMatches ? 'ok' : 'broken'}`,
    `Product cards: ${report.selectors.productCardsMatch ? 'ok' : 'broken'}`,
    '',
    chalk.bold('Providers'),
    ...report.providers.map(
      (provider) => `${provider.name}: ${provider.status} (${provider.detail})`,
    ),
    '',
    chalk.bold('Cache'),
    `Directory: ${report.cache.directory}`,
    `Writable: ${report.cache.writable ? 'yes' : 'no'}`,
    `Hit rate (24h): ${(report.cache.hitRateLast24Hours * 100).toFixed(1)}%`,
    `Last success: ${valueOrDash(report.cache.lastSuccessfulFetchAt)}`,
  ];

  if (report.fixes.length) {
    lines.push(
      '',
      chalk.bold('Suggested Fixes'),
      ...report.fixes.map((fix) => `- ${fix}`),
    );
  }

  if (report.knownIssues.length) {
    lines.push(
      '',
      chalk.bold('Known Issues'),
      ...report.knownIssues.map((issue) => `- ${issue}`),
    );
  }

  return lines.join('\n');
}

export function formatConfigView(
  config: Record<string, unknown>,
  sources?: Record<string, string>,
): string {
  const table = new Table({
    head: ['Key', 'Value', 'Source'],
    wordWrap: true,
  });

  const flattened = flattenObject(config);
  for (const [key, value] of Object.entries(flattened)) {
    table.push([
      key,
      valueOrDash(value as string | number),
      valueOrDash(sources?.[key]),
    ]);
  }

  return table.toString();
}

function flattenObject(
  input: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const entries: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        entries,
        flattenObject(value as Record<string, unknown>, nextKey),
      );
      continue;
    }

    entries[nextKey] = value;
  }

  return entries;
}
