# CLI reference

The `umc` binary is a thin command-line adapter over the same Core used by the Rust SDK and the
local daemon. Commands write machine-readable JSON to stdout unless noted otherwise; progress and
diagnostics go to stderr.

## Global conventions

| Item | Behavior |
|---|---|
| Data directory | `UMC_DATA_DIR` if set; otherwise `./umc-data` relative to the current directory |
| Output | Pretty-printed JSON on stdout for most commands |
| Progress | Install progress and task notices on stderr |
| Errors | Non-zero exit status; the error message is printed by the CLI |
| Configuration file | None; the data directory is selected by environment variable |
| Shell execution | UMC does not expose arbitrary shell execution |
| Online mode | Available with `--online`; requires `umc auth login` |

Most commands do not require `umcd`. The exception is `umc task ...`, which connects to the local
daemon. See [Tasks and the local daemon](./tasks-and-daemon) for the distinction.

## Command summary

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

## Version commands

### `umc version list`

Fetches the official Mojang version manifest and prints one version ID per line. The manifest is
cached for one hour under `cache/version_manifest_v2.json`.

```sh
umc version list | head
```

```text
1.21.11
1.21.10
1.21.9
...
```

Version IDs are case-sensitive and must match the official manifest.

## Instance commands

### `umc instance create <name> <minecraft-version>`

Creates an isolated instance and prints its `InstanceConfig` as JSON. The generated ID has the form
`instance-<32 hex characters>`. The game directory is created immediately.

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

- `name`: 1–128 characters, not blank.
- `minecraft_version`: must exist in the official manifest.
- Default memory: 1024 MiB initial, 4096 MiB maximum.
- The current CLI does not accept a loader, memory override, or Java selection at creation time.

### `umc instance list`

Prints all readable instance configurations as a JSON array. If a configuration is unrecoverable,
the command reports an error instead of silently hiding the directory.

### `umc instance get <instance-id>`

Prints one instance configuration.

### `umc instance install <instance-id>`

Downloads the client JAR, version metadata, libraries, natives, assets, and logging configuration,
then writes `instances/<id>/install.json`. The command waits for the task and prints a JSON result
when it finishes. Progress is written to stderr.

```sh
umc instance install instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204
```

The operation is idempotent: files that already match their expected SHA-1 and size are reused, so
re-running install repairs missing or corrupt files. Loader instances are rejected by the current
vanilla installer.

### `umc instance repair <instance-id>`

Repairs only the **instance configuration**, not the game files:

1. If `instance.json` is valid, it is returned unchanged.
2. If a valid backup exists and the primary is corrupt, the backup is used.
3. If no backup is usable, the configuration is rebuilt from a validated install record and version
   metadata.

Game data is preserved. If neither a valid backup nor a valid install record exists, repair fails.

### `umc instance remove <instance-id>`

Removes the instance directory and its configuration. The command refuses to continue when a game
process for that instance is running, or when process state cannot be validated. Use
`umc process stop <process-id>` first.

## Java commands

### `umc java detect [minimum-major]`

Checks Java from `JAVA_HOME` and then each `PATH` entry. `minimum-major` defaults to `8`.

```sh
umc java detect 21
```

The result includes `path`, `major_version`, `vendor_version`, `compatible`, and `required_major`.
If only an incompatible Java is found, it is returned with `compatible: false` so the caller can
explain the required version.

### `umc java runtimes`

Lists verified Mojang runtimes managed under `runtimes/`. A runtime is listed only when its
`umc-runtime.json` marker exists and the bundled Java still reports the expected version.

### `umc java install <minecraft-version>`

Provisions the Mojang runtime required by an **already installed** Minecraft version:

1. Reads `versions/<version>/<version>.json`.
2. Reads the required Mojang runtime component and major version.
3. Downloads the runtime catalog and verifies the runtime manifest by SHA-1.
4. Downloads every runtime file and verifies its SHA-1 and size.
5. Runs the downloaded Java and checks its major version.
6. Writes `runtimes/<component>/<version>/umc-runtime.json`.

