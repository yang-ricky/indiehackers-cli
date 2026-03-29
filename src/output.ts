export type OutputMode = 'json' | 'table' | 'yaml';
export type ColorPreference = 'always' | 'auto' | 'never';

export interface OutputFlags {
  json?: boolean;
  yaml?: boolean;
}

export interface OutputResolution {
  mode: OutputMode;
  warning: string | null;
}

export function resolveOutputMode(
  flags: OutputFlags,
  isTTY: boolean = Boolean(process.stdout.isTTY),
): OutputResolution {
  if (flags.json && flags.yaml) {
    return {
      mode: 'json',
      warning:
        '`--json` and `--yaml` were both provided. Falling back to JSON.',
    };
  }

  if (flags.json) {
    return { mode: 'json', warning: null };
  }

  if (flags.yaml) {
    return { mode: 'yaml', warning: null };
  }

  return { mode: isTTY ? 'table' : 'json', warning: null };
}

export function resolveColorPreference(
  env: NodeJS.ProcessEnv = process.env,
): ColorPreference {
  if (env.FORCE_COLOR === '0') {
    return 'never';
  }

  if (env.FORCE_COLOR && env.FORCE_COLOR !== '') {
    return 'always';
  }

  if (env.NO_COLOR !== undefined) {
    return 'never';
  }

  return 'auto';
}
