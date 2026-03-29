import type { Command } from 'commander';

import {
  createRuntime,
  getGlobalOptions,
  printFormattedResult,
} from './shared.js';

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check scraper health, connectivity, cache, and selectors')
    .option('--fix', 'show suggested fixes prominently')
    .action(async function action(this: Command) {
      const options = getGlobalOptions(this);
      const { backend } = await createRuntime();
      const report = await backend.doctor();
      printFormattedResult(report, 'doctor', options);
    });
}
