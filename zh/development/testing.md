---
source: en/development/testing.md
---

# 测试与 CI

本页介绍本地测试套件、GitHub Actions 中运行的检查，以及发布前需要的手工验证。

## 本地检查

在仓库根目录运行：

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
cargo test --workspace --locked
cargo build --workspace --locked --release
```

声明的最低 Rust 版本是 **1.89**。CI 会使用该工具链检查工作区。

测试套件使用临时目录，不会启动真正的 Minecraft 客户端。需要 Mojang 下载的测试故意不包含在自动测试中。

## 测试覆盖范围

- 实例配置从 schema 版本 0 迁移到 1。
- 创建备份、隔离损坏主文件，以及从备份修复。
- 从已验证的安装记录修复。
- 进程运行期间拒绝删除。
- 损坏的进程记录失败关闭。
- 实例配置损坏时的列表行为。
- 未来 schema 版本不会被降级。
- 资源摘要和大小校验。
- 资源索引校验、去重和无效哈希。
- 拒绝非 HTTPS 下载 URL 和路径穿越。
- 实例配置校验。
- 已安装但版本过旧的 Java 的兼容性报告。
- 守护进程重连、过期进程恢复，以及停止已验证进程。
- 运行时清单路径限制。

## CI 工作流

| 工作流 | 触发 | 检查 |
|---|---|---|
| `CI` | 推送到任意分支、`v*` 标签、Pull Request、手动 | `cargo fmt --check`、MSRV 1.89 `cargo check --workspace --locked`、Linux x86_64 发布构建、打包和 SHA-256 |
| Docs `Documentation` | 推送到 `main`、针对 `main` 的 PR、手动 | `npm ci`、`npm run docs:build`，在 `main` 上部署 GitHub Pages |
| `Release` | 推送 `v*` 标签 | tag/版本匹配、Linux 发布构建、发布 GitHub Release |

当前 CI **不会**运行 `cargo test` 或 `cargo clippy`。请在提交 Pull Request 前本地运行测试套件。

Docs 仓库构建还会执行 i18n 同步步骤。参见 [文档工作流](#文档工作流)。

## 发布前手工验证

在原生 Linux x86_64 运行器上发布前，请验证：

1. 下载并校验发布包校验和。
2. `umc version list` 成功。
3. 创建实例并安装。
4. 重新执行安装，确认已验证文件被复用。
5. 以离线模式启动，确认游戏运行，并检查 `umc-console.log`。
6. 使用 `umc process stop` 停止游戏，确认进程记录变为 `exited`。
7. 启动 `umcd`，通过守护进程创建安装任务，并跟随任务事件。
8. 重启守护进程，确认未完成任务为 `interrupted`，进程状态已恢复。
9. 安装托管 Java 运行时，确认启动会选择它。
10. 修复故意损坏的实例配置。
11. 删除实例，确认运行中进程保护生效。
12. 构建 Docs 站点并检查 `/Docs/en/` 和 `/Docs/zh/` 路由。

当前版本不验证 Windows 和 macOS 行为。

## 文档工作流

文档站以英文为源语言，中文为镜像语言：

```text
en/...   英文源文件
zh/...   中文翻译或英文回退
```

规则：

- 保持 `en` 和 `zh` 下相同的相对路径和文件名。
- 不要在 Markdown 文件名中加入 `_en` 或 `_zh`。
- 缺失的中文页面由 `npm run docs:sync` 创建为英文回退，并带有 `translation: pending` 标记。
- 翻译页面时删除 `translation: pending`。之后同步脚本不会再覆盖它。
- 不要翻译代码、命令、文件路径、API 名称或协议字段名。

常用命令：

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:i18n:status
```

请在 Docs 仓库根目录运行这些命令。`docs:i18n:status` 会列出仍待翻译的页面，以及没有英文源的孤儿中文页。Docs 工作流运行 `docs:build`，它也会重新生成待翻译回退页。

## 测试数据卫生

- 手工测试使用临时 `UMC_DATA_DIR`。
- 不要让测试指向真实用户数据目录。
- 不要提交生成的数据目录、日志、任务记录或进程记录。
- 使用 `umc instance remove` 删除测试实例，以便测试运行中进程检查。

## 相关

- [集成指南](./) —— crate、SDK、守护进程和文档如何组合。
- [架构](./architecture) —— 流水线和边界。
- [故障排查](../guide/troubleshooting) —— 面向用户的失败模式。
