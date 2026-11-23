# Integration guide

UMC is a headless launcher engine. Your application owns the interface, accounts, and product
experience; UMC owns version discovery, downloads, instances, tasks, Java, launch, and process
state.

The CLI, Rust SDK, stdio adapter, and local daemon all delegate to the same `umc-core`
implementation. The SDK calls the same JSON-RPC contract in-process, so behavior is consistent
across surfaces.

## Choose an integration surface

| Surface | Best for | Lifecycle | Task behavior | Process supervision |
|---|---|---|---|---|
| Rust SDK, in-process | Rust applications that want typed calls and no extra process | Tied to your process | Tasks run in-process | Your process must stay alive |
| Rust SDK, `connect_daemon` | Rust applications that need long-lived tasks or process supervision | Independent daemon | Persisted, reconnects | Daemon supervises |
| JSON-RPC over `umcd` | Cross-language GUIs, background installs, reconnection | Independent daemon | Persisted, reconnects | Daemon supervises |
| JSON-RPC over `umc rpc --stdio` | Sandboxed child processes, simple request/response integrations | Child process | Tasks live in the child | Child lifetime |
| CLI | Shell automation, scripts, manual operations | Per command | CLI install commands wait; `umc task` requires daemon | Per command |

Recommendations:

- **Rust desktop app:** start with the in-process SDK. Switch to `connect_daemon` when installs must
  survive UI restarts or when multiple windows/processes need one control point.
- **Cross-language GUI:** run `umcd` and use the local JSON-RPC daemon. This is the only surface
  designed for long-lived background tasks and process reconnection.
- **Untrusted or sandboxed plugin:** run `umc rpc --stdio` as a child process and keep the data
  directory outside the plugin sandbox.
- **Automation:** use the CLI. Do not parse stderr to discover task state; use the daemon and RPC
  events for structured progress.

## Shared contract

All integration surfaces share:

- `umc-api` data contracts such as `InstanceConfig`, `LaunchRequest`, `GameProcess`, `TaskInfo`, and
  `TaskEvent`.
- JSON-RPC method names and result shapes. The SDK uses the same envelope internally.
- The same data directory layout and error categories.
- The same instance configuration schema and recovery rules.

### Capability negotiation

Start with:

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
{"jsonrpc":"2.0","id":2,"method":"system.capabilities","params":{}}
```

`system.info` returns the Core version and supported API versions. `system.capabilities` lists the
currently exposed capability strings. Clients must not infer capabilities from the Core crate
version; use `system.capabilities`.

Clients should ignore unknown optional fields and event names so additive changes remain
compatible.

## Recommended GUI lifecycle

```text
1. Select the data directory.
2. Start or connect to umcd.
3. Read system.info and system.capabilities.
4. List versions.
5. Create an instance.
6. Start instance.install and follow task.events.
7. Check Java; install a managed runtime if needed.
8. Check auth.status; run auth.login and follow its task events if the app needs online play.
9. Start launch.start with offline_mode or account_id.
10. Poll process.status until exited or failed.
11. Stop the process or remove the instance when requested.
```

Keep one control surface for mutations. The CLI and daemon do not share an in-process instance lock;
do not start the same install through both at once.

## Task integration

Install methods return a task handle:

```json
{"task_id":"5b0d...","status":"queued"}
```

Use `task.events` instead of parsing stderr:

```json
{"jsonrpc":"2.0","id":10,"method":"task.events","params":{
  "task_id":"5b0d...","after_sequence":0,"wait_ms":30000}}
```

The response is an array of events with a monotonically increasing `sequence`. Persist the last
sequence and reconnect with `after_sequence`. Use `task.get` for the current status and result, and
`task.cancel` to request cancellation.

Handle these terminal states:

- `succeeded` — result is available.
- `failed` — `error` describes the failure.
- `cancelled` — cancellation was observed.
- `interrupted` — the daemon restarted before the task finished; re-run the operation.

See [RPC v1](../reference/rpc-v1) for event names and task semantics.

## Process integration

`launch.start` returns a `GameProcess` immediately. There is no process event stream; poll
`process.status` or `process.list`.

- Use the UMC `process_id`, not the OS PID, in your API.
- `process.stop` verifies the UMC process marker before signaling, so it is safe after reconnects.
- An exit code may be `null` when the original supervisor did not observe the exit.
- Game stdout and stderr go to `instances/<instance-id>/logs/umc-console.log`; UMC does not stream
  them over RPC.

After a daemon restart, process records are reconciled from disk. A still-running process remains
stoppable; a gone process is reported as exited.

## Transport details

### In-process Rust SDK

The SDK creates an `UmcCore` and routes calls through the JSON-RPC dispatcher in-process. It is the
simplest Rust integration and supports in-process loader adapters. Tasks and process supervision are
tied to your process lifetime.

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .build()
    .await?;
```

### Local daemon

`umcd` uses a Unix socket at `<data>/umc.sock` or a Windows named pipe. The data directory is set by
`UMC_DATA_DIR`. The daemon:

- Uses local-only IPC with owner-only permissions.
- Does not open a TCP listener.
- Persists tasks and recovers process state.
- Serves one data directory per daemon.

Keep the data directory private and do not proxy the socket or pipe as a remote service.

### Stdio child process

`umc rpc --stdio` uses newline-delimited JSON-RPC on stdin/stdout. Diagnostics belong on stderr.
The child process owns its tasks and process supervision. This mode is useful when the host wants
process isolation but does not want a persistent daemon.

## Loader adapters

Loader adapters are compiled Rust code. Register them in-process:

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .register_loader(std::sync::Arc::new(MyAdapter::new()))
    .build()
    .await?;
```

UMC does not download or dynamically load provider code. Daemon clients cannot inject adapters;
the daemon host must compile and register them. See [Loader adapters](./loaders).

## Error handling

- JSON-RPC reserved errors use `-32700` through `-32603`.
- UMC server errors use `-32000` through `-32099`; the current mapping is provisional until 1.0.
- The Rust SDK returns `Result<T, String>`; map strings to user-facing messages in your application.
- Do not display raw internal errors without context, and never treat an error string as a stable
  protocol code.

## Concurrency and locking

UMC serializes operations inside one process and bounds install and download concurrency. It does
not provide a cross-process lock for the CLI and daemon. If your application can run both, coordinate
mutations yourself or use only the daemon.

## Compatibility

- Rust crates use SemVer. Before 1.0, breaking API changes require a new minor version.
- JSON-RPC `v1` is advertised by `system.info`; additive fields and events are compatible.
- `InstanceConfig` carries its own `schema_version`; migrations are part of the storage contract.
- Do not infer capabilities from the Core version.

## Attribution and redistribution

UMC is licensed under MIT. Preserve its copyright and license text when redistributing UMC or
substantial portions of it. Include the license in application packages, such as in a `licenses/`
folder or an About/Legal screen.

“Powered by UMC Core” is an optional community credit, not an MIT requirement. Do not imply that
UMC endorses the integrating application. See the [Terms of Service](../about/terms) and
[Privacy Policy](../about/privacy).

The integrating application remains responsible for documenting its own telemetry, network
requests, account handling, and privacy practices.

## Next steps

- [Rust SDK](./sdk) — typed in-process and daemon-backed integration.
- [JSON-RPC client guide](./rpc-client) — end-to-end request examples.
- [Architecture](./architecture) — Core boundaries and pipelines.
- [RPC v1 reference](../reference/rpc-v1) — canonical method and event contract.
