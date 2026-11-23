---
source: en/guide/cli.md
---

# CLI 参考

`umc` 二进制是 Rust SDK 和本地守护进程所用同一 Core 的命令行适配器。除特别说明外，命令会把机器可读的 JSON 写到标准输出；进度和诊断信息写到标准错误。

## 全局约定

| 项目 | 行为 |
|---|---|
| 数据目录 | 如果设置了 `UMC_DATA_DIR` 则使用它；否则使用相对于当前目录的 `./umc-data` |
| 输出 | 大多数命令在 stdout 输出格式化 JSON |
| 进度 | 安装进度和任务提示输出到 stderr |
| 错误 | 退出状态非零；CLI 会打印错误消息 |
| 配置文件 | 无；数据目录通过环境变量选择 |
| Shell 执行 | UMC 不提供任意 shell 执行 |
| 在线模式 | 可通过 `--online` 使用；需要先运行 `umc auth login` |

大多数命令不需要 `umcd`。例外是 `umc task ...`，它会连接本地守护进程。两种方式的区别见 [任务与本地守护进程](./tasks-and-daemon)。

## 命令总览

```text
umc version list
umc instance create <name> <minecraft-version>
umc instance list
umc instance get <instance-id>
umc instance install <instance-id>
umc instance repair <instance-id>
umc instance remove <instance-id>
umc java detect [minimum-major]
umc java runtimes
umc java install <minecraft-version>
umc java remove <runtime-id>
umc task get <task-id>
umc task cancel <task-id>
umc task events <task-id> [after-sequence]
umc process list
umc process status <process-id>
umc process stop <process-id>
umc auth login [--no-browser] [--redirect-uri <uri>]
umc auth status
umc auth accounts
umc auth refresh [--account <account-id>]
umc auth logout [--account <account-id>]
umc launch <instance-id> --online [--account <account-id>]
umc launch <instance-id> --offline <username>
umc rpc --stdio
umcd
```

## 版本命令

### `umc version list`

获取 Mojang 官方版本清单，每行输出一个版本 ID。清单会缓存到 `cache/version_manifest_v2.json`，有效期为 1 小时。

```sh
umc version list | head
```

```text
1.21.11
1.21.10
1.21.9
...
```

版本 ID 区分大小写，必须与官方清单一致。

## 实例命令

### `umc instance create <name> <minecraft-version>`

创建独立实例，并以 JSON 输出 `InstanceConfig`。生成的 ID 形式为 `instance-<32 位十六进制字符>`。游戏目录会立即创建。

```sh
umc instance create Survival 1.21.1
```

```json
{
  "schema_version": 1,
  "id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "name": "Survival",
  "minecraft_version": "1.21.1",
  "java_runtime": "auto",
  "memory": { "minimum_mib": 1024, "maximum_mib": 4096 },
  "game_directory": "instances/instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204/game"
}
```

- `name`：1–128 个字符，不能为空。
- `minecraft_version`：必须存在于官方清单中。
- 默认内存：初始 1024 MiB，最大 4096 MiB。
- 当前 CLI 在创建时不接受加载器、内存覆盖或 Java 选择。

### `umc instance list`

以 JSON 数组输出所有可读取的实例配置。如果某个配置无法恢复，命令会报错，而不是静默隐藏该目录。

### `umc instance get <instance-id>`

输出一个实例配置。

### `umc instance install <instance-id>`

下载客户端 JAR、版本元数据、库、原生库、资源和日志配置，然后写入 `instances/<id>/install.json`。命令会等待任务结束，并在完成时输出 JSON 结果，进度写入 stderr。

```sh
umc instance install instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204
```

该操作是幂等的：已经匹配预期 SHA-1 和大小的文件会被复用，因此重复执行安装可以修复缺失或损坏的文件。当前原版安装器会拒绝带加载器的实例。

### `umc instance repair <instance-id>`

只修复**实例配置**，不修复游戏文件：

1. 如果 `instance.json` 有效，原样返回。
2. 如果主文件损坏但存在有效备份，则使用备份。
3. 如果没有可用备份，则根据已验证的安装记录和版本元数据重建配置。

游戏数据会保留。如果既没有有效备份，也没有有效安装记录，修复会失败。

### `umc instance remove <instance-id>`

删除实例目录及其配置。如果该实例的游戏进程仍在运行，或进程状态无法验证，命令会拒绝继续。请先执行 `umc process stop <process-id>`。

## Java 命令

### `umc java detect [minimum-major]`

依次检查 `JAVA_HOME` 和 `PATH` 中的 Java。`minimum-major` 默认为 `8`。

```sh
umc java detect 21
```

结果包含 `path`、`major_version`、`vendor_version`、`compatible` 和 `required_major`。如果只找到不兼容的 Java，会返回 `compatible: false`，以便调用方向用户说明所需版本。

### `umc java runtimes`

列出 `runtimes/` 下已验证的 Mojang 托管运行时。只有存在 `umc-runtime.json` 标记，并且捆绑的 Java 报告预期版本时，运行时才会被列出。

