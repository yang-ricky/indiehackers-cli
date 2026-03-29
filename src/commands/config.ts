import type { Command } from 'commander';
import { FileCache } from '../cache/file-cache.js';
import type { ConfigKey } from '../config.js';
import { loadConfig, setConfigValue } from '../config.js';
import {
  createRuntime,
  getGlobalOptions,
  printFormattedResult,
} from './shared.js';

export function registerConfigCommand(program: Command): void {
  const config = program
    .command('config')
    .description('Read and update CLI configuration');

  config
    .command('show')
    .description('Show resolved config values and their source')
    .action(async function action(this: Command) {
      const options = getGlobalOptions(this);
      const loadedConfig = await loadConfig();
      printFormattedResult(
        loadedConfig.values,
        'config',
        options,
        loadedConfig.sources,
      );
    });

  config
    .command('set')
    .description('Write a config value')
    .argument('<key>', 'config key')
    .argument('<value>', 'config value')
    .action(async function action(
      this: Command,
      key: ConfigKey,
      value: string,
    ) {
      const options = getGlobalOptions(this);
      await setConfigValue(key, value);
      const loadedConfig = await loadConfig();
      printFormattedResult(
        loadedConfig.values,
        'config',
        options,
        loadedConfig.sources,
      );
    });

  config
    .command('cache-clear')
    .description('Clear the local cache directory')
    .action(async function action(this: Command) {
      const options = getGlobalOptions(this);
      const { loadedConfig } = await createRuntime();
      const cache = new FileCache(
        loadedConfig.values.cache.dir,
        loadedConfig.values.cache.ttl,
        loadedConfig.values.cache.cacheErrors,
      );
      await cache.clear();
      console.log('Cache cleared.');
      void options;
    });
}
