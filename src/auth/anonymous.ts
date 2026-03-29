import { DEFAULT_USER_AGENT } from '../constants.js';
import type { AuthProvider } from './types.js';

export class AnonymousAuth implements AuthProvider {
  constructor(private readonly userAgent: string = DEFAULT_USER_AGENT) {}

  getHeaders(): Record<string, string> {
    return {
      Accept: 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': this.userAgent,
    };
  }

  isAuthenticated(): boolean {
    return false;
  }
}