### `umc java install <minecraft-version>`

为**已安装**的 Minecraft 版本安装其所需的 Mojang 运行时：

1. 读取 `versions/<version>/<version>.json`。
2. 读取所需的 Mojang 运行时组件和主版本。
3. 下载运行时目录，并用 SHA-1 校验运行时清单。
4. 下载每个运行时文件，并校验 SHA-1 和大小。
5. 运行下载的 Java，检查其主版本。
6. 写入 `runtimes/<component>/<version>/umc-runtime.json`。

CLI 会等待任务完成。支持的组件包括 `java-runtime-alpha`、`java-runtime-beta`、`java-runtime-gamma`、`java-runtime-delta` 和 `jre-legacy`。如果版本元数据要求其他组件，请使用系统包管理器安装 Java。

```sh
umc instance install <instance-id>
umc java install 1.21.1
```

### `umc java remove <runtime-id>`

删除托管运行时目录。删除前请停止使用该运行时的游戏进程。运行时 ID 形式为 `component@version`，例如 `java-runtime-delta@21.0.5`。

## 任务命令

`umc task ...` 会与本地守护进程通信。请先用相同的 `UMC_DATA_DIR` 启动 `umcd`。

### `umc task get <task-id>`

输出任务状态、最新进度、结果或错误，以及最新事件序号。

### `umc task cancel <task-id>`

请求取消排队中或运行中的任务。操作观察到取消请求后，任务会进入 `cancelled`。未完成的下载文件会被删除。

### `umc task events <task-id> [after-sequence]`

输出指定序号之后的持久化事件（默认序号为 `0`）。CLI 最多等待 1 秒获取新事件；对应的 JSON-RPC 方法支持更长的长轮询。

## 进程命令

进程命令直接操作本地数据目录，不需要 `umcd`。

### `umc process list`

协调并输出持久化的进程状态。如果操作系统 PID 不再匹配 UMC 进程标记，进程会显示为已退出。

### `umc process status <process-id>`

输出协调后的状态，以及已知时的退出码。

### `umc process stop <process-id>`

发送终止信号前，会校验 `-Dumc.process_id` 标记。在 Unix 上 UMC 发送 `SIGTERM`；在 Windows 上会终止已验证的进程树。过期或已被复用的 PID 永远不会被误杀。

## 认证命令

### `umc auth login [--no-browser] [--redirect-uri <uri>]`

使用 PKCE 和回环回调启动 Microsoft OAuth 流程。默认会在浏览器中打开授权 URL；`--no-browser` 只打印 URL。回调完成后，UMC 会依次完成 Xbox Live、XSTS 和 Minecraft 登录，并且只保存刷新 Token。

```sh
umc auth login
umc auth login --no-browser
```

命令会输出账号名称和 UUID，不会打印 Token。

### `umc auth status`

以 JSON 输出凭据后端（`keyring` 或 `file`）、默认账号和所有已保存账号。不会发起网络请求。

### `umc auth accounts`

以 JSON 数组输出已保存的账号元数据。

### `umc auth refresh [--account <account-id>]`

使用已保存的刷新 Token 续期所选账号的 Minecraft 会话，不会打开浏览器。存在多个账号时用 `--account` 选择。

### `umc auth logout [--account <account-id>]`

删除所选账号已保存的刷新 Token 和账号元数据。不会更改 Microsoft 账号或 Minecraft 档案。

## 启动命令

### `umc launch <instance-id> --online [--account <account-id>]`

刷新所选 Microsoft 账号的会话，以认证身份启动 Minecraft，然后等待游戏退出。

```sh
umc auth login
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --online
```

### `umc launch <instance-id> --offline <username>`

以显式离线模式启动 Minecraft，然后等待游戏退出。用户名必须为 1–16 个 ASCII 字母、数字或下划线。

```sh
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --offline Steve
```

- 实例必须已安装。
- `--online` 和 `--offline` 必须且只能选择一个。
- CLI 启动命令不提供内存、分辨率、全屏、JVM 参数或 Java 路径覆盖。这些字段可通过 JSON-RPC `launch.start` 和 Rust SDK 使用。

参数细节、日志和进程行为见 [启动与进程](./launching)。

## RPC 与守护进程

### `umc rpc --stdio`

在 stdin/stdout 上运行按行分隔的 JSON-RPC 适配器。诊断信息应写入 stderr。该模式适合 GUI 或其他进程把 `umc` 作为子进程管理。

### `umcd`

使用与客户端相同的 `UMC_DATA_DIR` 启动本地 JSON-RPC 守护进程。在 Unix 上绑定 `<data>/umc.sock`；在 Windows 上创建 `\\.\pipe\umc`。它不会打开 TCP 端口。参见 [任务与本地守护进程](./tasks-and-daemon) 和 [RPC v1 参考](../reference/rpc-v1)。

## 退出状态

成功命令的退出状态为 `0`。无效参数、资源缺失、网络失败、完整性失败和任务失败会产生非零退出状态。查看打印的错误以及相关任务或进程记录以获取细节。
