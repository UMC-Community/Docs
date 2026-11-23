---
source: en/guide/tasks-and-daemon.md
---

# 任务与本地守护进程

安装实例或 Java 运行时属于长时间操作。UMC 把这些操作建模为带有序号进度事件的持久化任务。

## 任务状态

| 状态 | 含义 |
|---|---|
| `queued` | 已创建，等待执行槽位 |
| `running` | 正在下载或准备文件 |
| `succeeded` | 已完成；有可用结果 |
| `failed` | 已完成，但发生错误 |
| `cancelled` | 已请求取消并被观察到 |
| `interrupted` | 守护进程在任务完成前重启 |

任务记录写入 `tasks/<task-id>.json`，事件历史写入 `tasks/events/<task-id>.jsonl`。

## 进度事件

事件带有每个任务内单调递增的 `sequence`、UTC 时间戳、事件名称和数据对象。当前事件名称包括：

- `task.queued`
- `task.started`
- `install.progress`
- `download.progress`
- `download.retry`
- `download.completed`
- `task.completed`
- `task.failed`
- `task.cancelled`
- `task.timeout`
- `task.interrupted`

为了向前兼容，客户端应忽略未知事件名称和字段。

## 两条执行路径

### CLI 路径

`umc instance install` 和 `umc java install` 在 CLI 进程内运行操作。CLI 会把进度写到 stderr，并等待结果。关闭 CLI 会中断操作。

这条路径适合交互式安装，不需要 `umcd`。

### 守护进程路径

`umcd` 保持引擎运行，允许客户端创建后台任务、查询进度、取消和重新连接。守护进程会立即返回任务句柄：

```json
{ "task_id": "5b0d...", "status": "queued" }
```

任务查看命令使用这条路径：

```sh
umc task get <task-id>
umc task events <task-id>
umc task cancel <task-id>
```

这些命令要求 `umcd` 以相同的 `UMC_DATA_DIR` 运行。如果守护进程没有运行，它们会因守护进程连接错误而失败。

不要同时通过 CLI 和守护进程运行同一个安装。UMC 会在一个任务管理器内部串行化操作，但 CLI 和守护进程是不同进程。

## 超时、重试与并发

- 默认任务超时：**6 小时**。
- JSON-RPC 调用方可设置 `timeout_seconds`，范围 1 到 21600（6 小时）。
- 最多同时运行 **2 个操作**；更多任务在 `queued` 中等待。
- 所有任务合计最多同时进行 **32 个文件下载**。
- 每个文件下载最多尝试 **3 次**。
- 元数据请求 45 秒超时；连接超时为 15 秒。
- 如果 45 秒内没有收到数据，下载会失败。
- 下载不会跨尝试续传；每次尝试都从文件开头重新开始。
- 取消会删除未完成的下载文件。

## 取消

`task.cancel` 请求取消。操作观察到请求后进入 `cancelled`。取消与停止游戏进程相互独立。

```sh
umc task cancel <task-id>
```

## 重启后的恢复

启动时，`umcd` 会：

1. 加载持久化任务。
2. 把未完成任务标记为 `interrupted`。
3. 恢复进程记录。
4. 如果没有守护进程在监听，移除过期 Socket。

已完成的任务结果和事件历史仍可查询。被中断的安装应重新执行；已经匹配哈希的文件会被复用。

## 启动守护进程

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umcd
```

守护进程使用与客户端相同的 `UMC_DATA_DIR`。在 Unix 上绑定：

```text
<data>/umc.sock
```

数据目录会被限制为仅所有者可访问（模式 `0700`），Socket 设置为模式 `0600`。在 Windows 上创建带仅所有者 ACL 的 `\\.\pipe\umc`，并拒绝远程客户端。UMC 不会打开 TCP 监听。

一个数据目录只能由一个守护进程提供服务。如果另一个守护进程已在 Socket 上监听，`umcd` 会以“已经在运行”的错误退出。

## 安全边界

本地守护进程是一个控制面。请保持数据目录私有：

- 不要把数据目录放在全局可写或共享目录中。
- 不要把 Socket 或命名管道代理或暴露为远程服务。
- 把任务结果、进程记录和日志视为本地运行数据。

当前版本不提供远程传输，因此也没有远程认证层。

## 相关

- [JSON-RPC v1](../reference/rpc-v1) —— 方法列表、任务 ID 和事件语义。
- [数据、日志与备份](./data-and-logs) —— 任务和事件文件。
- [故障排查](./troubleshooting) —— 守护进程连接和任务恢复错误。
