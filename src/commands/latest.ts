import type { Command } from 'commander';

import {
  createRuntime,
  getGlobalOptions,
  printFormattedResult,
  readPositiveInt,
} from './shared.js';

export function registerLatestCommand(program: Command): void {
  program
    .command('latest')
    .description('Show the latest Indie Hackers posts')
    .action(async function action(this: Command) {
      const options = getGlobalOptions(this);
      const limit = readPositiveInt(options.limit, 20, 'limit');
      const page = readPositiveInt(options.page, 1, 'page');
      const { backend } = await createRuntime();
      const posts = await backend.getLatest({ limit, page });
      printFormattedResult(posts, 'posts', options);
    });
}
