# indiehackers-cli

Unofficial terminal-native CLI for browsing public Indie Hackers data.

It is scraper-first:
- `latest` prefers RSS and falls back to HTML
- `post` merges HTML and public Firebase data
- `product` currently uses public Firebase data because product detail pages are mostly client-rendered

## Requirements

- Node.js `>=20`
- npm

## Install

Global install from a local checkout:

```bash
git clone https://github.com/yang-ricky/indiehackers-cli.git
cd indiehackers-cli
npm ci
npm run build
npm link
```

After that you can use either command:

```bash
ih --help
indiehackers --help
```

If you just want to run from the repo without linking:

```bash
node dist/index.js --help
```

## Quick Start

```bash
ih latest --limit 5
ih latest --limit 5 --json
ih post be6a4175e1
ih product offero --json
ih doctor --json
ih config show
```

## Commands

```text
latest            Show the latest Indie Hackers posts
post <slug>       Show a post and its comments
product <slug>    Show a product profile
doctor            Check scraper health, connectivity, cache, and selectors
config            Read and update CLI configuration
```

Config examples:

```bash
ih config set request.retries 5
ih config set cache.enabled false
ih config show --json
ih config cache-clear
```

## Output Modes

Default behavior:
- TTY stdout: table / human-readable text
- non-TTY stdout: JSON

Explicit overrides:

```bash
ih latest --json
ih latest --yaml
ih doctor --json
```

The JSON and YAML envelopes share the same top-level shape:

```json
{
  "ok": true,
  "schemaVersion": "1",
  "data": {},
  "error": null
}
```

## Configuration

Resolution order:

1. CLI flags
2. Environment variables prefixed with `IH_`
3. `~/.indiehackers-cli/config.yaml`
4. Built-in defaults

Common environment variables:

```bash
IH_CACHE_ENABLED=false
IH_CACHE_DIR=/tmp/ih-cache
IH_REQUEST_TIMEOUT_MS=15000
IH_REQUEST_RETRIES=5
IH_RSS_URL=https://feed.indiehackers.world/posts.rss
```

## Development

Install dependencies and run the full local verification set:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Useful dev scripts:

```bash
npm run test:live
npm run selector:health
npm run fixtures:update
npm run pack:check
```

As of March 29, 2026, `indiehackers.com/feed.xml` is not a working RSS source, so the default feed is the unofficial `https://feed.indiehackers.world/posts.rss`.

## Compliance Notes

- This is an unofficial tool and is not affiliated with Indie Hackers.
- It only targets public pages and public Firebase endpoints.
- Site structure can change without notice, so HTML selectors are best-effort and may break.
- Search is intentionally treated as a best-effort future feature because the site does not expose a stable public search API for this CLI.

## Release Notes

Releases are intended to be managed with Changesets. Until the first public publish, use this project as a local or linked CLI.
