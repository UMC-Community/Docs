---
source: en/development/contributing.md
---

# 贡献指南

本页介绍 UMC 源码仓库和独立 Docs 仓库。

## 仓库结构

| 路径 | 内容 |
|---|---|
| `crates/umc-api` | 所有接入面共享的稳定可序列化契约 |
| `crates/umc-core` | 启动引擎：下载、实例、Java、启动、任务、守护进程 |
| `crates/umc-sdk` | Core 和 RPC 分发器之上的类型化 Rust 封装 |
| `crates/umc-cli` | `umc` CLI 和 `umcd` 守护进程二进制 |
| `crates/umc-loader-api` | 加载器适配器契约 |
| `crates/umc-loader-fabric` | Fabric Meta 适配器 |
| `crates/umc-loader-forge` | Forge Maven 适配器 |
| `crates/umc-loader-neoforge` | NeoForge Maven 适配器 |
| `crates/umc-loader-registry` | 内建和宿主注册适配器的组合 |
| `protocols/` | API 权威契约，包括 JSON-RPC v1 |
| `.github/workflows/` | Core CI 和发布工作流 |

独立的 [Docs 仓库](https://github.com/UMC-Community/Docs)包含 `en/`、`zh/`、`.vitepress/`、
站点构建脚本和 GitHub Pages 工作流。本地与 UMC 并列放在 `~/UMC-Community/Docs`。

## 构建与测试

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
cargo test --workspace --locked
cargo build --workspace --locked --release
```

工作区使用 Rust edition 2024，最低支持 Rust 版本为 **1.89**。

测试覆盖、CI 行为和发布前手工验证见 [测试与 CI](./testing)。

## 代码规范

- 保持 `umc-api` 不依赖传输和实现。
- 把启动器行为放在 `umc-core`，不要放在 CLI、SDK 或加载器适配器中。
- Core 操作返回 `Result<_, String>`，除非类型化错误属于公共契约。
- 校验文件系统路径并限制在数据根目录之下。拒绝托管路径中的符号链接。
- 下载使用 HTTPS，并在元数据提供时校验哈希和大小。
- 不要给 RPC 接口添加任意 shell 执行。
- 不要动态加载提供方代码。加载器适配器是可信的、编译后的 Rust crate。
- 修改存储时保持实例配置迁移和恢复策略。
- 不要把内部 Rust 错误字符串作为稳定的协议码暴露。

## 文档规范

- 英文是 `en/` 下的源文件。
- 中文镜像到 `zh/` 下的相同相对路径。
- 不要在 Markdown 文件名中加入 `_en` 或 `_zh`。
- 不要手工把英文页面复制到 `zh/`；运行 `npm run docs:sync`。
- 生成的英文回退页带有 `translation: pending`。翻译页面时删除该标记，后续同步才不会覆盖。
- 不要翻译代码、命令、路径、API 名称或协议字段名。
- 指南内部使用相对链接；i18n 同步会把回退页中的 `/en/` 链接改写为 `/zh/`。
- RPC 变更请在 UMC 仓库编辑 `protocols/rpc-v1.md`。Docs 构建会把 API 契约同步到
  `en/reference/`；仓库保留同步副本，以支持独立的本地构建。

文档命令：

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:i18n:status
```

请在 Docs 仓库根目录运行这些命令。文档变更合并前，`docs:build` 必须通过，包括死链检查。

## 测试数据卫生

手工测试使用临时数据目录：

```sh
export UMC_DATA_DIR="$(mktemp -d)"
```

不要提交生成的数据目录、游戏日志、任务记录、进程记录或下载的游戏文件。不要把测试指向真实用户数据目录。

## CI

- UMC 的 `CI` 检查格式、MSRV 和 Linux 发布构建。
- Docs 的 `Documentation` 构建文档，并从 `main` 部署。
- UMC 的 `Release` 在 `v*` 标签上运行，发布 Linux 压缩包。

目前 `cargo test` 需要本地运行。当前覆盖范围和手工验证清单见 [测试与 CI](./testing)。

## 发布流程

1. 更新工作区版本和发布说明。
2. 确认版本与目标 tag 匹配。
3. 运行完整的本地测试和手工验证清单。
4. 推送 `v*` 标签。
5. 发布工作流构建并发布 Linux 压缩包和校验和。

Windows 和 macOS 不在验证的发布目标中。发布包当前未签名。参见 [兼容性策略](../about/compatibility)。

## 许可证与项目边界

UMC 使用 MIT 许可证。不要加入 Minecraft 游戏文件、Mojang/Microsoft 徽标或你无权再分发的第三方内容。不要暗示与 Mojang 或 Microsoft 存在官方关联。参见[服务条款](../about/terms)和[隐私政策](../about/privacy)。

## 报告问题

请包含准确命令、完整输出、平台、Java 版本，以及相关的任务、进程或控制台日志。发布前隐去本地路径、玩家名称和其他个人数据。
