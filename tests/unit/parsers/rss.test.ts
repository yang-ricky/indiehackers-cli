import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseRssFeed } from '../../../src/parsers/rss.js';

describe('parseRssFeed', () => {
  it('maps unofficial feed links back to Indie Hackers post URLs', async () => {
    const xml = await readFile(
      path.join(process.cwd(), 'tests/fixtures/rss/feed.xml'),
      'utf8',
    );

    const posts = await parseRssFeed(xml);

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      author: 'alice',
      id: 'be6a4175e1',
      tags: ['Growth'],
      title: 'Test Post One',
      url: 'https://www.indiehackers.com/post/be6a4175e1',
    });
  });
});
