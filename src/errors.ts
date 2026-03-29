// Exit codes — stable contract per design.md
export enum ExitCode {
  Success = 0,
  GeneralError = 1,
  AuthError = 2,
  ParseError = 3,
  RateLimited = 4,
  NetworkError = 5,
  ConfigError = 6,
  ArgumentError = 7,
}

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode = ExitCode.GeneralError,
    public readonly code: string = 'general_error',
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class AuthError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.AuthError, 'auth_error');
    this.name = 'AuthError';
  }
}

export class ParseError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.ParseError, 'parse_failed');
    this.name = 'ParseError';
  }
}

export class RateLimitError extends CLIError {
  constructor(retryAfterSeconds?: number) {
    const msg = retryAfterSeconds
      ? `Rate limited. Retry after ${retryAfterSeconds} seconds.`
      : 'Rate limited by target website.';
    super(msg, ExitCode.RateLimited, 'rate_limited');
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.NetworkError, 'network_error');
    this.name = 'NetworkError';
  }
}

export class ConfigError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.ConfigError, 'config_error');
    this.name = 'ConfigError';
  }
}

export class ArgumentError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.ArgumentError, 'argument_error');
    this.name = 'ArgumentError';
  }
}

export class NotFoundError extends CLIError {
  constructor(message: string) {
    super(message, ExitCode.GeneralError, 'not_found');
    this.name = 'NotFoundError';
  }
}

export function isCLIError(error: unknown): error is CLIError {
  return error instanceof CLIError;
}
