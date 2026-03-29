import { setTimeout as delay } from 'node:timers/promises';

import type { AuthProvider } from './auth/types.js';
import { NetworkError, RateLimitError } from './errors.js';

export interface HttpClientOptions {
  authProvider: AuthProvider;
  delayMs: number;
  retries: number;
  timeoutMs: number;
}

export class HttpClient {
  private lastRequestAt = 0;

  constructor(private readonly options: HttpClientOptions) {}

  async getText(url: string, init: RequestInit = {}): Promise<string> {
    const response = await this.request(url, init);
    return response.text();
  }

  async getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(url, {
      ...init,
      headers: {
        Accept: 'application/json, text/plain;q=0.8, */*;q=0.5',
        ...this.options.authProvider.getHeaders(),
        ...(init.headers ?? {}),
      },
    });

    return (await response.json()) as T;
  }

  async head(url: string, init: RequestInit = {}): Promise<Response> {
    return this.request(url, { ...init, method: 'HEAD' });
  }

  async request(url: string, init: RequestInit = {}): Promise<Response> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.options.retries) {
      try {
        await this.applyDelay();

        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          this.options.timeoutMs,
        );

        try {
          const response = await fetch(url, {
            ...init,
            headers: {
              ...this.options.authProvider.getHeaders(),
              ...(init.headers ?? {}),
            },
            signal: controller.signal,
          });

          if (response.status === 429 || response.status === 503) {
            const retryAfter = response.headers.get('retry-after');
            if (attempt >= this.options.retries) {
              throw new RateLimitError(
                retryAfter ? Number(retryAfter) : undefined,
              );
            }

            const retryAfterMs = retryAfter
              ? Number(retryAfter) * 1000
              : 2 ** attempt * 500;
            await delay(retryAfterMs);
            attempt += 1;
            continue;
          }

          if (!response.ok) {
            throw new NetworkError(
              `Request failed with ${response.status} for ${url}`,
            );
          }

          return response;
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        lastError = error;

        if (
          attempt >= this.options.retries ||
          error instanceof RateLimitError
        ) {
          break;
        }

        await delay(2 ** attempt * 250);
      } finally {
        this.lastRequestAt = Date.now();
      }

      attempt += 1;
    }

    if (lastError instanceof Error) {
      if (lastError.name === 'AbortError') {
        throw new NetworkError(
          `Request timed out after ${this.options.timeoutMs}ms for ${url}`,
        );
      }

      throw new NetworkError(`Failed to fetch ${url}: ${lastError.message}`);
    }

    throw new NetworkError(`Request failed for ${url}`);
  }

  private async applyDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.options.delayMs) {
      await delay(this.options.delayMs - elapsed);
    }
  }
}
