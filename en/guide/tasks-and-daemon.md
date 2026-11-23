# Tasks and the local daemon

Installing an instance or a Java runtime is a long-running operation. UMC models these operations as
persistent tasks with sequenced progress events.

## Task states

| State | Meaning |
|---|---|
| `queued` | Created and waiting for an execution slot |
| `running` | Actively downloading or preparing files |
| `succeeded` | Finished; a result is available |
| `failed` | Finished with an error |
| `cancelled` | Cancellation was requested and observed |
| `interrupted` | The daemon restarted before the task finished |

Task records are written under `tasks/<task-id>.json` and event history under
`tasks/events/<task-id>.jsonl`.

## Progress events

Events have a per-task, monotonically increasing `sequence`, a UTC timestamp, an event name, and a
data object. Current event names include:

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

Clients should ignore unknown event names and fields for forward compatibility.

## Two execution paths

### CLI path

`umc instance install` and `umc java install` run the operation inside the CLI process. The CLI
prints progress to stderr and waits for the result. Closing the CLI interrupts the operation.

This path is convenient for interactive installs and does not require `umcd`.

### Daemon path

`umcd` keeps the engine alive and lets clients create background tasks, query progress, cancel, and
reconnect. The daemon returns a task handle immediately:

```json
{ "task_id": "5b0d...", "status": "queued" }
```

Task inspection commands use this path:

```sh
umc task get <task-id>
umc task events <task-id>
umc task cancel <task-id>
```

These commands require `umcd` running with the same `UMC_DATA_DIR`. If the daemon is not running,
they fail with a daemon connection error.

Do not run the same install through both the CLI and the daemon at the same time. UMC serializes
operations inside one task manager, but the CLI and daemon are separate processes.

## Timeouts, retries, and concurrency

- Default task timeout: **6 hours**.
- JSON-RPC callers may set `timeout_seconds` from 1 to 21600 (6 hours).
- At most **2 operations** run at once; additional tasks wait in `queued`.
- At most **32 file downloads** run at once across all tasks.
- Each file download gets up to **3 attempts**.
- Metadata requests time out after 45 seconds; connect timeout is 15 seconds.
- A download fails if it does not receive data for 45 seconds.
- Downloads are not resumable across attempts; the file restarts from the beginning.
- Cancellation removes partial download files.

## Cancellation

`task.cancel` requests cancellation. The operation observes the request and moves to `cancelled`.
Cancellation is independent of stopping a game process.

```sh
umc task cancel <task-id>
```

## Recovery after a restart

On startup, `umcd`:

1. Loads persisted tasks.
2. Marks unfinished tasks as `interrupted`.
3. Recovers process records.
4. Removes a stale socket if no daemon is listening.

Completed task results and event history remain queryable. Interrupted installs should be re-run;
files that already match their hashes are reused.

## Start the daemon

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umcd
```

The daemon uses the same `UMC_DATA_DIR` as clients. On Unix it binds:

```text
<data>/umc.sock
```

The data directory is secured to mode `0700` (owner-only), and the socket is set to mode `0600`.
On Windows it creates `\\.\pipe\umc` with an owner-only ACL and rejects remote clients. UMC does not
open a TCP listener.

Only one daemon can serve a data directory. If another daemon is already listening on the socket,
`umcd` exits with an “already running” error.

## Security boundary

The local daemon is a control surface. Keep the data directory private:

- Do not place it in a world-writable or shared directory.
- Do not proxy or expose the socket or named pipe as a remote service.
- Treat task results, process records, and logs as local operational data.

UMC does not provide remote authentication because it does not expose a remote transport in this
release.

## Related

- [JSON-RPC v1](../reference/rpc-v1) — method list, task IDs, and event semantics.
- [Data, logs, and backups](./data-and-logs) — task and event files.
- [Troubleshooting](./troubleshooting) — daemon connection and task recovery errors.
