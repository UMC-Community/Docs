---
source: en/guide/launching.md
---

# 启动与进程

UMC 可以使用显式离线身份或已登录的 Microsoft 账号启动 Minecraft: Java Edition。本页介绍两种启动模式、UMC 添加的参数、进程监管、日志以及如何停止游戏。

::: warning 离线模式

离线模式不会验证账号所有权，也不会启用需要认证的多人游戏。只有在线模式会通过 Microsoft 账号登录并获得 Minecraft 会话。离线模式适合本地测试，不能当作账号登录使用。

:::

## 启动已安装实例

在线：

```sh
umc auth login
umc launch <instance-id> --online
```

离线：

```sh
umc launch <instance-id> --offline Steve
```

- 实例必须先通过 `umc instance install` 安装。
- `--online` 会静默刷新所选账号的会话，并以认证身份启动。
- `--offline` 需要 1–16 个 ASCII 字母、数字或下划线组成的用户名。
- 保存了多个账号时，使用 `--account <account-id>` 选择账号。
- CLI 会等待游戏退出，并输出最终状态 JSON。

命令先输出初始进程记录，然后每秒轮询一次，直到状态变为 `exited` 或 `failed`。

## 在线启动

登录一次：

```sh
umc auth login
```

这会打开 Microsoft 登录页面，完成 Xbox Live、XSTS 和 Minecraft 登录链路，并且只保存刷新 Token。之后的启动会使用该 Token，不再打开浏览器：

```sh
umc launch <instance-id> --online
umc launch <instance-id> --online --account <account-id>
```

游戏会收到：

```text
--username      <Minecraft 档案名称>
--uuid          <不带横线的 Minecraft 档案 UUID>
--accessToken   <Minecraft 访问 Token>
--clientId      <UMC OAuth 客户端 ID>
--xuid          <Xbox 用户 ID>
--userType      msa
--versionType   UMC
```

每次在线启动都会获取新的 Minecraft 访问 Token，因此保存的刷新 Token 是唯一长期凭据。`status`、`refresh` 和 `logout` 见[账号管理](./user-guide#microsoft-账号)。

### Token 处理

- Microsoft 和 Minecraft Token 不会被打印、写入实例配置或加入进程记录。
- 刷新 Token 优先存入操作系统钥匙串；不可用时存入 `UMC_DATA_DIR/credentials/` 下权限为 `0600` 的文件。
- Minecraft 要求访问 Token 出现在命令行中，因此游戏运行期间它会在本机进程列表中可见。这是原版客户端的固有限制，所有启动器都一样。
- `umc auth logout` 会删除已保存的凭据。

## 离线身份

UMC 根据用户名派生确定性的离线 UUID，与 Minecraft 的标准离线配置文件派生方式一致（使用 `OfflinePlayer:<username>`，并设置 RFC 4122 版本位和变体位）。启动游戏时使用：

```text
--accessToken offline
--userType legacy
--versionType UMC
```

玩家数据以该 UUID 为键。更改离线用户名会创建不同的玩家身份，并在游戏目录中产生独立的玩家数据。

## UMC 传给 Minecraft 的内容

启动器根据官方版本元数据组装命令：

- `versions/<version>/` 下的版本元数据和客户端 JAR。
- 由已验证库和客户端 JAR 组成的类路径。
- 指向解压原生库的 `-Djava.library.path`。
- 用于进程身份校验的 `-Dumc.process_id=<process-id>`。
- 来自实例内存配置的 `-Xms` / `-Xmx`。
- `--username`、`--version`、`--gameDir`、`--assetsDir`、`--assetIndex`、`--uuid`、`--accessToken`、`--userType` 和 `--versionType`。
- 当所选游戏版本包含时，还会传入 `--xuid` 和 `--clientId`；在线启动会从 Xbox 身份和 UMC 的 OAuth 客户端 ID 填充。
- 官方 JVM 和游戏参数，并应用平台与特性规则。
- 版本提供的官方日志配置。

进程工作目录是实例的 `game/` 目录。UMC 会把游戏 stdout 和 stderr 写入实例控制台日志。

## 内存

实例默认初始堆为 1024 MiB，最大堆为 4096 MiB。CLI 启动命令使用实例配置，不提供内存参数。

SDK 和 JSON-RPC 客户端可以通过 `LaunchRequest.memory` 在单次启动时覆盖内存，还可以覆盖分辨率、全屏、额外 JVM 参数、额外游戏参数和显式 Java 路径。参见 [JSON-RPC v1](../reference/rpc-v1)。

## 进程生命周期

启动的游戏会记录为 `GameProcess`：

```json
{
  "process_id": "c0f1f0e8-9c7b-4a43-9f3b-3f6e0f6e6d1a",
  "instance_id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "pid": 48231,
  "status": "running",
  "started_at": "2026-11-19T00:00:00Z",
  "exit_code": null
}
```

状态：

| 状态 | 含义 |
|---|---|
| `starting` | 记录已存在，但尚未确认进程正在运行 |
| `running` | 游戏进程存活 |
| `exited` | 进程已结束；可能带有 `exit_code` |
| `failed` | UMC 无法启动或监管该进程 |

进程记录保存在 `processes/<process-id>.json`。CLI 进程在等待期间监管子进程。如果控制进程或守护进程先退出，后续的 `process.list` 会根据 `-Dumc.process_id` 标记重新核对保存的 PID。已经消失的进程会标记为 `exited`；退出码可能为 `null`，因为原始监管者没有观察到退出。

## 查看和停止进程

```sh
umc process list
umc process status <process-id>
umc process stop <process-id>
```

`process stop` 会先验证 UMC 进程标记再发送信号，因此不会误杀被复用的 PID。在 Unix 上 UMC 发送 `SIGTERM`；在 Windows 上会终止已验证的进程树。

尽可能从游戏菜单正常退出，让游戏正常保存。强制停止可能使当前世界或玩家数据停留在游戏最后一次保存的状态。

## 日志

游戏输出追加写入：

```text
instances/<instance-id>/logs/umc-console.log
```

该文件包含游戏的 stdout 和 stderr，不会自动轮转。它可能包含玩家名称、本地路径、服务器地址、Java 输出以及模组打印的信息。分享前请先检查。

Minecraft 还可能在实例的 `game/` 目录中写入崩溃报告和其他诊断信息，通常位于 `game/crash-reports/`。UMC 不会解析或上传崩溃报告。

当前版本不提供交互式游戏控制台输入：游戏的标准输入是关闭的。请使用游戏自身的界面和控制台日志进行诊断。

## 不需要守护进程

`umc launch` 和 `umc process ...` 命令直接使用本地数据目录，不需要 `umcd`。如果你同时运行了 `umcd`，不要通过两个控制面同时启动同一个实例。

## 守护进程重启后

进程记录会在守护进程或客户端重启后保留。启动时以及 `process.list` / `process.status` 期间，UMC 会用进程标记检查保存的 PID：

- 如果进程仍然存活，会报告为 `running`，并且可以停止。
- 如果进程已经退出，会报告为 `exited`；未观察到退出时 `exit_code` 为 `null`。
- 损坏的进程记录会失败关闭：UMC 不会基于无效记录停止或删除。

## 相关

- [Java 运行时](./java) —— 启动时如何选择 Java。
- [数据、日志与备份](./data-and-logs) —— 日志和进程记录的位置。
- [故障排查](./troubleshooting) —— 启动失败和卡住的进程。
