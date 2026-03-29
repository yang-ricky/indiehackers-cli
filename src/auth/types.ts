export interface AuthProvider {
  getHeaders(): Record<string, string>;
  isAuthenticated(): boolean;
}
