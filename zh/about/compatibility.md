---
source: en/about/compatibility.md
---

# 兼容性与发布策略

## 支持基线

- Rust edition：2024。
- 最低支持的 Rust 版本（MSRV）：1.89。CI 使用 Rust 1.89 检查工作区，并使用稳定版 Rust 构建发布二进制。
- 当前平台目标：Linux x86_64 GNU。Windows 和 macOS 仍是计划中的移植，其代码不在当前发布验证目标中。
- 运行时验证目前仅限 Linux。构建成功并不代表守护进程 IPC 权限或游戏启动行为在其他操作系统上已验证。
- UMC 0.1 支持原版 Minecraft Java Edition 安装、Microsoft 账号登录、原版在线启动和显式离线启动。加载器安装和加载器启动不在本发布范围内。

## 版本兼容性

Rust crate 版本与 JSON-RPC 协议版本独立演进。

- Rust crate 使用 SemVer。1.0 之前，破坏性 Rust API 变更需要新的次版本；补丁版本保持兼容。1.0 之后，破坏性公共 API 变更需要主版本。
- JSON-RPC `v1` 通过 `system.info` 通告。以兼容方式添加方法和可选字段；客户端应忽略未知字段和事件名称。不要改变 `v1` 方法、字段或事件的含义，也不要删除它们。破坏性的线上格式变更需要单独通告的协议版本。
- `system.capabilities` 是能力发现机制。客户端不得根据 Core crate 版本推断能力。
- RPC 错误映射和部分响应字段在 0.x 期间仍是暂定的，必须在 1.0 兼容性承诺前完成文档化。
- 实例配置自带 `schema_version`；每个新的磁盘 schema 都需要迁移和恢复策略。

## CI 与产物

`.github/workflows/ci.yml` 检查格式和声明的 MSRV，然后构建 Linux x86_64 发布二进制。它把 `umc`、`umcd`、MIT 许可证和安装说明打包为 tar 压缩包，并上传带 SHA-256 校验和的压缩包，保留七天。`.github/workflows/release.yml` 验证推送的 `v*` 标签与 Cargo 包版本匹配，然后构建并发布带版本号的 Linux x86_64 GNU 压缩包和校验和作为 GitHub Release。Windows 和 macOS 被有意排除在活动矩阵之外。发布包未签名，Rust crate 未发布到 crates.io。

创建公开版本之前：

1. 记录捆绑 Rust 依赖的第三方许可证。UMC 发布包目前包含 UMC 二进制和文档，不包含 Minecraft 游戏资源；游戏文件和运行时由用户在运行时获取。除非审查分发权利，否则保持这种状态。
2. 为发布审查 RPC v1 契约、错误映射和实例迁移策略。
3. 在原生运行器上保持 Linux 安装、守护进程权限、重连、启动、停止和原版安装行为经过验证。
4. 在发布说明中包含项目非关联声明，并随产物保留许可证/第三方声明。
5. 只有在发布密钥的所有权和存储方式确定后才添加签名。
6. 在计划移植时重新启用 Windows 和 macOS CI/运行时验证。

## 许可证

UMC 使用 MIT 许可证。根目录的 `LICENSE` 文件是权威文本，所有工作区包从工作区清单继承 `license = "MIT"` 和作者元数据。
