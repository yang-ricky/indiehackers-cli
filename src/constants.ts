// Base URLs
export const IH_BASE_URL = 'https://www.indiehackers.com';
export const IH_POST_URL = (slug: string) => `${IH_BASE_URL}/post/${slug}`;
export const IH_PRODUCT_URL = (slug: string) =>
  `${IH_BASE_URL}/product/${slug}`;
export const IH_USER_URL = (username: string) => `${IH_BASE_URL}/${username}`;
export const IH_GROUP_URL = (slug: string) => `${IH_BASE_URL}/group/${slug}`;
export const IH_FIREBASE_DB_URL = 'https://indie-hackers.firebaseio.com';

// RSS — primary unofficial source plus fallbacks. As of 2026-03-29,
// indiehackers.com/feed.xml does not serve RSS and feed.indiehackers.world
// currently returns 404 for /posts.rss.
export const IH_RSS_URL = 'https://ihrss.io/newest';
export const IH_RSS_FALLBACK_URLS = [
  'https://feed.indiehackers.world/posts.rss',
];

// Defaults
export const DEFAULT_LIMIT = 20;
export const DEFAULT_DELAY_MS = 1000;
export const DEFAULT_TIMEOUT_MS = 10000;
export const DEFAULT_RETRIES = 3;
export const DEFAULT_USER_AGENT = 'indiehackers-cli/0.1';

// Cache TTLs (seconds) — per data type
export const DEFAULT_CACHE_TTL = {
  feed: 300, // 5 min — list pages update frequently
  post: 600, // 10 min
  product: 3600, // 1 hour — revenue milestones don't change often
  user: 1800, // 30 min
} as const;

// Config
export const CONFIG_DIR = '.indiehackers-cli';
export const CONFIG_FILE = 'config.yaml';
export const CACHE_DIR = 'cache';
export const CACHE_META_FILE = 'meta.json';

// Doctor fixtures
export const KNOWN_POST_SLUG =
  'how-do-you-make-a-successful-post-on-indie-hackers-f6745260fd';
export const KNOWN_PRODUCT_SLUG = 'offero';
