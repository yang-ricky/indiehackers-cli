import { describe, expect, it } from 'vitest';

import type { DoctorReport } from '../../src/backends/types.js';
import {
  formatConfigView,
  formatDoctor,
  formatPostDetail,
  formatPostsTable,
  formatProduct,
} from '../../src/formatter.js';
import type { Post, PostDetail, Product } from '../../src/models/index.js';

const ANSI_ESCAPE_PATTERN = new RegExp(String.raw`\u001B\[[0-9;]*m`, 'g');
const stripAnsi = (value: string): string =>
  value.replace(ANSI_ESCAPE_PATTERN, '');

describe('formatter', () => {
  it('formats posts as a table and falls back to dashes for missing fields', () => {
    const posts: Post[] = [
      {
        author: 'alice',
        commentCount: 12,
        date: '2026-03-29',
        id: 'abc',
        score: 5,
        title: 'How I found PMF',
        url: 'https://www.indiehackers.com/post/abc',
      },
      {
        id: 'def',
        title: 'No fragile fields',
        url: 'https://www.indiehackers.com/post/def',
      },
    ];

    expect(stripAnsi(formatPostsTable(posts))).toMatchInlineSnapshot(`
      "┌───────────────────┬────────┬────────────┬───────┬──────────┐
      │ Title             │ Author │ Date       │ Score │ Comments │
      ├───────────────────┼────────┼────────────┼───────┼──────────┤
      │ How I found PMF   │ alice  │ 2026-03-29 │ 5     │ 12       │
      ├───────────────────┼────────┼────────────┼───────┼──────────┤
      │ No fragile fields │ -      │ -          │ -     │ -        │
      └───────────────────┴────────┴────────────┴───────┴──────────┘"
    `);
  });

  it('formats post detail output including comments', () => {
    const post: PostDetail = {
      author: 'alice',
      body: 'I validated with users.',
      commentCount: 2,
      comments: [
        {
          author: 'bob',
          body: 'Helpful write-up',
          date: '2026-03-29',
        },
      ],
      date: '2026-03-29',
      id: 'abc',
      score: 10,
      title: 'How I found PMF',
      url: 'https://www.indiehackers.com/post/abc',
    };

    expect(stripAnsi(formatPostDetail(post))).toMatchInlineSnapshot(`
      "How I found PMF
      URL: https://www.indiehackers.com/post/abc
      Author: alice
      Date: 2026-03-29
      Score: 10
      Comments: 2

      I validated with users.

      Comments (1)
      1. bob · 2026-03-29
      Helpful write-up"
    `);
  });

  it('formats product output including missing fragile fields', () => {
    const product: Product = {
      description: 'A proposal tool.',
      maker: 'alice',
      milestones: [{ description: 'Launched beta' }],
      name: 'Offero',
      tagline: 'Pricing calculator that builds proposals',
      url: 'https://www.indiehackers.com/product/offero',
    };

    expect(stripAnsi(formatProduct(product))).toMatchInlineSnapshot(`
      "Offero
      URL: https://www.indiehackers.com/product/offero
      Tagline: Pricing calculator that builds proposals
      Maker: alice
      Revenue: -

      A proposal tool.

      Milestones
      1. Launched beta"
    `);
  });

  it('formats doctor and config views', () => {
    const doctor: DoctorReport = {
      cache: {
        directory: '/tmp/cache',
        hitRateLast24Hours: 0.5,
        hitsLast24Hours: 2,
        lastSuccessfulFetchAt: '2026-03-29T10:00:00.000Z',
        missesLast24Hours: 2,
        writable: true,
      },
      connectivity: {
        responseTimeMs: 100,
        rssItems: 5,
        rssResponseTimeMs: 200,
        websiteReachable: true,
      },
      fixes: ['Update selectors'],
      knownIssues: ['Product page is partially client-rendered'],
      providers: [
        {
          detail: 'Homepage is parseable.',
          name: 'html',
          status: 'active',
        },
      ],
      selectors: {
        homeFeedMatches: true,
        postPageMatches: true,
        productCardsMatch: false,
      },
    };

    expect(stripAnsi(formatDoctor(doctor))).toContain('Connectivity');
    expect(stripAnsi(formatDoctor(doctor))).toContain('Suggested Fixes');

    const configView = stripAnsi(
      formatConfigView(
        {
          cache: {
            enabled: true,
          },
          request: {
            retries: 3,
          },
        },
        {
          'cache.enabled': 'default',
          'request.retries': 'file',
        },
      ),
    );

    expect(configView).toContain('cache.enabled');
    expect(configView).toContain('request.retries');
    expect(configView).toContain('default');
    expect(configView).toContain('file');
  });
});
