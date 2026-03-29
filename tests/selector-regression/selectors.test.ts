import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { load } from 'cheerio';
import { describe, expect, it } from 'vitest';

import {
  HOME_SELECTORS,
  POST_SELECTORS,
  PRODUCT_SELECTORS,
} from '../../src/selectors.js';

describe('selector regression', () => {
  it('matches homepage post cards', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/home-page.html'),
      'utf8',
    );
    const $ = load(html);

    const cards = $(HOME_SELECTORS.latestCards);
    expect(cards).toHaveLength(2);
    expect(cards.first().find(HOME_SELECTORS.title).text().trim()).toBe(
      'How I found PMF',
    );
    expect(cards.first().find(HOME_SELECTORS.author).text().trim()).toBe(
      'alice',
    );
  });

  it('matches post page selectors', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/post-page.html'),
      'utf8',
    );
    const $ = load(html);

    expect($(POST_SELECTORS.title).text().trim()).toBe(
      'How I validated the idea',
    );
    expect($(POST_SELECTORS.body)).toHaveLength(1);
    expect($(POST_SELECTORS.commentItem)).toHaveLength(2);
    expect($(POST_SELECTORS.commentAuthor).first().text().trim()).toBe('bob');
  });

  it('matches product build-board selectors', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/product-page.html'),
      'utf8',
    );
    const $ = load(html);

    expect($(PRODUCT_SELECTORS.buildBoardCard)).toHaveLength(1);
    expect($(PRODUCT_SELECTORS.name).text().trim()).toBe('Offero');
    expect($(PRODUCT_SELECTORS.tagline).text().trim()).toBe(
      'Pricing calculator that builds proposals',
    );
    expect($(PRODUCT_SELECTORS.updateTitle).text().trim()).toBe(
      'Weekly build update',
    );
  });
});
