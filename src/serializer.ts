import yaml from 'js-yaml';

import type { CLIOutput } from './models/index.js';

export function serializeOutput<T>(
  output: CLIOutput<T>,
  mode: 'json' | 'yaml',
): string {
  const normalized = normalizeUndefined(output) as CLIOutput<T>;
  return mode === 'yaml'
    ? yaml.dump(normalized, { noRefs: true })
    : JSON.stringify(normalized, null, 2);
}

function normalizeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        entryValue === undefined ? null : normalizeUndefined(entryValue),
      ]),
    ) as T;
  }

  return value;
}
