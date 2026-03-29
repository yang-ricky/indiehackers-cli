# indiehackers-cli

在终端里浏览 Indie Hackers。

无需登录 · 不需要 token 或 API key · 支持 JSON/YAML 输出 · 内置 `doctor` 诊断命令

[English README](./README.md) · [npm](https://www.npmjs.com/package/indiehackers-cli)

## 安装

```bash
npm install -g indiehackers-cli
```

需要 **Node.js >= 20**。

安装后可直接使用：

```bash
ih --help
indiehackers --help
```

## 快速开始

```bash
ih latest --limit 5
ih post be6a4175e1
ih product offero --json
ih doctor --json
```

## 命令

| 命令 | 说明 |
|---|---|
| `ih latest` | 查看最新帖子 |
| `ih post <slug>` | 查看帖子和评论 |
| `ih product <slug>` | 查看产品资料 |
| `ih doctor` | 检查连通性、缓存和选择器状态 |
| `ih config show` | 查看当前配置 |
| `ih config set <key> <value>` | 修改配置 |
| `ih config cache-clear` | 清空本地缓存 |

## 输出格式

| 场景 | 默认输出 |
|---|---|
| 交互式终端 | 表格 / 易读文本 |
| 管道或重定向 | JSON |
| `--json` | JSON |
| `--yaml` | YAML |

支持 `NO_COLOR` 和 `FORCE_COLOR`。

## 配置

配置是可选的，默认即可直接使用。

如果你想做一点调整：

```bash
ih config show
ih config set request.retries 5
ih config set cache.enabled false
ih config cache-clear
```

也可以通过环境变量覆盖，例如 `IH_CACHE_ENABLED=false` 或 `IH_REQUEST_TIMEOUT_MS=15000`。

## 说明

- 这个项目只使用公开页面和公开 Firebase 数据。
- 如果 Indie Hackers 未来提供官方 REST 或 GraphQL API，这个 CLI 可以在不改变用户命令的前提下切换到底层实现。
- 不做 cookie 逆向，因为这类方案很脆弱、维护成本高，而且不适合作为公开 npm CLI 的长期方案。
- 站点结构和非官方 feed 可能随时变化，所以抓取结果是 best-effort。

## 许可证

[MIT](LICENSE)
