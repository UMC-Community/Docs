# UMC JSON-RPC v1

Transport: newline-delimited JSON over the child's stdin/stdout (`umc rpc --stdio`). One request per line; one response per request with an `id`. Diagnostics belong on stderr. Notifications without IDs are ignored and produce no response.

## Envelope

```json
{"jsonrpc":"2.0","id":1,"method":"system.info","params":{}}
```

Success:

```json
{"jsonrpc":"2.0","id":1,"result":{"name":"UMC","version":"0.1.0","api_versions":["v1"]}}
```

Errors use JSON-RPC reserved errors `-32700` (parse), `-32600` (invalid request), `-32601` (unknown method), `-32602` (invalid params), `-32603` (internal). UMC server errors use `-32000..-32099`; current mapping: `-32001` internal, `-32003` missing resource/process, `-32005` network/install, `-32007` authentication/session failure, `-32009` instance operation, `-32010` Java/launch. Codes are provisional until 1.0 and must not encode Rust implementation details.

## Methods in scaffold

| Method | Parameters | Result |
|---|---|---|
| `system.info` | `{}` | name, semantic version, supported API versions |
| `system.capabilities` | `{}` | supported capability strings |
| `version.list` | `{}` | array of official manifest entries; network result cached under `cache/version_manifest_v2.json` |
| `version.latest` | `{}` | latest release and snapshot identifiers |
| `instance.create` | `{ "name", "minecraft_version", "memory?" }` | generated instance configuration |
| `instance.list` | `{}` | managed instance configurations |
| `instance.get` | `{ "instance_id" }` | one instance configuration |
| `instance.remove` | `{ "instance_id" }` | removes that instance's private game directory and configuration |
| `instance.repair` | `{ "instance_id" }` | restores a valid backup or reconstructs config from verified installation metadata |
| `instance.install` | `{ "instance_id", "timeout_seconds?" }` | queues the vanilla install and returns a task handle |
| `loader.list` | `{}` | built-in loader adapter IDs |
| `loader.versions` | `{ "loader", "minecraft_version" }` | compatible versions from that loader's metadata source |
| `loader.plan` | `{ "loader", "minecraft_version", "loader_version?" }` | loader-specific preflight plan; does not execute installation |
| `java.detect` | `{ "path?", "minimum_major?" }` | Java runtime details and a `compatible` result for the requested major version |
| `java.runtime.list` | `{}` | verified UMC managed runtimes |
| `java.runtime.install` | `{ "minecraft_version", "timeout_seconds?" }` | queues installation of the Mojang runtime component required by an installed Minecraft version |
| `java.runtime.remove` | `{ "runtime_id" }` | removes a runtime from UMC's managed runtime directory |
| `auth.status` | `{}` | signed-in state, default account, credential backend, storage warning, and saved accounts |
| `auth.accounts` | `{}` | saved account metadata without tokens |
| `auth.login` | `{ "open_browser"?, "redirect_uri"? }` | queues an interactive Microsoft sign-in task and returns a task handle |
| `auth.refresh` | `{ "account_id"? }` | renews the selected account's Minecraft session without a browser |
| `auth.logout` | `{ "account_id"? }` | deletes the selected account's stored refresh token and metadata |
| `launch.start` | `{ "instance_id", "offline_mode", "username"?, "account_id"?, ... }` | starts a game process and returns its UMC process ID and OS PID |
| `process.list` | `{}` | reconciles and lists persisted process states, suitable for reconnect after client/daemon restarts |
| `process.status` | `{ "process_id" }` | reconciled process state and exit code when known |
| `process.stop` | `{ "process_id" }` | identity-checks and stops a managed process, including after daemon reconnection |
| `task.get` | `{ "task_id" }` | task status, latest progress, result, error, and latest event sequence |
| `task.cancel` | `{ "task_id" }` | requests cancellation of a queued or running task |
| `task.events` | `{ "task_id", "after_sequence?", "wait_ms?" }` | returns persisted events after a sequence; `wait_ms` long-polls up to 30 seconds |

## Authentication flow

`auth.login` is a task because it waits for the user to finish a browser flow. It returns a task handle; clients follow `task.events`:

| Event | Data |
|---|---|
| `auth.url` | `{ "url", "redirect_uri" }` — open this URL, or let `open_browser` do it |
| `auth.browser_error` | `{ "error" }` when the browser could not be opened |
| `auth.stage` | `{ "stage" }` — Xbox Live, XSTS, Minecraft login, or profile |
| `task.completed` | `{ "result": { "account": { "id", "name" }, "storage_warning" } }` |

`open_browser` defaults to `false` over RPC so a headless daemon never tries to start a GUI. Clients that can open a browser may pass `true`.

Tokens are never returned over RPC. `auth.status` and `auth.accounts` expose only account IDs, names, timestamps, and the credential backend. Online `launch.start` renews the session internally and passes the token only to the game process.

