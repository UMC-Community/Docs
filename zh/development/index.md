---
source: en/development/index.md
---

# 集成指南

UMC 是无界面启动引擎。你的应用负责界面、账号和产品体验；UMC 负责版本发现、下载、实例、任务、Java、启动和进程状态。

CLI、Rust SDK、stdio 适配器和本地守护进程都委托给同一个 `umc-core` 实现。SDK 在进程内调用同一套 JSON-RPC 契约，因此各接入面的行为保持一致。

## 选择接入方式

| 接入方式 | 适合 | 生命周期 | 任务行为 | 进程监管 |
|---|---|---|---|---|
| Rust SDK，进程内 | 希望使用类型化调用、不额外启动进程的 Rust 应用 | 与你的进程绑定 | 任务在进程内运行 | 你的进程必须保持运行 |
| Rust SDK，`connect_daemon` | 需要长生命周期任务或进程监管的 Rust 应用 | 独立守护进程 | 持久化，可重连 | 守护进程监管 |
| 通过 `umcd` 使用 JSON-RPC | 跨语言 GUI、后台安装、重连 | 独立守护进程 | 持久化，可重连 | 守护进程监管 |
| 通过 `umc rpc --stdio` 使用 JSON-RPC | 沙箱化子进程、简单的请求/响应集成 | 子进程 | 任务在子进程内 | 子进程生命周期 |
| CLI | Shell 自动化、脚本、手工操作 | 每条命令 | CLI 安装命令会等待；`umc task` 需要守护进程 | 每条命令 |

建议：

- **Rust 桌面应用：** 先从进程内 SDK 开始。当安装需要跨 UI 重启存活，或需要多个窗口/进程共享一个控制点时，改用 `connect_daemon`。
- **跨语言 GUI：** 运行 `umcd`，使用本地 JSON-RPC 守护进程。这是为长生命周期后台任务和进程重连设计的接入方式。
- **不可信或沙箱化插件：** 把 `umc rpc --stdio` 作为子进程运行，并把数据目录放在插件沙箱之外。
- **自动化：** 使用 CLI。不要通过解析 stderr 判断任务状态；需要结构化进度时使用守护进程和 RPC 事件。

## 共享契约

所有接入面共享：

- `umc-api` 数据契约，例如 `InstanceConfig`、`LaunchRequest`、`GameProcess`、`TaskInfo` 和 `TaskEvent`。
- JSON-RPC 方法名和结果结构。SDK 在内部使用相同的消息信封。
- 相同的数据目录布局和错误类别。
- 相同的实例配置 schema 和恢复规则。

### 能力协商

先调用：

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
{"jsonrpc":"2.0","id":2,"method":"system.capabilities","params":{}}
```

`system.info` 返回 Core 版本和支持的 API 版本。`system.capabilities` 列出当前暴露的能力字符串。客户端不得根据 Core crate 版本推断能力，应使用 `system.capabilities`。

客户端应忽略未知的可选字段和事件名称，以保持向后兼容。

## 推荐的 GUI 生命周期

```text
1. 选择数据目录。
2. 启动或连接 umcd。
3. 读取 system.info 和 system.capabilities。
4. 列出可用版本。
5. 创建实例。
6. 启动 instance.install，并跟随 task.events。
7. 检查 Java；必要时安装托管运行时。
8. 检查 auth.status；应用需要在线游戏时运行 auth.login 并跟进任务事件。
9. 使用 offline_mode 或 account_id 启动 launch.start。
10. 轮询 process.status，直到 exited 或 failed。
11. 按用户请求停止进程或删除实例。
```

变更操作只使用一个控制面。CLI 和守护进程不共享进程内实例锁；不要同时通过两者启动同一个安装。

## 任务集成

安装方法返回任务句柄：

```json
{"task_id":"5b0d...","status":"queued"}
```

使用 `task.events`，不要解析 stderr：

```json
{"jsonrpc":"2.0","id":10,"method":"task.events","params":{
  "task_id":"5b0d...","after_sequence":0,"wait_ms":30000}}
