import type { Post, PostDetail, Product, User } from '../models/index.js';

export interface LatestOptions {
  limit?: number;
  page?: number;
}

export interface ProviderStatus {
  detail: string;
  name: string;
  status: 'active' | 'degraded' | 'unavailable';
}

export interface DoctorReport {
  cache: {
    directory: string;
    hitRateLast24Hours: number;
    hitsLast24Hours: number;
    lastSuccessfulFetchAt: string | null;
    missesLast24Hours: number;
    writable: boolean;
  };
  connectivity: {
    responseTimeMs: number | null;
    rssItems: number | null;
    rssResponseTimeMs: number | null;
    websiteReachable: boolean;
  };
  fixes: string[];
  knownIssues: string[];
  providers: ProviderStatus[];
  selectors: {
    homeFeedMatches: boolean;
    postPageMatches: boolean;
    productCardsMatch: boolean;
  };
}

export interface Backend {
  doctor(): Promise<DoctorReport>;
  getLatest(options?: LatestOptions): Promise<Post[]>;
  getPost(slug: string): Promise<PostDetail>;
  getProduct(slug: string): Promise<Product>;
  getTop(): Promise<Post[]>;
  getUser(username: string): Promise<User>;
  search(query: string): Promise<Post[]>;
}
