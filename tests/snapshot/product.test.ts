import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Product } from '../../src/models/index.js';

vi.mock('../../src/commands/shared.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../src/commands/shared.js')
  >('../../src/commands/shared.js');

  return {
    ...actual,
    createRuntime: vi.fn(),
  };
});

import { registerProductCommand } from '../../src/commands/product.js';
import { createRuntime } from '../../src/commands/shared.js';
import {
  captureConsole,
  createProgram,
  stripAnsi,
  withStdoutTTY,
} from './helpers.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('product snapshot', () => {
  it('captures default tty stdout with mocked backend data', async () => {
    const product: Product = {
      description: 'A proposal tool.',
      maker: 'alice',
      milestones: [{ description: 'Launched beta' }],
      name: 'Offero',
      tagline: 'Pricing calculator that builds proposals',
      url: 'https://www.indiehackers.com/product/offero',
    };
    const backend = {
      getProduct: vi.fn().mockResolvedValue(product),
    };

    vi.mocked(createRuntime).mockResolvedValue({
      backend,
      cache: {} as never,
      loadedConfig: {} as never,
    });

    const originalForceColor = process.env.FORCE_COLOR;
    process.env.FORCE_COLOR = '0';

    try {
      const program = createProgram(registerProductCommand);
      const output = await withStdoutTTY(true, () =>
        captureConsole(() =>
          program.parseAsync(['product', 'offero'], { from: 'user' }),
        ),
      );

      expect(output.stderr).toBe('');
      expect(backend.getProduct).toHaveBeenCalledWith('offero');
      expect(stripAnsi(output.stdout)).toMatchInlineSnapshot(`
        "Offero
        URL: https://www.indiehackers.com/product/offero
        Tagline: Pricing calculator that builds proposals
        Maker: alice
        Revenue: -

        A proposal tool.

        Milestones
        1. Launched beta"
      `);
    } finally {
      if (originalForceColor === undefined) {
        delete process.env.FORCE_COLOR;
      } else {
        process.env.FORCE_COLOR = originalForceColor;
      }
    }
  });
});