Launch parameters:

| Field | Meaning |
|---|---|
| `offline_mode: true` | Requires `username`; derives the standard offline UUID and uses `legacy`/`offline` arguments. |
| `offline_mode: false` | Renews the selected account and launches with `msa`, the profile UUID and name, the Minecraft access token, XUID, and UMC's OAuth client ID. `account_id` selects the account; the default is used when omitted. |
| `account_id` | Account UUID. Omit when only one account is saved. |

If the refresh token is rejected, `launch.start` fails with `-32007`, removes the saved credential, and asks the client to run `auth.login` again. If no account is signed in, the same code is returned with a sign-in hint.

## Shared data contracts

`umc-api` defines transport-independent `InstanceConfig`, `LaunchRequest`, `MemoryConfig`, `AuthStatus`, `AccountSummary`, `AuthRefreshResult`, `GameProcess`, `TaskHandle`, and error category types for SDK and RPC adapters. Memory values are MiB. Instance game paths are relative to the managed data root.

## Current limitations

Instance configurations carry `schema_version`. Version 0 files migrate to version 1 on read and the old bytes are retained as `instance.json.bak`. Writes use a synced temporary file and atomic rename. A corrupt primary is quarantined and restored from a valid backup. If no backup remains, `instance.repair` can rebuild the config only when the version metadata and install record agree; game data is preserved. Unrecoverable config errors are surfaced by `instance.list` instead of silently hiding that directory.

The vanilla launch path supports both explicit offline mode and Microsoft-authenticated online mode. Online launch renews the stored refresh token, walks Xbox Live/XSTS/Minecraft services, and passes the resulting session to the game; loader instances still cannot be launched. Managed Java download is opt-in, uses Mojang's runtime catalog, and verifies catalog manifests and each runtime file by SHA-1 and size. Launch prefers a compatible managed runtime for the release's Mojang component, then checks system Java. `java.detect` reports an installed but incompatible Java so clients can explain the required version. Removal refuses running processes and refuses to delete when process state cannot be validated. CLI launch waits for the game to exit; stdout/stderr are written to `instances/<id>/logs/umc-console.log` so they cannot corrupt the stdio RPC stream.

Loader adapters currently provide version discovery and a loader-specific install preflight only. Fabric plans use Fabric Meta's launcher profile; Forge and NeoForge plans identify their own Maven installer artifacts and checksum sidecars. `loader.plan` does not download, execute installers, modify an instance, or make loader instances launchable yet. Custom provider code can be registered by a trusted Rust host; providers are not loaded dynamically and daemon providers must be configured by the daemon host. CurseForge and Modrinth content APIs are separate from loader installation and are not part of these adapters.

## Task semantics

`instance.install` and `java.runtime.install` return `{ "task_id", "status": "queued" }` immediately. Task records and JSONL event history persist below `tasks/`. Events have monotonically increasing per-task `sequence` values, UTC timestamps, and a `data` object. Current event names include `task.queued`, `task.started`, `install.progress`, `download.progress`, `download.retry`, `download.completed`, `task.completed`, `task.failed`, `task.cancelled`, `task.timeout`, and `task.interrupted`.

Tasks default to a six-hour deadline; callers may set `timeout_seconds` from 1 to 21600. Network requests have a 15-second connection timeout, download reads fail after 45 seconds without data, and each file gets up to three attempts. At most two install operations run at once and a shared semaphore limits active file downloads to 32 across tasks. `task.cancel` signals cancellation; downloads remove their partial file before the task reaches `cancelled`. A daemon restart marks unfinished tasks `interrupted`; completed task results and event history remain queryable. Task cancellation is independent of stopping a game process.

## Local daemon transport

Run `umcd` with the same `UMC_DATA_DIR` used by clients. It serves newline-delimited JSON-RPC 2.0 requests: Unix uses `<data-dir>/umc.sock` (socket mode `0600`, data directory mode `0700`); Windows uses `\\.\pipe\umc` with an owner-only ACL and rejects remote clients. The daemon does not bind a TCP port. A request is one JSON object per line and its response is one JSON object per line. `umc-sdk` can connect with `Launcher::builder().data_dir(path).connect_daemon()`.

On startup and `process.list`/`process.status`, UMC checks saved process IDs against a random `-Dumc.process_id=<process-id>` marker added when launching the game. This avoids signaling a recycled PID. `process.stop` verifies that marker before sending SIGTERM on Unix or terminating the verified process tree on Windows. After a daemon crash, process state is recovered from the JSON records; a recovered process that has already exited is marked `exited`, with `exit_code: null` because its prior supervisor did not observe the exit. The Java process and its log file continue independently of the daemon. Corrupt process records fail closed for stop/removal and are reported to clients.