```

响应是带单调递增 `sequence` 的事件数组。保存最后处理的序号，重连时作为 `after_sequence` 传入。使用 `task.get` 获取当前状态和结果，使用 `task.cancel` 请求取消。

处理这些终态：

- `succeeded` —— 有可用结果。
- `failed` —— `error` 描述失败原因。
- `cancelled` —— 已观察到取消。
- `interrupted` —— 守护进程在任务完成前重启；需要重新执行操作。

事件名称和任务语义见 [RPC v1](../reference/rpc-v1)。

## 进程集成

`launch.start` 会立即返回 `GameProcess`。没有进程事件流；请轮询 `process.status` 或 `process.list`。

- 在你的 API 中使用 UMC 的 `process_id`，不要使用操作系统 PID。
- `process.stop` 会先验证 UMC 进程标记再发送信号，因此重连后仍然安全。
- 原始监管者未观察到退出时，退出码可能为 `null`。
- 游戏 stdout 和 stderr 写入 `instances/<instance-id>/logs/umc-console.log`；UMC 不会通过 RPC 流式传输。

守护进程重启后，进程记录会从磁盘恢复。仍在运行的进程可以继续停止；已经消失的进程会报告为已退出。

## 传输细节

### 进程内 Rust SDK

SDK 创建 `UmcCore`，并在进程内通过 JSON-RPC 分发器路由调用。它是最简单的 Rust 集成方式，支持进程内加载器适配器。任务和进程监管与你的进程生命周期绑定。

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .build()
    .await?;
```

### 本地守护进程

`umcd` 使用 `<data>/umc.sock` 处的 Unix Socket 或 Windows 命名管道。数据目录由 `UMC_DATA_DIR` 设置。守护进程：

- 使用仅所有者可访问的本地 IPC。
- 不打开 TCP 监听。
- 持久化任务并恢复进程状态。
- 一个守护进程服务一个数据目录。

保持数据目录私有，不要把 Socket 或管道代理为远程服务。

### stdio 子进程

`umc rpc --stdio` 在 stdin/stdout 上使用换行分隔的 JSON-RPC。诊断信息写入 stderr。子进程拥有其任务和进程监管。当宿主希望进程隔离但不想维护常驻守护进程时，可以使用这种模式。

## 加载器适配器

加载器适配器是编译后的 Rust 代码。可以在进程内注册：

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .register_loader(std::sync::Arc::new(MyAdapter::new()))
    .build()
    .await?;
```

UMC 不会下载或动态加载提供方代码。守护进程客户端无法注入适配器；守护进程宿主必须编译并注册它们。参见 [加载器适配器](./loaders)。

## 错误处理

- JSON-RPC 保留错误使用 `-32700` 到 `-32603`。
- UMC 服务端错误使用 `-32000` 到 `-32099`；当前映射在 1.0 之前是暂定的。
- Rust SDK 返回 `Result<T, String>`；请在应用中把字符串映射为用户可读消息。
- 不要在没有上下文的情况下显示原始内部错误，也不要把错误字符串当作稳定的协议码。

## 并发与锁

UMC 在一个进程内串行化操作，并限制安装和下载并发。它不为 CLI 和守护进程提供跨进程锁。如果你的应用可能同时运行两者，请自行协调变更操作，或只使用守护进程。

## 兼容性

- Rust crate 使用 SemVer。1.0 之前，破坏性 API 变更需要新的次版本。
- JSON-RPC `v1` 通过 `system.info` 通告；新增字段和事件保持兼容。
- `InstanceConfig` 自带 `schema_version`；迁移属于存储契约的一部分。
- 不要根据 Core 版本推断能力。

## 署名与再分发

UMC 使用 MIT 许可证。再分发 UMC 或其重要部分时，请保留版权和许可证文本。在应用包中包含许可证，例如 `licenses/` 目录或 About/Legal 页面。

“Powered by UMC Core”是可选的社区署名，不是 MIT 要求。不要暗示 UMC 为集成应用背书。参见[服务条款](../about/terms)和[隐私政策](../about/privacy)。

集成应用仍需自行说明其遥测、网络请求、账号处理和隐私实践。

## 下一步

- [Rust SDK](./sdk) —— 类型化的进程内和守护进程集成。
- [JSON-RPC 客户端指南](./rpc-client) —— 端到端请求示例。
- [架构](./architecture) —— Core 边界和流水线。
- [RPC v1 参考](../reference/rpc-v1) —— 方法和事件的权威契约。
