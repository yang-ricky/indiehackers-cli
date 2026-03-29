import type { Command } from 'commander';

import {
  createRuntime,
  getGlobalOptions,
  printFormattedResult,
} from './shared.js';

export function registerProductCommand(program: Command): void {
  program
    .command('product')
    .description('Show a product profile')
    .argument('<slug>', 'product slug')
    .action(async function action(this: Command, slug: string) {
      const options = getGlobalOptions(this);
      const { backend } = await createRuntime();
      const product = await backend.getProduct(slug);
      printFormattedResult(product, 'product', options);
    });
}
