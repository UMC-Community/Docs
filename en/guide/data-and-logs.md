# Data, logs, and backups

UMC keeps all managed state beneath one data directory. This page describes what is stored there,
which files are safe to delete, and how to back up or move the directory.

## Choosing the data directory

Set `UMC_DATA_DIR`:

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umc version list
```

If `UMC_DATA_DIR` is unset, development builds use `./umc-data` relative to the current working
directory. Use an absolute path if commands are run from different directories.

The daemon and every client must use the same data directory.

## Directory layout

```text
<data>/
  cache/
    version_manifest_v2.json       # official version list, cached for one hour
  versions/
    <minecraft-version>/
      <minecraft-version>.json     # official version metadata
      <minecraft-version>.jar      # client JAR
  libraries/                       # verified library artifacts
  assets/
    indexes/<index-id>.json        # asset index
    objects/<xx>/<sha1>            # content-addressed asset objects
    virtual/<index-id>/...         # extracted virtual assets for legacy versions
  natives/<minecraft-version>/     # extracted native libraries
  runtimes/
    <component>/<version>/
      umc-runtime.json             # verification marker
  instances/
    <instance-id>/
      instance.json                # instance configuration
      install.json                 # resolved launch context
      game/                        # game directory
      logs/umc-console.log         # game stdout and stderr
  tasks/
    <task-id>.json                 # task status and result
    events/<task-id>.jsonl         # sequenced event history
  processes/
    <process-id>.json              # game process state
  accounts/
    <account-id>.json              # non-secret account metadata
    default                        # default account ID
  credentials/
    <account-id>.json              # refresh-token fallback (0600, no keyring)
  umc.sock                         # Unix daemon socket (when umcd is running)
```

When the OS keyring is available, refresh tokens live there instead of `credentials/`.

On Windows the daemon uses a named pipe instead of `umc.sock`.

## What you can delete

| Path | Safe to delete? | Effect |
|---|---|---|
| `cache/` | Yes, when no install is running | Manifest is fetched again |
| `versions/`, `libraries/`, `assets/`, `natives/` | Not recommended | Shared downloads are lost; reinstall re-downloads them |
| `runtimes/` | Use `umc java remove` | Managed Java runtimes are lost |
| `instances/<id>/game/` | Only via removal | Saves, options, screenshots, and world data are lost |
| `instances/<id>/logs/` | Yes, when no game is running | Console history is lost |
| `tasks/` | Not recommended while tasks are active | Task history and recovery state are lost |
| `processes/` | Not recommended | Process reconciliation state is lost |
| `accounts/`, `credentials/` | Use `umc auth logout` | Stored sign-in state is removed |
| `umc.sock` | Only when no daemon is running | A stale socket can be removed; the daemon recreates it |

Do not delete `instance.json` or `install.json` by hand. Use `umc instance repair` or reinstall.

## Logs and diagnostics

### Game console log

```text
instances/<instance-id>/logs/umc-console.log
```

This is an append-only file containing the game's stdout and stderr. It is not rotated. It can
contain player names, local paths, server addresses, Java output, and mod output.

### Task records and events

```text
tasks/<task-id>.json
tasks/events/<task-id>.jsonl
```

Task records contain operation names, timestamps, progress, results, and errors. Event history is
newline-delimited JSON with monotonically increasing sequence numbers. It can contain download URLs
and local paths.

### Process records

```text
processes/<process-id>.json
```

Process records contain the UMC process ID, instance ID, OS PID, status, start time, and exit code
when known.

### Crash reports

Minecraft may write crash reports under the instance's game directory, typically
`instances/<instance-id>/game/crash-reports/`. UMC does not parse, upload, or delete them.

## Backup

1. Stop game processes.
2. Stop `umcd` if it is running.
3. Copy the entire data directory to a safe location.

```sh
umc process list
# stop any running process with umc process stop <process-id>
# stop umcd with Ctrl+C
cp -a "$UMC_DATA_DIR" "$HOME/umc-backup"
```

A backup taken while a download or game is running may contain partial or inconsistent state.

::: warning Credentials in backups

If UMC is using the file credential fallback, `credentials/` inside the backup contains the
Microsoft refresh token. Store the backup privately, or run `umc auth logout` before copying and
sign in again after restoring.

:::

## Restore

1. Stop UMC processes and the daemon.
2. Restore the directory to the same absolute path.
3. Start `umcd` or run a command with `UMC_DATA_DIR` pointing at it.

If you restored to a **different absolute path**, re-run install for each instance:

```sh
umc instance install <instance-id>
```

`install.json` stores absolute classpath paths from the original location. Re-running install
rewrites it for the new data directory. `instance.json` stores the game directory relative to the
data root, so it moves correctly.

## Permissions and privacy

The daemon secures the data directory to owner-only access on startup. Keep it that way:

- Do not make the directory world-writable.
- Do not share the daemon socket or named pipe.
- Review logs and task records before attaching them to an issue.
- UMC does not operate a telemetry endpoint or remote management service.

## Disk usage

Game versions, libraries, assets, and Java runtimes are the largest consumers. Multiple instances
share these files. There is no automatic garbage collector in this release; if you need to reclaim
space, remove unused instances and runtimes with UMC commands, then remove shared downloads only
after confirming no instance needs them.

## Related

- [Instances](./instances) — instance-level files and repair.
- [Tasks and the local daemon](./tasks-and-daemon) — task and event semantics.
- [Troubleshooting](./troubleshooting) — recovery from corrupt or missing state.
