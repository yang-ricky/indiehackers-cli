import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ParseError } from '../../../src/errors.js';
import { parsePostDetailFromHtml } from '../../../src/parsers/post.js';

describe('parsePostDetailFromHtml', () => {
  it('parses the required fields and comments', async () => {
    const html = await readFile(
      path.join(process.cwd(), 'tests/fixtures/html/post-page.sample.html'),
      'utf8',
    );
    const expected = JSON.parse(
      await readFile(
        path.join(process.cwd(), 'tests/fixtures/expected/post.json'),
        'utf8',
      ),
    );

    const post = parsePostDetailFromHtml(
      html,
      'https://www.indiehackers.com/post/validate-idea-be6a4175e1',
    );

    expect(post).toEqual(expected);
  });

  it('throws when the required body is missing', () => {
    expect(() =>
      parsePostDetailFromHtml(
        '<html><body><h1 class="post-page__title">Title only</h1></body></html>',
        'https://www.indiehackers.com/post/title-only-abc',
      ),
    ).toThrow(ParseError);
  });
});
