---
source: en/about/index.md
---

# 关于 UMC

UMC（Universal Minecraft Core）是一个独立的开源 Minecraft: Java Edition 启动引擎，使用 Rust 编写。它采用无界面设计：UMC 负责安装、校验、认证、启动和进程监管，CLI、GUI 或其他服务负责用户界面和产品体验。

## 为什么做 UMC

大多数启动器把界面、账号处理、下载和启动逻辑混在同一个应用里，导致难以复用、测试和审计。UMC 把引擎和界面分开：

- **一个引擎，四种接口。** CLI、Rust SDK、stdio JSON-RPC 和本地 JSON-RPC 守护进程都委托给同一个 `umc-core` 实现，行为和状态保持一致。
- **本地优先。** 实例、下载、任务、进程和日志都保存在你控制的数据目录下。启动器 Core 不运营托管账号服务、遥测端点或云同步。独立可选的 UMC Auth 由社区运营，提供 Yggdrasil 兼容账号。
- **边界明确。** 下载经过校验，路径限制在数据目录内，Token 会被脱敏且不会通过 RPC 返回，守护进程只监听本地 IPC。

## UMC 能做什么

| 领域 | 能力 |
|---|---|
| 版本与安装 | 官方 Mojang 元数据、经过校验的客户端/库/资源下载、独立实例、修复 |
| Java | 系统 Java 检测，以及可选的 Mojang 托管运行时 |
| 账号 | 使用 PKCE 和本地回调的 Microsoft OAuth、钥匙串保存刷新 Token、静默续期 |
| 启动 | 原版离线启动与在线认证启动、内存配置、JVM/游戏参数、进程监管 |
| 自动化 | 带事件、取消和恢复的持久化任务；本地守护进程；Rust SDK；JSON-RPC v1 |

## 设计原则

1. **无界面核心。** 安装、认证和启动都不需要窗口。
2. **单一实现。** 前端不重复实现启动器逻辑。
3. **本地优先的隐私。** 玩家数据和凭据保留在本机；没有遥测。
4. **可验证的下载。** 下载文件会在上游提供对应校验元数据时进行完整性校验。
5. **保守的安全边界。** OAuth Token 不进入实例配置或日志，本地控制面限制为当前用户。

## 项目状态

当前可用：

- 原版版本发现、经过校验的安装和修复
- Microsoft 账号登录与静默会话续期
- 离线启动和原版在线认证启动
- Mojang 托管 Java 运行时和进程监管
- 持久化任务、本地守护进程、Rust SDK 和 JSON-RPC

已暂停或规划中：

- Fabric、Forge 和 NeoForge 安装与启动（已在版本发现和安装预检后暂停）
- 通过加载器适配器在线启动
- 模组、整合包和资源包管理
- Windows 和 macOS 验证

平台和 API 支持承诺见[兼容性策略](./compatibility)。

## 独立性与许可证

UMC 不由 Mojang Studios 或 Microsoft 制作、批准、背书或支持，也不是官方 Minecraft 产品。Minecraft 的名称、商标、游戏文件和服务仍归其所有者。UMC 不捆绑游戏。

UMC 编写的源代码和文档按 MIT 许可证授权。使用条款和数据实践见[服务条款](./terms)和[隐私政策](./privacy)。

## 参与项目

- [文档](/zh/guide/quickstart) —— 安装和使用 UMC
- [集成指南](/zh/development/) —— 基于引擎构建应用
- [GitHub](https://github.com/UMC-Community/UMC) —— 源码、Issue 和发布
- [贡献指南](/zh/development/contributing) —— 开发流程
