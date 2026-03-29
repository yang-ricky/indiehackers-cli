import type { Command } from 'commander';

import {
  createRuntime,
  getGlobalOptions,
  printFormattedResult,
} from './shared.js';

export function registerPostCommand(program: Command): void {
  program
    .command('post')
    .description('Show a post and its comments')
    .argument('<slug>', 'post slug or post id')
    .action(async function action(this: Command, slug: string) {
      const options = getGlobalOptions(this);
      const { backend } = await createRuntime();
      const post = await backend.getPost(slug);
      printFormattedResult(post, 'post', options);
    });
}
