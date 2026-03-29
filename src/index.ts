import { Command } from 'commander';
import packageJson from '../package.json';
import { registerConfigCommand } from './commands/config.js';
import { registerDoctorCommand } from './commands/doctor.js';
import { registerLatestCommand } from './commands/latest.js';
import { registerPostCommand } from './commands/post.js';
import { registerProductCommand } from './commands/product.js';
import { handleCommandError } from './commands/shared.js';

const program = new Command();

program
  .name('ih')
  .description(
    'Unofficial CLI for Indie Hackers — scraper-first, terminal-native',
  )
  .version(packageJson.version)
  .option('--json', 'emit JSON output')
  .option('--yaml', 'emit YAML output')
  .option('--verbose', 'emit verbose warnings for fragile fields')
  .option('--limit <n>', 'limit the number of returned items')
  .option('--page <n>', 'paginate the returned items');

registerLatestCommand(program);
registerPostCommand(program);
registerProductCommand(program);
registerDoctorCommand(program);
registerConfigCommand(program);

program.parseAsync().catch(handleCommandError);
