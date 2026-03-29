import { Command } from 'commander';
import { vi } from 'vitest';

const ANSI_ESCAPE_PATTERN = new RegExp(String.raw`\u001B\[[0-9;]*m`, 'g');

export interface CapturedOutput {
  stderr: string;
  stdout: string;
}

export function createProgram(
  registerCommand: (program: Command) => void,
): Command {
  const program = new Command();

  program
    .option('--json', 'emit JSON output')
    .option('--yaml', 'emit YAML output')
    .option('--verbose', 'emit verbose warnings for fragile fields')
    .option('--limit <n>', 'limit the number of returned items')
    .option('--page <n>', 'paginate the returned items');

  registerCommand(program);

  return program;
}

export async function captureConsole(
  run: () => Promise<unknown>,
): Promise<CapturedOutput> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
    stdout.push(args.join(' '));
  });
  const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    stderr.push(args.join(' '));
  });

  try {
    await run();
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }

  return {
    stderr: stderr.join('\n'),
    stdout: stdout.join('\n'),
  };
}

export async function withStdoutTTY<T>(
  isTTY: boolean,
  run: () => Promise<T>,
): Promise<T> {
  const original = process.stdout.isTTY;
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: isTTY,
  });

  try {
    return await run();
  } finally {
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: original,
    });
  }
}

export function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, '');
}
