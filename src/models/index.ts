// ===== Field stability levels (scraper-specific) =====
// required:  selector is highly stable, missing = ParseError (exit code 3)
// optional:  normally present, but may be absent on some pages/conditions
// fragile:   highly dependent on page structure, first to break on site redesign

// ===== Core types =====

export interface Post {
  // --- required ---
  id: string;
  title: string;
  url: string;

  // --- optional ---
  author?: string;
  date?: string;
  commentCount?: number;

  // --- fragile ---
  score?: number;
  tags?: string[];
}

export interface Comment {
  // --- required ---
  body: string;

  // --- optional ---
  author?: string;
  date?: string;
}

export interface PostDetail extends Post {
  // --- required ---
  body: string;

  // --- optional ---
  comments?: Comment[];

  // --- fragile ---
  relatedPosts?: Post[];
}

export interface Milestone {
  date?: string;
  revenue?: string;
  description?: string;
}

export interface Product {
  // --- required ---
  name: string;
  url: string;

  // --- optional ---
  tagline?: string;
  maker?: string;
  description?: string;

  // --- fragile ---
  revenue?: string;
  milestones?: Milestone[];
}

export interface User {
  // --- required ---
  username: string;
  url: string;

  // --- optional ---
  displayName?: string;
  bio?: string;
  avatarUrl?: string;

  // --- fragile ---
  products?: Product[];
  postCount?: number;
  followers?: number;
}

export interface Group {
  // --- required ---
  name: string;
  slug: string;
  url: string;

  // --- optional ---
  description?: string;
  memberCount?: number;
  posts?: Post[];
}

// ===== CLI output envelope =====

export interface CLIOutput<T> {
  ok: boolean;
  schemaVersion: '1';
  data: T | null;
  error: {
    code: string;
    message: string;
    exitCode: number;
  } | null;
}

export function successOutput<T>(data: T): CLIOutput<T> {
  return { ok: true, schemaVersion: '1', data, error: null };
}

export function errorOutput(
  code: string,
  message: string,
  exitCode: number,
): CLIOutput<never> {
  return {
    ok: false,
    schemaVersion: '1',
    data: null,
    error: { code, message, exitCode },
  };
}