The CLI waits for the task. Supported components are `java-runtime-alpha`, `java-runtime-beta`,
`java-runtime-gamma`, `java-runtime-delta`, and `jre-legacy`. If the version metadata requires a
different component, install Java through your system package manager instead.

```sh
umc instance install <instance-id>
umc java install 1.21.1
```

### `umc java remove <runtime-id>`

Removes a managed runtime directory. Stop any game process using that runtime first. The runtime ID
has the form `component@version`, for example `java-runtime-delta@21.0.5`.

## Task commands

`umc task ...` talks to the local daemon. Start `umcd` with the same `UMC_DATA_DIR` first.

### `umc task get <task-id>`

Prints the task status, latest progress, result or error, and latest event sequence.

### `umc task cancel <task-id>`

Requests cancellation of a queued or running task. The task moves to `cancelled` when the operation
observes the request. Partial download files are removed.

### `umc task events <task-id> [after-sequence]`

Prints persisted events after the given sequence number (default `0`). The CLI waits up to one
second for new events; the JSON-RPC method supports longer long-polls.

## Process commands

Process commands operate on the local data directory directly and do not require `umcd`.

### `umc process list`

Reconciles and prints persisted process states. A process whose OS PID no longer matches the UMC
process marker is shown as exited.

### `umc process status <process-id>`

Prints the reconciled state and exit code when known.

### `umc process stop <process-id>`

Verifies the `-Dumc.process_id` marker before sending a termination signal. On Unix UMC sends
`SIGTERM`; on Windows it terminates the verified process tree. A stale or recycled PID is never
signaled.

## Auth commands

### `umc auth login [--no-browser] [--redirect-uri <uri>]`

Starts the Microsoft OAuth flow with PKCE and a loopback callback. By default UMC opens the
authorization URL in the default browser. `--no-browser` prints the URL instead. After the callback,
UMC completes Xbox Live, XSTS, and Minecraft login and saves only the refresh token.

```sh
umc auth login
umc auth login --no-browser
```

The command prints the account name and UUID. Tokens are never printed.

### `umc auth status`

Prints the credential backend (`keyring` or `file`), the default account, and all saved accounts as
JSON. No network request is made.

### `umc auth accounts`

Prints the saved account metadata as a JSON array.

### `umc auth refresh [--account <account-id>]`

Renews the selected account's Minecraft session using the stored refresh token. No browser is
opened. With multiple accounts, select one with `--account`.

### `umc auth logout [--account <account-id>]`

Deletes the stored refresh token and account metadata for the selected account. It does not change
the Microsoft account or Minecraft profile.

## Launch command

### `umc launch <instance-id> --online [--account <account-id>]`

Renews the selected Microsoft account's session and launches Minecraft with an authenticated
identity, then waits for the game to exit.

```sh
umc auth login
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --online
```

### `umc launch <instance-id> --offline <username>`

Starts Minecraft in explicit offline mode, then waits for the game to exit. The username must be
1–16 ASCII letters, digits, or underscores.

```sh
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --offline Steve
```

- The instance must be installed.
- Choose exactly one of `--online` or `--offline`.
- The CLI launch command does not expose memory, resolution, fullscreen, JVM argument, or Java path
  overrides. Those fields are available through the JSON-RPC `launch.start` method and the Rust SDK.

See [Launching and processes](./launching) for argument details, logs, and process behavior.

## RPC and daemon

### `umc rpc --stdio`

Runs the newline-delimited JSON-RPC adapter on stdin/stdout. Diagnostics belong on stderr. This
mode is intended for a GUI or another process that wants to manage a child `umc` process.

### `umcd`

Starts the local JSON-RPC daemon using the same `UMC_DATA_DIR` as clients. On Unix it binds
`<data>/umc.sock`; on Windows it creates `\\.\pipe\umc`. It does not open a TCP port. See
[Tasks and the local daemon](./tasks-and-daemon) and the [RPC v1 reference](../reference/rpc-v1).

## Exit status

Successful commands exit with status `0`. Invalid arguments, missing resources, network failures,
integrity failures, and task failures produce a non-zero exit status. Inspect the printed error and
the relevant task or process record for details.
