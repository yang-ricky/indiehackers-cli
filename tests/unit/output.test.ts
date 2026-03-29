import { describe, expect, it } from 'vitest';

import { resolveColorPreference, resolveOutputMode } from '../../src/output.js';

describe('output', () => {
  it('defaults to table in TTY mode and json in non-TTY mode', () => {
    expect(resolveOutputMode({}, true)).toEqual({
      mode: 'table',
      warning: null,
    });
    expect(resolveOutputMode({}, false)).toEqual({
      mode: 'json',
      warning: null,
    });
  });

  it('prefers explicit json/yaml flags and warns on conflicts', () => {
    expect(resolveOutputMode({ json: true }, true)).toEqual({
      mode: 'json',
      warning: null,
    });
    expect(resolveOutputMode({ yaml: true }, true)).toEqual({
      mode: 'yaml',
      warning: null,
    });
    expect(resolveOutputMode({ json: true, yaml: true }, true)).toEqual({
      mode: 'json',
      warning:
        '`--json` and `--yaml` were both provided. Falling back to JSON.',
    });
  });

  it('resolves NO_COLOR and FORCE_COLOR preferences', () => {
    expect(resolveColorPreference({ NO_COLOR: '1' })).toBe('never');
    expect(resolveColorPreference({ FORCE_COLOR: '1' })).toBe('always');
    expect(resolveColorPreference({ FORCE_COLOR: '0' })).toBe('never');
    expect(resolveColorPreference({})).toBe('auto');
  });
});
