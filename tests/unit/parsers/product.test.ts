import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseProductFromHtml } from '../../../src/parsers/product.js';

describe('parseProductFromHtml', () => {
  it('parses a build-board product card', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/product-page.html'),
      'utf8',
    );
    const expected = JSON.parse(
      await readFile(
        path.join(process.cwd(), 'tests/fixtures/expected/product.json'),
        'utf8',
      ),
    );

    const product = parseProductFromHtml(
      html,
      'https://www.indiehackers.com/product/offero',
    );

    expect(product).toEqual(expected);
  });
});
