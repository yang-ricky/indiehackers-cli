# indiehackers-cli

A command-line interface for public [Indie Hackers](https://www.indiehackers.com) data. Browse the latest posts, inspect post threads, view product profiles, and diagnose scraper health directly from your terminal.

This CLI is scraper-first:
- `latest` prefers RSS and falls back to the homepage HTML
- `post` merges post-page HTML with public Firebase data
- `product` prefers public Firebase data and falls back to HTML when possible

## Install

Install from npm:

```bash
npm install -g indiehackers-cli
```

Requires **Node.js >= 20**.

After installation, both command names are available:

```bash
ih --help
indiehackers --help
```

For local development from a checkout:

```bash
git clone https://github.com/yang-ricky/indiehackers-cli.git
cd indiehackers-cli
npm ci
npm run build
node dist/index.js --help
```

## Quick Start

```bash
# Latest posts
ih latest --limit 5

# Same query as JSON
ih latest --limit 5 --json

# View a post thread
ih post be6a4175e1

# View a product profile
ih product offero --json

# Check connectivity, cache, and selector health
ih doctor --json

# Inspect resolved configuration
ih config show
```

## Commands

### Browse

| Command | Description |
|---|---|
| `ih latest` | Show the latest Indie Hackers posts |
| `ih post <slug>` | Show a post and its comments |
| `ih product <slug>` | Show a product profile |
| `ih doctor` | Check scraper health, connectivity, cache, and selectors |

### Configuration

| Command | Description |
|---|---|
| `ih config show` | Show resolved config values and their source |
| `ih config set <key> <value>` | Write a config value |
| `ih config cache-clear` | Clear the local cache directory |

### Global Options

| Flag | Description |
|---|---|
| `--json` | Output as JSON |
| `--yaml` | Output as YAML |
| `--verbose` | Emit verbose warnings for fragile fields |
| `--limit <n>` | Limit the number of returned items |
| `--page <n>` | Paginate the returned items |
| `doctor --fix` | Show suggested fixes prominently |

### Examples

```bash
# Latest posts as JSON
ih latest --limit 3 --json

# Inspect a post by short id
ih post be6a4175e1 --json

# Inspect a product by slug
ih product offero --json

# Pipe into jq
ih latest --limit 5 --json | jq '.data[0].title'

# Change retry behavior
ih config set request.retries 5

# Disable cache for a single shell session
IH_CACHE_ENABLED=false ih doctor --json
```

## Output Formats

| Scenario | Default |
|---|---|
| Interactive terminal (TTY) | Human-readable table / text |
| Pipe / redirect (non-TTY) | JSON |
| `--json` flag | JSON |
| `--yaml` flag | YAML |

Responses use a stable envelope:

```json
{
  "ok": true,
  "schemaVersion": "1",
  "data": {},
  "error": null
}
```

The CLI respects `NO_COLOR` and `FORCE_COLOR`.

## Configuration

Config is resolved in this order:

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
IH_RSS_URL=https://ihrss.io/newest
```

Common config keys:

```bash
cache.enabled
cache.dir
cache.cacheErrors
cache.ttl.feed
cache.ttl.post
cache.ttl.product
cache.ttl.user
request.delayMs
request.timeoutMs
request.retries
request.userAgent
rss.url
```

## Network Behavior

This project only uses public endpoints, but reliability depends on current site structure and network reachability:

- `latest` uses `https://ihrss.io/newest` by default and falls back to other RSS candidates plus homepage HTML
- `post` and `product` may rely on `https://indie-hackers.firebaseio.com`
- On some networks, Firebase may be slower or unreachable even when `www.indiehackers.com` loads normally

If something fails, run:

```bash
ih doctor --json
```

Network errors now include the failing URL, which makes it easier to see whether the problem is the main site, RSS source, or Firebase.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Useful scripts:

```bash
npm run test:live
npm run selector:health
npm run fixtures:update
npm run pack:check
```

## Disclaimer

This is an unofficial tool and is not affiliated with Indie Hackers.

It targets public pages and public Firebase endpoints only. HTML selectors and unofficial feed sources can break when the site changes.

## License

[MIT](LICENSE)
