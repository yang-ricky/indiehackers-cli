import { describe, expect, it } from 'vitest';

import { successOutput } from '../../src/models/index.js';
import { serializeOutput } from '../../src/serializer.js';

describe('serializeOutput', () => {
  it('converts undefined fields to null in JSON mode', () => {
    const json = serializeOutput(
      successOutput({
        optional: undefined,
        required: 'value',
      }),
      'json',
    );

    expect(JSON.parse(json)).toEqual({
      ok: true,
      schemaVersion: '1',
      data: {
        optional: null,
        required: 'value',
      },
      error: null,
    });
  });

  it('serializes YAML envelopes', () => {
    const output = serializeOutput(
      successOutput({ required: 'value' }),
      'yaml',
    );
    expect(output).toContain("schemaVersion: '1'");
    expect(output).toContain('required: value');
  });
});
