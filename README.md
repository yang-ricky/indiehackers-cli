# indiehackers-cli

A command-line interface for public [Indie Hackers](https://www.indiehackers.com) data.

Browse the latest posts, inspect post threads, view product profiles, and diagnose scraper health directly from your terminal.

No login, token, or API key is required.

## Install

Install from npm:

```bash
npm install -g indiehackers-cli
```

Requires **Node.js >= 20**.

No extra setup is required after installation.

After installation, both command names are available:

```bash
ih --help
indiehackers --help
```

## Quick Start

```bash
# No auth step needed
ih latest --limit 5

# View a post thread
ih post be6a4175e1

# View a product profile
ih product offero --json

# Check connectivity, cache, and selector health
ih doctor --json
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
# Pipe into jq
ih latest --limit 5 --json | jq '.data[0].title'

# Tweak retry behavior only if needed
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

Configuration is optional. The CLI works out of the box with built-in defaults.

If you want to inspect or tweak behavior:

```bash
ih config show
ih config set request.retries 5
ih config set cache.enabled false
ih config cache-clear
```

You can also override settings with environment variables such as `IH_CACHE_ENABLED=false` or `IH_REQUEST_TIMEOUT_MS=15000`.

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

## Disclaimer

This is an unofficial tool and is not affiliated with Indie Hackers.

It targets public pages and public Firebase endpoints only. HTML selectors and unofficial feed sources can break when the site changes.

If Indie Hackers eventually offers an official REST or GraphQL API, the CLI can switch to that backend without changing the user-facing commands.

Cookie reverse engineering is intentionally avoided because it is brittle, harder to maintain, more likely to break on auth or CSRF changes, and is a poor fit for a public npm CLI.

## License

[MIT](LICENSE)
