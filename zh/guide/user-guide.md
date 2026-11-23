---
source: en/guide/user-guide.md
---

# 使用 UMC

UMC 是 Minecraft: Java Edition 的无界面启动引擎。本节介绍 `umc` CLI 的日常使用流程、UMC 写入磁盘的内容，以及出错时如何恢复。

::: tip 本版本范围

当前的 Linux x86_64 版本支持**原版安装**、**离线启动**，以及**通过 Microsoft 登录启动原版在线游戏**。加载器工作已在版本发现和安装预检后暂停；加载器安装、加载器在线启动和整合包管理尚未实现。

:::

## 当前可以做什么

- 从 Mojang 元数据发现官方 Minecraft Java Edition 版本。
- 创建带独立游戏目录和 `instance.json` 的隔离实例。
- 下载客户端、库、资源、原生库和日志配置；上游提供相应元数据时按 SHA-1 与大小校验。
- 检测兼容的 Java，或为指定 Minecraft 版本安装 Mojang 托管运行时。
- 使用 Microsoft 账号登录，安全保存刷新 Token，并在无需重新打开浏览器的情况下启动在线认证会话。
- 以离线模式启动已安装实例，并监管游戏进程。
- 查看、取消和恢复安装任务；列出并停止游戏进程。
- 从备份或已验证的安装记录修复实例配置。
- 通过 `umcd` 以本地 JSON-RPC 提供相同的操作。

## 当前尚未提供

| 领域 | 当前状态 |
|---|---|
| Fabric / Forge / NeoForge 安装与启动 | 已暂停；目前仅有版本发现和安装预检，尚未实现安装和启动 |
| 通过加载器适配器在线启动 | 未实现；在线启动仅支持原版 |
| 模组、整合包、资源包 | 未实现 |
| Windows 和 macOS | 计划中的移植，不属于当前发布目标 |
| 通过 UMC 向游戏输入控制台命令 | 不可用；游戏标准输入是关闭的 |

## 核心概念

| 概念 | 含义 |
|---|---|
| **版本** | 官方 Minecraft 版本 ID，例如 `umc version list` 中的 `1.21.1`。 |
| **实例** | 独立的配置和游戏目录。多个实例共享已下载的版本、库、资源和运行时。 |
| **任务** | 持久化、带序号的操作，例如安装实例或 Java 运行时。 |
| **Java 运行时** | `runtimes/` 下的托管运行时，或通过 `JAVA_HOME` / `PATH` 找到的系统 Java。 |
| **进程** | 由 UMC 启动的游戏进程，通过 UMC 进程 ID 和操作系统 PID 跟踪。 |
| **数据目录** | 实例、下载、运行时、任务、进程、日志和守护进程 Socket 的根目录。 |

## 推荐工作流

```sh
# 1. 选择版本
umc version list

# 2. 创建独立实例
umc instance create Survival 1.21.1

# 3. 安装游戏文件（使用输出的实例 ID）
umc instance install <instance-id>

# 4. 确认 Java 21 可用
umc java detect 21
# 或安装 Mojang 运行时
umc java install 1.21.1

# 5. 使用 Microsoft 账号登录
umc auth login

# 6. 在线启动
umc launch <instance-id> --online

# 或用于本地测试的离线启动
umc launch <instance-id> --offline Steve
```

上面的安装命令会等待任务完成，并把进度输出到 stderr。`umc task get` 等任务命令需要本地守护进程；参见 [任务与本地守护进程](./tasks-and-daemon)。

命令与参数索引见 [CLI 参考](./cli)。

## 两种长时间操作方式

UMC 有两条执行路径：

1. **CLI 进程内执行** —— `umc instance install` 和 `umc java install` 在 CLI 进程内启动任务，打印进度并等待完成。关闭 CLI 会中断该任务。
2. **本地守护进程 / JSON-RPC** —— `umcd` 保持引擎运行，立即返回任务 ID，并允许客户端查看、取消和重新连接任务。`umc task ...` 使用这条路径。

不要同时通过 CLI 和守护进程启动同一个安装。UMC 只在一个进程内部串行化操作；CLI 和守护进程是不同进程，不共享进程内实例锁。

## 数据与安全

通过 `UMC_DATA_DIR` 选择托管数据根目录。如果未设置，开发构建使用相对于当前工作目录的 `./umc-data`。

- 不要手工编辑 `instance.json`。如果它损坏，使用 `umc instance repair`。
- 游戏日志、任务记录和进程记录可能包含用户名、本地路径、服务器地址和游戏输出。分享前请先检查。
- 手工清理前备份数据目录。先停止正在运行的游戏进程和守护进程。
- 尽可能使用 UMC 命令删除实例和运行时，以便执行运行中进程检查。

完整目录结构和备份说明见 [数据、日志与备份](./data-and-logs)。

## 下一步

- [账号](./accounts) —— Microsoft 登录、已保存档案和凭据存储。
- [CLI 参考](./cli) —— 所有命令、参数和输出约定。
- [实例](./instances) —— 创建、安装、修复和删除实例。
- [Java 运行时](./java) —— 检测、安装和选择顺序。
- [启动与进程](./launching) —— 离线启动、日志和进程控制。
- [故障排查](./troubleshooting) —— 常见错误与恢复步骤。
- [JSON-RPC v1](../reference/rpc-v1) —— 集成 GUI 或其他语言。
