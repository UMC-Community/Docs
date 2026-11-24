---
source: en/reference/rpc-v1.md
---

# UMC JSON-RPC v1

传输：通过子进程 stdin/stdout 的换行分隔 JSON（`umc rpc --stdio`）。每行一个请求；每个请求返回一个带 `id` 的响应。诊断信息写入 stderr。没有 ID 的通知会被忽略，且不产生响应。

## 消息结构

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
```

成功：

```json
{"jsonrpc":"2.0","id":1,"result":{"name":"UMC","version":"0.1.1","api_versions":["v1"]}}
```

错误使用 JSON-RPC 保留错误码：`-32700`（解析）、`-32600`（无效请求）、`-32601`（未知方法）、`-32602`（无效参数）、`-32603`（内部）。UMC 服务端错误使用 `-32000..-32099`；当前映射：`-32001` 内部、`-32003` 资源/进程缺失、`-32005` 网络/安装、`-32007` 认证/会话失败、`-32009` 实例操作、`-32010` Java/启动。错误码在 1.0 之前是暂定的，且不得编码 Rust 实现细节。

## 初步方法

| 方法 | 参数 | 结果 |
|---|---|---|
| `system.info` | `{}` | 名称、语义版本、支持的 API 版本 |
| `system.capabilities` | `{}` | 支持的能力字符串 |
| `version.list` | `{}` | 官方清单条目数组；网络结果缓存在 `cache/version_manifest_v2.json` |
| `version.latest` | `{}` | 最新正式版和快照标识 |
| `instance.create` | `{ "name", "minecraft_version", "memory?" }` | 生成的实例配置 |
| `instance.list` | `{}` | 托管的实例配置 |
| `instance.get` | `{ "instance_id" }` | 一个实例配置 |
| `instance.remove` | `{ "instance_id" }` | 删除该实例的私有游戏目录和配置 |
| `instance.repair` | `{ "instance_id" }` | 恢复有效备份，或根据已验证的安装元数据重建配置 |
| `instance.install` | `{ "instance_id", "timeout_seconds?" }` | 排队原版安装并返回任务句柄 |
| `loader.list` | `{}` | 内建加载器适配器 ID |
| `loader.versions` | `{ "loader", "minecraft_version" }` | 来自该加载器元数据源的兼容版本 |
| `loader.plan` | `{ "loader", "minecraft_version", "loader_version?" }` | 加载器专用预检计划；不执行安装 |
| `java.detect` | `{ "path?", "minimum_major?" }` | Java 运行时详情，以及针对请求主版本的 `compatible` 结果 |
| `java.runtime.list` | `{}` | 已验证的 UMC 托管运行时 |
| `java.runtime.install` | `{ "minecraft_version", "timeout_seconds?" }` | 排队安装已安装 Minecraft 版本所需的 Mojang 运行时组件 |
| `java.runtime.remove` | `{ "runtime_id" }` | 从 UMC 托管运行时目录移除运行时 |
| `auth.status` | `{}` | 登录状态、默认账号、凭据后端、存储警告和已保存账号 |
| `auth.accounts` | `{}` | 不含 Token 的已保存账号元数据 |
| `auth.login` | `{ "open_browser"?, "redirect_uri"? }` | 排队交互式 Microsoft 登录任务并返回任务句柄 |
| `auth.refresh` | `{ "account_id"? }` | 无需浏览器，续期所选账号的 Minecraft 会话 |
| `auth.logout` | `{ "account_id"? }` | 删除所选账号的刷新 Token 和元数据 |
| `launch.start` | `{ "instance_id", "offline_mode", "username"?, "account_id"?, ... }` | 启动游戏进程并返回 UMC 进程 ID 和操作系统 PID |
| `process.list` | `{}` | 协调并列出持久化进程状态，适合客户端/守护进程重启后重连 |
| `process.status` | `{ "process_id" }` | 协调后的进程状态和已知时的退出码 |
| `process.stop` | `{ "process_id" }` | 校验身份后停止托管进程，包括守护进程重连后 |
| `task.get` | `{ "task_id" }` | 任务状态、最新进度、结果、错误和最新事件序号 |
| `task.cancel` | `{ "task_id" }` | 请求取消排队中或运行中的任务 |
| `task.events` | `{ "task_id", "after_sequence?", "wait_ms?" }` | 返回指定序号之后的持久化事件；`wait_ms` 最长长轮询 30 秒 |

## 认证流程

`auth.login` 是一个任务，因为它需要等待用户在浏览器中完成操作。它返回任务句柄，客户端通过 `task.events` 跟进：

| 事件 | 数据 |
|---|---|
| `auth.url` | `{ "url", "redirect_uri" }` —— 打开此 URL，或让 `open_browser` 处理 |
| `auth.browser_error` | `{ "error" }`，浏览器无法打开时 |
| `auth.stage` | `{ "stage" }` —— Xbox Live、XSTS、Minecraft 登录或档案 |
| `task.completed` | `{ "result": { "account": { "id", "name" }, "storage_warning" } }` |

通过 RPC 时 `open_browser` 默认为 `false`，因此无图形界面的守护进程不会尝试启动 GUI。可以打开浏览器的客户端可传入 `true`。

Token 永远不会通过 RPC 返回。`auth.status` 和 `auth.accounts` 只暴露账号 ID、名称、时间戳和凭据后端。在线 `launch.start` 在内部续期会话，只把 Token 传给游戏进程。

启动参数：

| 字段 | 含义 |
|---|---|
| `offline_mode: true` | 需要 `username`；派生标准离线 UUID，并使用 `legacy`/`offline` 参数。 |
| `offline_mode: false` | 续期所选账号，并使用 `msa`、档案 UUID 和名称、Minecraft 访问 Token、XUID 和 UMC 的 OAuth 客户端 ID 启动。`account_id` 选择账号；省略时使用默认账号。 |
| `account_id` | 账号 UUID。只保存一个账号时可省略。 |

如果刷新 Token 被拒绝，`launch.start` 会以 `-32007` 失败，删除已保存的凭据，并要求客户端重新运行 `auth.login`。如果没有已登录账号，也会返回同一错误码并提示登录。

## 共享数据契约

`umc-api` 为 SDK 和 RPC 适配器定义与传输无关的 `InstanceConfig`、`LaunchRequest`、`MemoryConfig`、`AuthStatus`、`AccountSummary`、`AuthRefreshResult`、`GameProcess`、`TaskHandle` 和错误类别类型。内存值以 MiB 为单位。实例游戏路径相对于托管数据根目录。

## 当前限制

实例配置带有 `schema_version`。版本 0 文件在读取时迁移到版本 1，旧字节保留为 `instance.json.bak`。写入使用同步的临时文件和原子重命名。损坏的主文件会被隔离，并从有效备份恢复。如果没有备份，`instance.repair` 只有在版本元数据和安装记录一致时才能重建配置；游戏数据会保留。无法恢复的配置错误会由 `instance.list` 报告，而不是静默隐藏该目录。

原版启动路径同时支持显式离线模式和 Microsoft 认证的在线模式。在线启动会续期已保存的刷新 Token，依次经过 Xbox Live/XSTS/Minecraft 服务，并把会话传给游戏；加载器实例仍无法启动。托管 Java 下载是可选的，使用 Mojang 运行时目录，并校验目录清单和每个运行时文件的 SHA-1 与大小。启动优先选择与版本 Mojang 组件匹配的兼容托管运行时，然后检查系统 Java。`java.detect` 会报告已安装但不兼容的 Java，便于客户端说明所需版本。删除会拒绝运行中的进程，并在无法验证进程状态时拒绝删除。CLI 启动会等待游戏退出；stdout/stderr 写入 `instances/<id>/logs/umc-console.log`，因此不会破坏 stdio RPC 流。

加载器适配器目前只提供版本发现和加载器专用安装预检。Fabric 计划使用 Fabric Meta 的启动器配置文件；Forge 和 NeoForge 计划标识各自的 Maven 安装器构件和校验和副文件。`loader.plan` 不会下载、执行安装器、修改实例，也不会让加载器实例可启动。自定义提供方代码可以由可信的 Rust 宿主注册；提供方不会被动态加载，守护进程提供方必须由守护进程宿主配置。CurseForge 和 Modrinth 内容 API 与加载器安装相互独立，不属于这些适配器。

## 任务语义

`instance.install` 和 `java.runtime.install` 立即返回 `{ "task_id", "status": "queued" }`。任务记录和 JSONL 事件历史持久化在 `tasks/` 下。事件带有每个任务内单调递增的 `sequence`、UTC 时间戳和 `data` 对象。当前事件名称包括 `task.queued`、`task.started`、`install.progress`、`download.progress`、`download.retry`、`download.completed`、`task.completed`、`task.failed`、`task.cancelled`、`task.timeout` 和 `task.interrupted`。

任务默认期限为六小时；调用方可设置 `timeout_seconds`，范围 1 到 21600。网络请求连接超时为 15 秒，下载读取在 45 秒无数据后失败，每个文件最多尝试三次。最多同时运行两个安装操作，共享信号量将活动文件下载限制为全任务合计 32 个。`task.cancel` 发出取消信号；下载会在任务进入 `cancelled` 前删除未完成文件。守护进程重启会把未完成任务标记为 `interrupted`；已完成任务的结果和事件历史仍可查询。任务取消与停止游戏进程相互独立。

## 本地守护进程传输

使用与客户端相同的 `UMC_DATA_DIR` 运行 `umcd`。它提供换行分隔的 JSON-RPC 2.0 请求：Unix 使用 `<data-dir>/umc.sock`（Socket 模式 `0600`，数据目录模式 `0700`）；Windows 使用 `\\.\pipe\umc`，带仅所有者 ACL，并拒绝远程客户端。守护进程不绑定 TCP 端口。一个请求是一行一个 JSON 对象，响应也是一行一个 JSON 对象。`umc-sdk` 可以通过 `Launcher::builder().data_dir(path).connect_daemon()` 连接。

启动时以及 `process.list` / `process.status` 期间，UMC 会用启动游戏时添加的随机 `-Dumc.process_id=<process-id>` 标记核对保存的进程 ID。这样可以避免向被复用的 PID 发送信号。`process.stop` 在 Unix 上发送 SIGTERM，或在 Windows 上终止已验证的进程树之前，会验证该标记。守护进程崩溃后，进程状态会从 JSON 记录恢复；已退出的恢复进程会标记为 `exited`，`exit_code: null`，因为原监管者没有观察到退出。Java 进程及其日志文件独立于守护进程继续运行。损坏的进程记录会使停止/删除失败关闭，并报告给客户端。
