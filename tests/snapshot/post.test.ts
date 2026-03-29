import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostDetail } from '../../src/models/index.js';

vi.mock('../../src/commands/shared.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/commands/shared.js')
  >('../../src/commands/shared.js');

  return {
    ...actual,
    createRuntime: vi.fn(),
  };
});

import { registerPostCommand } from '../../src/commands/post.js';
import { createRuntime } from '../../src/commands/shared.js';
import { captureConsole, createProgram } from './helpers.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('post snapshot', () => {
  it('captures yaml stdout with mocked backend data', async () => {
    const post: PostDetail = {
      author: 'alice',
      body: 'I talked to users first.',
      commentCount: 1,
      comments: [
        {
          author: 'bob',
          body: 'Helpful write-up',
          date: '2026-03-30',
        },
      ],
      date: '2026-03-29',
      id: 'abc',
      score: undefined,
      title: 'How I found PMF',
      url: 'https://www.indiehackers.com/post/abc',
    };
    const backend = {
      getPost: vi.fn().mockResolvedValue(post),
    };

    vi.mocked(createRuntime).mockResolvedValue({
      backend,
      cache: {} as never,
      loadedConfig: {} as never,
    });

    const program = createProgram(registerPostCommand);
    const output = await captureConsole(() =>
      program.parseAsync(['--yaml', 'post', 'abc'], { from: 'user' }),
    );

    expect(output.stderr).toBe('');
    expect(backend.getPost).toHaveBeenCalledWith('abc');
    expect(output.stdout).toMatchInlineSnapshot(`
      "ok: true
      schemaVersion: '1'
      data:
        author: alice
        body: I talked to users first.
        commentCount: 1
        comments:
          - author: bob
            body: Helpful write-up
            date: '2026-03-30'
        date: '2026-03-29'
        id: abc
        score: null
        title: How I found PMF
        url: https://www.indiehackers.com/post/abc
      error: null
      "
    `);
  });
});
