# Launching and processes

UMC launches Minecraft: Java Edition with either an explicit offline identity or a signed-in
Microsoft account. This page describes both launch modes, the arguments UMC adds, process
supervision, logs, and stopping a game.

::: warning Offline mode

Offline mode does not verify account ownership and does not enable authenticated multiplayer. Only
online mode signs in with a Microsoft account and obtains a Minecraft session. Use offline mode for
local testing, not as an account login.

:::

## Launch an installed instance

Online:

```sh
umc auth login
umc launch <instance-id> --online
```

Offline:

```sh
umc launch <instance-id> --offline Steve
```

- The instance must be installed first with `umc instance install`.
- `--online` refreshes the selected account's session silently and launches authenticated play.
- `--offline` requires a username of 1–16 ASCII letters, digits, or underscores.
- With multiple saved accounts, pass `--account <account-id>` to choose one.
- The CLI waits for the game to exit and prints a final status JSON.

The command prints the initial process record, then polls every second until the status becomes
`exited` or `failed`.

## Online launch

Sign in once:

```sh
umc auth login
```

This opens Microsoft's sign-in page, completes the Xbox Live, XSTS, and Minecraft login chain, and
stores only the refresh token. Later launches use that token without opening a browser:

```sh
umc launch <instance-id> --online
umc launch <instance-id> --online --account <account-id>
```

The game receives:

```text
--username      <Minecraft profile name>
--uuid          <Minecraft profile UUID without dashes>
--accessToken   <Minecraft access token>
--clientId      <UMC OAuth client ID>
--xuid          <Xbox user ID>
--userType      msa
--versionType   UMC
```

A fresh Minecraft access token is requested on every online launch, so the saved refresh token is
the only long-lived credential. See [Account management](./user-guide#microsoft-account) for
`status`, `refresh`, and `logout`.

### Token handling

- Microsoft and Minecraft tokens are never printed, written to instance configuration, or included
  in process records.
- The refresh token is stored in the OS keyring when available, otherwise in a `0600` file under
  `UMC_DATA_DIR/credentials/`.
- Minecraft requires the access token on the command line, so it is visible in the local process
  list while the game runs. This is inherent to the vanilla client and applies to every launcher.
- `umc auth logout` deletes the stored credential.

## Offline identity

UMC derives a deterministic offline UUID from the username, matching Minecraft's standard offline
profile derivation (`OfflinePlayer:<username>` with the RFC 4122 version and variant bits set). The
game is launched with:

```text
--accessToken offline
--userType legacy
--versionType UMC
```

Player data is keyed by that UUID. Changing the offline username creates a different player
identity and a separate player data set in the game directory.

## What UMC passes to Minecraft

The launcher assembles the command from the official version metadata:

- Version metadata and client JAR under `versions/<version>/`.
- A classpath from the verified libraries plus the client JAR.
- `-Djava.library.path` pointing at extracted natives.
- `-Dumc.process_id=<process-id>` for process identity checks.
- `-Xms` / `-Xmx` from the instance memory configuration.
- `--username`, `--version`, `--gameDir`, `--assetsDir`, `--assetIndex`, `--uuid`,
  `--accessToken`, `--userType`, and `--versionType`.
- `--xuid` and `--clientId` when the selected game version includes them; online launch fills them
  from the Xbox identity and UMC's OAuth client ID.
- The official JVM and game arguments, with platform and feature rules applied.
- The official logging configuration, when the version provides one.

The process working directory is the instance's `game/` directory. UMC writes game stdout and
stderr to the instance console log.

## Memory

The instance defaults to 1024 MiB initial and 4096 MiB maximum heap. The CLI launch command uses the
instance configuration and does not expose a memory flag.

SDK and JSON-RPC clients can override memory per launch through `LaunchRequest.memory`, along with
resolution, fullscreen, extra JVM arguments, extra game arguments, and an explicit Java path. See
[JSON-RPC v1](../reference/rpc-v1).

## Process lifecycle

A launched game is recorded as a `GameProcess`:

```json
{
  "process_id": "c0f1f0e8-9c7b-4a43-9f3b-3f6e0f6e6d1a",
  "instance_id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "pid": 48231,
  "status": "running",
  "started_at": "2026-11-19T00:00:00Z",
  "exit_code": null
}
```

Statuses:

| Status | Meaning |
|---|---|
| `starting` | Record exists but the process is not yet confirmed running |
| `running` | The game process is alive |
| `exited` | The process ended; `exit_code` may be present |
| `failed` | UMC could not start or monitor the process |

Process records are stored under `processes/<process-id>.json`. The CLI process monitors the child
while it waits. If the control process or daemon exits first, a later `process.list` reconciles the
saved PID against the `-Dumc.process_id` marker. A process that is gone is marked `exited`; its exit
code may be `null` because the original supervisor did not observe it.

## Inspect and stop processes

```sh
umc process list
umc process status <process-id>
umc process stop <process-id>
```

`process stop` verifies the UMC process marker before signaling, so a recycled PID is never killed.
On Unix UMC sends `SIGTERM`. On Windows it terminates the verified process tree.

Prefer quitting from the game menu when possible so the game saves normally. A forced stop may leave
the current world or player data in whatever state the game last saved.

## Logs

Game output is appended to:

```text
instances/<instance-id>/logs/umc-console.log
```

This file contains both stdout and stderr from the game. It is not rotated automatically. It can
contain player names, local paths, server addresses, Java output, and information printed by mods.
Review it before sharing.

Minecraft may also write crash reports and other diagnostics inside the instance's `game/`
directory, typically under `game/crash-reports/`. UMC does not parse or upload crash reports.

UMC does not provide interactive game console input in this release: the game's stdin is closed.
Use the game's own UI and the console log for diagnostics.

## No daemon required

`umc launch` and the `umc process ...` commands use the local data directory directly. They do not
require `umcd`. If you are also running `umcd`, avoid launching the same instance from both control
surfaces at the same time.

## After a daemon restart

Process records survive a daemon or client restart. On startup and during `process.list` /
`process.status`, UMC checks the saved PID against the process marker:

- If the process is still alive, it is reported as `running` and can be stopped.
- If it has exited, it is reported as `exited`, with `exit_code: null` when the exit was not observed.
- Corrupt process records fail closed: UMC will not stop or remove based on an invalid record.

## Related

- [Java runtimes](./java) — how Java is selected for launch.
- [Data, logs, and backups](./data-and-logs) — where logs and process records live.
- [Troubleshooting](./troubleshooting) — launch failures and stuck processes.
