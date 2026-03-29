<div align="center">
  <h1>indiehackers-cli</h1>
  <p><strong>Browse Indie Hackers from your terminal.</strong></p>
  <p>No login required · Public data only · JSON/YAML output · Built-in doctor command</p>
  <p>
    <a href="./README.zh-CN.md">中文文档</a> ·
    <a href="https://www.npmjs.com/package/indiehackers-cli">npm</a>
  </p>
  <p>
    <img alt="npm version" src="https://img.shields.io/npm/v/indiehackers-cli">
    <img alt="node version" src="https://img.shields.io/node/v/indiehackers-cli">
    <img alt="license" src="https://img.shields.io/npm/l/indiehackers-cli">
  </p>
</div>

A CLI for public [Indie Hackers](https://www.indiehackers.com) data.

Read the latest posts, inspect post threads, open product profiles, and diagnose scraper health directly from your shell.

No login, token, or API key is required.

## Install

```bash
npm install -g indiehackers-cli
```

Requires **Node.js >= 20**.

After installation:

```bash
ih --help
indiehackers --help
```

## Quick Start

```bash
ih latest --limit 5
ih post be6a4175e1
ih product offero --json
ih doctor --json
```

## Commands

| Command | Description |
|---|---|
| `ih latest` | Show the latest Indie Hackers posts |
| `ih post <slug>` | Show a post and its comments |
| `ih product <slug>` | Show a product profile |
| `ih doctor` | Check connectivity, cache, and selector health |
| `ih config show` | Show resolved config values |
| `ih config set <key> <value>` | Update config |
| `ih config cache-clear` | Clear local cache |

## Output

| Scenario | Default |
|---|---|
| Interactive terminal | Human-readable table / text |
| Pipe / redirect | JSON |
| `--json` | JSON |
| `--yaml` | YAML |

The CLI respects `NO_COLOR` and `FORCE_COLOR`.

## Configuration

Configuration is optional. The default setup works out of the box.

If you want to tweak behavior:

```bash
ih config show
ih config set request.retries 5
ih config set cache.enabled false
ih config cache-clear
```

You can also override settings with environment variables such as `IH_CACHE_ENABLED=false` or `IH_REQUEST_TIMEOUT_MS=15000`.

## Notes

- This project uses public pages and public Firebase endpoints only.
- If Indie Hackers eventually offers an official REST or GraphQL API, the CLI can switch to that backend without changing the user-facing commands.
- Cookie reverse engineering is intentionally avoided because it is brittle, hard to maintain, and a poor fit for a public npm CLI.
- Site structure and unofficial feed sources can change without notice, so scraper-based fields are best-effort.

## License

[MIT](LICENSE)
