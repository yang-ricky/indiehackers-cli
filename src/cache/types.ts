export type CacheBucket = 'feed' | 'post' | 'product' | 'user';

export interface CacheStats {
  hitsLast24Hours: number;
  missesLast24Hours: number;
  hitRateLast24Hours: number;
  lastSuccessfulFetchAt: string | null;
}

export interface CacheSetOptions {
  isError?: boolean;
  ttlSeconds?: number;
}

export interface Cache {
  get<T>(bucket: CacheBucket, key: string): Promise<T | null>;
  set<T>(
    bucket: CacheBucket,
    key: string,
    value: T,
    options?: CacheSetOptions,
  ): Promise<void>;
  clear(bucket?: CacheBucket): Promise<void>;
  getStats(): Promise<CacheStats>;
}
