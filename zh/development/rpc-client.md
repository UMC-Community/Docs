---
source: en/development/rpc-client.md
---

# JSON-RPC 客户端指南

本页展示通过本地 JSON-RPC 契约完成一次完整集成流程。方法、事件和错误的权威定义见 [RPC v1 参考](../reference/rpc-v1)。

## 传输

两种选择：

| 传输 | 端点 | 适用场景 |
|---|---|---|
| 本地守护进程 | Unix 上的 `<data>/umc.sock`；Windows 上的 `\\.\pipe\umc` | 需要持久任务、重连或长生命周期进程监管 |
| stdio | `umc rpc --stdio` | 希望使用子进程而不是守护进程 |

两者都使用换行分隔的 JSON-RPC 2.0：每行一个 JSON 对象，每个请求返回一个带 `id` 的响应。没有 `id` 的通知会被忽略。诊断信息写入 stderr。

使用与客户端相同的数据目录启动守护进程：

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umcd
```

## 消息结构

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
```

成功：

```json
{"jsonrpc":"2.0","id":1,"result":{"name":"UMC","version":"0.1.0","api_versions":["v1"]}}
```

错误：

```json
{"jsonrpc":"2.0","id":1,"error":{"code":-32009,"message":"Instance is not installed; call instance.install first"}}
```

## 协商能力

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
{"jsonrpc":"2.0","id":2,"method":"system.capabilities","params":{}}
```

使用 `system.capabilities` 决定显示哪些功能。不要根据版本字符串推断能力。忽略未知能力字符串、结果字段和事件名称。

## 端到端流程

### 1. 列出可用版本

```json
{"jsonrpc":"2.0","id":3,"method":"version.list","params":{}}
```

结果是官方清单条目数组。选择一个准确的 `id`。

### 2. 创建实例

```json
{"jsonrpc":"2.0","id":4,"method":"instance.create","params":{
  "name":"Survival",
  "minecraft_version":"1.21.1"
}}
```

结果包含生成的 `id`：

```json
{"id":"instance-8f14...","name":"Survival","minecraft_version":"1.21.1", "...":"..."}
```

### 3. 启动安装

```json
{"jsonrpc":"2.0","id":5,"method":"instance.install","params":{
  "instance_id":"instance-8f14..."
}}
```

```json
{"task_id":"5b0d...","status":"queued"}
```

守护进程立即返回。使用事件跟随任务。

### 4. 跟随任务事件

```json
{"jsonrpc":"2.0","id":6,"method":"task.events","params":{
  "task_id":"5b0d...",
  "after_sequence":0,
  "wait_ms":30000
}}
```

结果是事件数组：

```json
[
  {"task_id":"5b0d...","sequence":1,"timestamp":"2026-11-19T00:00:00Z","event":"task.queued","data":{}},
  {"task_id":"5b0d...","sequence":2,"timestamp":"2026-11-19T00:00:01Z","event":"task.started","data":{}}
]
```

持久化最高的序号，并在下次调用时作为 `after_sequence` 传入。空数组表示长轮询超时。使用 `task.get` 检查终态：

```json
{"jsonrpc":"2.0","id":7,"method":"task.get","params":{"task_id":"5b0d..."}}
```

### 5. 准备 Java

检查兼容的系统运行时：

```json
{"jsonrpc":"2.0","id":8,"method":"java.detect","params":{"minimum_major":21}}
```

或者为已安装版本安装 Mojang 运行时：

```json
{"jsonrpc":"2.0","id":9,"method":"java.runtime.install","params":{
  "minecraft_version":"1.21.1"
}}
```

这也会返回任务句柄；通过相同的事件流程跟随它。

### 6. 离线启动

```json
{"jsonrpc":"2.0","id":10,"method":"launch.start","params":{
  "instance_id":"instance-8f14...",
  "username":"Steve",
  "offline_mode":true
}}
```

可选启动字段包括 `account_id`、`java_path`、`memory`、`resolution`、`fullscreen`、`extra_jvm_args` 和 `extra_game_args`。在线模式会被拒绝。

结果是包含 `process_id`、`pid` 和 `status` 的 `GameProcess`。

### 7. 跟进进程

```json
{"jsonrpc":"2.0","id":11,"method":"process.status","params":{"process_id":"c0f1..."}}
```

轮询 `process.status` 或 `process.list`。没有进程事件流。停止：

```json
{"jsonrpc":"2.0","id":12,"method":"process.stop","params":{"process_id":"c0f1..."}}
```

## Python 示例

本示例使用 Unix Socket 和 Python 标准库。假设 `umcd` 使用相同数据目录运行。

```python
import json
import socket

SOCKET_PATH = "/home/me/.local/share/umc/umc.sock"

def call(sock, request_id, method, params=None):
    request = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params or {},
    }
    sock.sendall((json.dumps(request) + "\n").encode())

    buffer = b""
    while not buffer.endswith(b"\n"):
        chunk = sock.recv(65536)
        if not chunk:
            raise RuntimeError("daemon closed the connection")
        buffer += chunk

    response = json.loads(buffer)
    if "error" in response:
        raise RuntimeError(response["error"]["message"])
    return response["result"]

with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
    sock.connect(SOCKET_PATH)

    print(call(sock, 1, "system.info"))
    print(call(sock, 2, "version.list"))

    instance = call(sock, 3, "instance.create", {
        "name": "Survival",
        "minecraft_version": "1.21.1",
    })

    task = call(sock, 4, "instance.install", {
        "instance_id": instance["id"],
    })

    sequence = 0
    while True:
        events = call(sock, 5, "task.events", {
            "task_id": task["task_id"],
            "after_sequence": sequence,
            "wait_ms": 30000,
        })
        for event in events:
            sequence = max(sequence, event["sequence"])
            print(event["event"], event["data"])

        info = call(sock, 6, "task.get", {"task_id": task["task_id"]})
        if info["status"] in {"succeeded", "failed", "cancelled", "interrupted"}:
            break

    process = call(sock, 7, "launch.start", {
        "instance_id": instance["id"],
        "username": "Steve",
        "offline_mode": True,
    })

    print(process)
```

每个连接使用唯一的请求 ID。保持 Socket 私有；它属于本地控制边界。

## 重连

- 任务记录和事件历史持久化在 `tasks/` 下。
- 守护进程重启后，未完成任务变为 `interrupted`；需要重新执行操作。
- 进程记录会在启动时以及 `process.list` / `process.status` 期间协调。
- 仍在运行的进程可以用 `process.stop` 停止；标记检查可避免 PID 复用错误。
- 重连后使用最后持久化的序号请求 `task.events`。

## 错误处理

- JSON-RPC 保留错误：`-32700` 解析错误、`-32600` 无效请求、`-32601` 未知方法、`-32602` 无效参数、`-32603` 内部错误。
- UMC 服务端错误使用 `-32000..-32099`；映射在 0.x 期间是暂定的。
- 任何错误响应都应视为调用失败。向用户显示可读消息，并保留错误码用于日志。
- 取消不是错误：应检查任务状态。

## 并发

对同一实例的变更操作只使用一个控制面。守护进程和 CLI 不共享进程内实例锁。同时通过两者启动同一个安装可能产生竞争。

## 相关

- [RPC v1 参考](../reference/rpc-v1) —— 每个方法、事件和当前限制。
- [集成指南](./) —— 选择传输方式。
- [任务与本地守护进程](../guide/tasks-and-daemon) —— 面向用户的守护进程行为。
