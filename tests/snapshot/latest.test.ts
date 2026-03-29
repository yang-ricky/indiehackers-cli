import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Post } from '../../src/models/index.js';

vi.mock('../../src/commands/shared.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/commands/shared.js')
  >('../../src/commands/shared.js');

  return {
    ...actual,
    createRuntime: vi.fn(),
  };
});

import { registerLatestCommand } from '../../src/commands/latest.js';
import { createRuntime } from '../../src/commands/shared.js';
import { captureConsole, createProgram } from './helpers.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('latest snapshot', () => {
  it('captures json stdout with mocked backend data', async () => {
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
    ];
    const backend = {
      getLatest: vi.fn().mockResolvedValue(posts),
    };

    vi.mocked(createRuntime).mockResolvedValue({
      backend,
      cache: {} as never,
      loadedConfig: {} as never,
    });

    const program = createProgram(registerLatestCommand);
    const output = await captureConsole(() =>
      program.parseAsync(['--limit', '1', '--page', '2', 'latest'], {
        from: 'user',
      }),
    );

    expect(output.stderr).toBe('');
    expect(backend.getLatest).toHaveBeenCalledWith({ limit: 1, page: 2 });
    expect(output.stdout).toMatchInlineSnapshot(`
      "{
        "ok": true,
        "schemaVersion": "1",
        "data": [
          {
            "author": "alice",
            "commentCount": 12,
            "date": "2026-03-29",
            "id": "abc",
            "score": 5,
            "title": "How I found PMF",
            "url": "https://www.indiehackers.com/post/abc"
          }
        ],
        "error": null
      }"
    `);
  });
});
