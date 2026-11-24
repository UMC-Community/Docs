# JSON-RPC client guide

This page shows a complete integration flow over the local JSON-RPC contract. The canonical method,
event, and error definitions live in the [RPC v1 reference](../reference/rpc-v1).

## Transport

Two options:

| Transport | Endpoint | Use when |
|---|---|---|
| Local daemon | `<data>/umc.sock` on Unix; `\\.\pipe\umc` on Windows | You need persistent tasks, reconnection, or long-lived process supervision |
| stdio | `umc rpc --stdio` | You want a child process instead of a daemon |

Both use newline-delimited JSON-RPC 2.0: one JSON object per line, one response per request with an
`id`. Notifications without an `id` are ignored. Diagnostics go to stderr.

Start the daemon with the same data directory as your client:

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umcd
```

## Envelope

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
```

Success:

```json
{"jsonrpc":"2.0","id":1,"result":{"name":"UMC","version":"0.1.1","api_versions":["v1"]}}
```

Error:

```json
{"jsonrpc":"2.0","id":1,"error":{"code":-32009,"message":"Instance is not installed; call instance.install first"}}
```

## Negotiate capabilities

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
{"jsonrpc":"2.0","id":2,"method":"system.capabilities","params":{}}
```

Use `system.capabilities` to decide which features to show. Do not infer capabilities from the
version string. Ignore unknown capability strings, result fields, and event names.

## End-to-end flow

### 1. List versions

```json
{"jsonrpc":"2.0","id":3,"method":"version.list","params":{}}
```

The result is an array of official manifest entries. Choose an exact `id`.

### 2. Create an instance

```json
{"jsonrpc":"2.0","id":4,"method":"instance.create","params":{
  "name":"Survival",
  "minecraft_version":"1.21.1"
}}
```

The result includes the generated `id`:

```json
{"id":"instance-8f14...","name":"Survival","minecraft_version":"1.21.1", "...":"..."}
```

### 3. Start an install

```json
{"jsonrpc":"2.0","id":5,"method":"instance.install","params":{
  "instance_id":"instance-8f14..."
}}
```

```json
{"task_id":"5b0d...","status":"queued"}
```

The daemon returns immediately. Follow the task with events.

### 4. Follow task events

```json
{"jsonrpc":"2.0","id":6,"method":"task.events","params":{
  "task_id":"5b0d...",
  "after_sequence":0,
  "wait_ms":30000
}}
```

The result is an array of events:

```json
[
  {"task_id":"5b0d...","sequence":1,"timestamp":"2026-11-19T00:00:00Z","event":"task.queued","data":{}},
  {"task_id":"5b0d...","sequence":2,"timestamp":"2026-11-19T00:00:01Z","event":"task.started","data":{}}
]
```

Persist the highest sequence and pass it as `after_sequence` on the next call. An empty array means
the long-poll timed out. Check `task.get` for a terminal status:

```json
{"jsonrpc":"2.0","id":7,"method":"task.get","params":{"task_id":"5b0d..."}}
```

### 5. Prepare Java

Check for a compatible system runtime:

```json
{"jsonrpc":"2.0","id":8,"method":"java.detect","params":{"minimum_major":21}}
```

Or provision Mojang's runtime for the installed version:

```json
{"jsonrpc":"2.0","id":9,"method":"java.runtime.install","params":{
  "minecraft_version":"1.21.1"
}}
```

This also returns a task handle; follow it through the same event flow.

### 6. Launch offline

```json
{"jsonrpc":"2.0","id":10,"method":"launch.start","params":{
  "instance_id":"instance-8f14...",
  "username":"Steve",
  "offline_mode":true
}}
```

Optional launch fields include `account_id`, `java_path`, `memory`, `resolution`, `fullscreen`,
`extra_jvm_args`, and `extra_game_args`. Online mode is rejected.

The result is a `GameProcess` with `process_id`, `pid`, and `status`.

### 7. Follow the process

```json
{"jsonrpc":"2.0","id":11,"method":"process.status","params":{"process_id":"c0f1..."}}
```

Poll `process.status` or `process.list`. There is no process event stream. Stop with:

```json
{"jsonrpc":"2.0","id":12,"method":"process.stop","params":{"process_id":"c0f1..."}}
```

## Python example

This example uses a Unix socket and the Python standard library. It assumes `umcd` is running with the
same data directory.

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

Use a unique request ID per connection. Keep the socket private; it is part of the local control
boundary.

## Reconnection

- Task records and event history persist under `tasks/`.
- After a daemon restart, unfinished tasks become `interrupted`; re-run the operation.
- Process records are reconciled on startup and during `process.list` / `process.status`.
- A still-running process can be stopped with `process.stop`; the marker check prevents PID reuse
  mistakes.
- Reconnect and request `task.events` with your last persisted sequence.

## Error handling

- Reserved JSON-RPC errors: `-32700` parse, `-32600` invalid request, `-32601` unknown method,
  `-32602` invalid params, `-32603` internal.
- UMC server errors use `-32000..-32099`; the mapping is provisional during 0.x.
- Treat any error response as a failed call. Display a user-facing message and keep the code for
  logging.
- Cancellation is not an error: inspect the task status instead.

## Concurrency

Use one control surface for mutations on the same instance. The daemon and CLI do not share an
in-process instance lock. Starting the same install through both can race.

## Related

- [RPC v1 reference](../reference/rpc-v1) — every method, event, and current limitation.
- [Integration guide](./) — choosing a transport.
- [Tasks and the local daemon](../guide/tasks-and-daemon) — user-facing daemon behavior.
