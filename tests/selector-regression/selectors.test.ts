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
    expect(cards.length).toBeGreaterThan(5);
    expect(
      cards.first().find(HOME_SELECTORS.title).text().trim().length,
    ).toBeGreaterThan(0);
    expect(
      cards.first().find(HOME_SELECTORS.author).text().trim().length,
    ).toBeGreaterThan(0);
  });

  it('matches post page selectors', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/post-page.html'),
      'utf8',
    );
    const $ = load(html);

    expect(
      $(POST_SELECTORS.title).first().text().trim().length,
    ).toBeGreaterThan(0);
    expect($(POST_SELECTORS.body).length).toBeGreaterThan(0);
    expect($(POST_SELECTORS.commentItem).length).toBeGreaterThan(0);
    expect(
      $(POST_SELECTORS.commentAuthor).first().text().trim().length,
    ).toBeGreaterThan(0);
  });

  it('matches product build-board selectors', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/home-page.html'),
      'utf8',
    );
    const $ = load(html);

    const cards = $(PRODUCT_SELECTORS.buildBoardCard);
    expect(cards.length).toBeGreaterThan(0);
    expect(
      cards.first().find(PRODUCT_SELECTORS.name).text().trim().length,
    ).toBeGreaterThan(0);
    expect(
      cards.first().find(PRODUCT_SELECTORS.tagline).text().trim().length,
    ).toBeGreaterThan(0);
    expect(
      cards.first().find(PRODUCT_SELECTORS.updateTitle).text().trim().length,
    ).toBeGreaterThan(0);
  });
});
