# Troubleshooting

Start with the exact command output and the relevant log or task record. UMC errors are grouped by
the stage that failed: version metadata, instance configuration, downloads, Java, task state, or
process control.

## Quick diagnosis

| Symptom | Likely cause | First step |
|---|---|---|
| `Unknown Minecraft version` | Version ID typo or not in the official manifest | `umc version list` |
| `Instance is not installed` | Install has not completed | `umc instance install <id>` |
| `No Java runtime found` | No compatible Java on `JAVA_HOME` or `PATH` | `umc java detect <major>`, then `umc java install <version>` |
| `Java ... is incompatible` | Java is older than the version requires | Install a newer managed runtime |
| `Download failed after 3 attempts` | Network, proxy, DNS, or remote service issue | Retry install; check connectivity |
| `SHA-1 mismatch` or `size mismatch` | Corrupt or mistransferred file | Re-run install; check disk/network |
| `Task ... interrupted` | Daemon restarted before the task finished | Re-run the install |
| `Could not connect to UMC daemon` | `umcd` is not running for this data directory | Start `umcd` with the same `UMC_DATA_DIR` |
| `UMC daemon is already running` | One daemon already serves this data directory | Use the existing daemon or stop it first |
| `Stop this instance's game process before removing it` | A game process is still running | `umc process list`, then `umc process stop` |
| `cannot verify process state; refusing` | Corrupt or unsafe process record | Inspect `processes/`; do not delete blindly |
| Corrupt `instance.json` surfaced by `instance list` | Damaged configuration | `umc instance repair <id>` |

## Version and manifest problems

### `Unknown Minecraft version: <id>`

The ID must exactly match an entry in the official version manifest. Run:

```sh
umc version list | grep <id>
```

Version IDs are case-sensitive. Snapshots and older releases are included if they appear in the
manifest.

### `Version missing from official manifest`

The version may have been removed from the manifest, or the cached manifest may be stale. UMC caches
the manifest for one hour under `cache/version_manifest_v2.json`; retry after the cache expires or
remove that cache file while no install is running.

## Instance and configuration problems

### `Instance is not installed; call instance.install first`

The launch command requires `instances/<id>/install.json`. Install the instance:

```sh
umc instance install <instance-id>
```

### Corrupt `instance.json`

`instance.list` reports an unrecoverable configuration instead of hiding the directory. Repair the
configuration:

```sh
umc instance repair <instance-id>
```

Repair uses a valid backup first, then a validated install record and version metadata. A corrupt
primary file is renamed to `instance.json.corrupt-<uuid>` for inspection. Game data is preserved.
If neither a backup nor a valid install record exists, repair cannot proceed; restore from a backup.

### `This installer currently supports vanilla instances only`

The instance has a loader configured, or a loader-specific installation path was used. Loader
installation is not implemented yet. Create a vanilla instance for now.

## Download and integrity problems

### `Download failed after 3 attempts: ...`

UMC retries each file three times. Check:

- Network and DNS access to Mojang/Minecraft download hosts.
- Any corporate proxy or firewall that intercepts HTTPS.
- Available disk space.
- Whether the remote service is temporarily unavailable.

Re-running `umc instance install <id>` reuses files that already match.

### `SHA-1 mismatch`, `size mismatch`, or `size exceeds metadata`

A file on disk or in transit did not match the official metadata. UMC removes the partial download
and reports the error. Re-run the install. If the problem repeats, check for a proxy that modifies
responses, a failing disk, or a corrupted local cache.

### Downloads restart instead of resuming

UMC does not resume a partial file across retry attempts. Each attempt restarts that file and
verifies it before moving it into place. Already-completed files are reused on the next install.

## Java problems

### `No Java runtime found (requires Java N or newer)`

UMC found no usable Java through `JAVA_HOME` or `PATH`. Either:

```sh
umc java install <minecraft-version>
```

or add a compatible Java to `PATH` / `JAVA_HOME` and re-run:

```sh
umc java detect N
```

### `Java X is incompatible with Minecraft Y (requires Java Z or newer)`

An installed Java was found, but it is too old. Install a newer managed runtime:

```sh
umc java install <minecraft-version>
```

or point `JAVA_HOME`/`PATH` at a compatible JDK.

### `Minecraft X is not installed; install it before provisioning Java`

`umc java install` reads the installed version metadata to find the required runtime. Install the
instance first:

```sh
umc instance install <instance-id>
umc java install <minecraft-version>
```

### `Unsupported Mojang Java runtime component` or `No ... runtime for <platform>`

The version requires a runtime component that this release does not provision, or Mojang does not
publish that component for the current platform. Use a system Java that satisfies the version
requirement.

### `Downloaded Java ... is incompatible`

The downloaded runtime failed the major-version check. Remove the runtime and retry:

```sh
umc java runtimes
umc java remove <runtime-id>
umc java install <minecraft-version>
```

If it fails again, use a system Java instead.

## Task and daemon problems

### `Could not connect to UMC daemon`

`umc task ...` commands connect to the local daemon. Start it with the same data directory:

```sh
export UMC_DATA_DIR=/path/to/umc-data
umcd
```

Check that the client and daemon use the same `UMC_DATA_DIR`.

### `UMC daemon is already running`

Only one daemon can serve a data directory. Use the running daemon, or stop it and restart. A stale
socket is removed automatically when no daemon is listening.

### `Task ... interrupted`

The daemon restarted while the task was unfinished. Completed files are reused; re-run the install
or runtime installation. Task results and event history remain under `tasks/` for inspection.

### Task is queued for a long time

At most two operations run at once, and downloads share a 32-slot limit. Wait for the current
operation, or cancel tasks you no longer need with `umc task cancel <task-id>`.

### Task cancellation does not complete immediately

Cancellation is cooperative. The operation checks for cancellation between downloads and during
long transfers. Partial downloads are removed when the task reaches `cancelled`.

## Process problems

### `Stop this instance's game process before removing it`

A process record for the instance is still `running` or `starting`:

```sh
umc process list
umc process stop <process-id>
umc instance remove <instance-id>
```

### `Game process identity could not be verified; refusing to signal the PID`

UMC checks the saved PID against the `-Dumc.process_id` marker before signaling. If the PID was
recycled or the process command line was changed, UMC refuses to signal it. Inspect
`processes/<process-id>.json` and the instance console log. Stop the process manually only if you
are certain it is the intended game process.

### `Corrupt game process state; refusing removal`

A process record could not be parsed. UMC fails closed rather than potentially killing the wrong
process. Inspect the record and back up the data directory before making changes.

### Game exited but status still looks running

Run `umc process status <process-id>` or `umc process list` to reconcile the saved PID. If the
process is gone, it is marked `exited`; `exit_code` may be `null` when the supervisor did not
observe the exit.

## Launch problems

### `Offline launch must be explicitly enabled with --offline`

Add the flag exactly as the final argument:

```sh
umc launch <instance-id> <username> --offline
```

### `Offline username must be 1–16 ASCII letters, digits, or underscores`

Choose a name using only `A–Z`, `a–z`, `0–9`, and `_`, with 1–16 characters. Changing the username
changes the offline UUID and player data identity.

### `Could not start Minecraft: ...`

The Java process could not be spawned. Check that the selected Java exists and is executable, the
instance is installed, and the game directory is writable. Inspect the console log if the process
started but exited immediately.

### Game launches but closes immediately

Check the instance console log:

```text
instances/<instance-id>/logs/umc-console.log
```

Common causes include an incompatible Java version, missing or corrupt files, a failed world load,
or a game-side error. The console log contains the Java stack trace.

### Online multiplayer does not work

Offline mode cannot join servers that require a verified Microsoft account. Sign in first and launch
online:

```sh
umc auth login
umc launch <instance-id> --online
```

If online launch reports that the sign-in expired, the stored refresh token was rejected. Run
`umc auth login` again. If several accounts are saved, pass `--account <account-id>`.

### The keyring is unavailable

UMC prefers the OS keyring and falls back to a `0600` file when the keyring cannot be reached. Use
`umc auth status` to see the active backend and any warning. Set `UMC_CREDENTIAL_STORE=file` to use
the file backend explicitly.

### The browser does not open during login

Run `umc auth login --no-browser` and open the printed URL manually. The callback still returns to a
temporary localhost port, so the machine running UMC must be able to receive that loopback request.

## Platform and scope

### Windows or macOS

The current release target is Linux x86_64. Windows and macOS code paths exist in the repository but
are not part of the validated release target yet.

### Loaders, mods, and modpacks

Loader adapters currently provide version discovery and install preflight plans only. UMC cannot yet
install or launch Fabric, Forge, or NeoForge instances, and it does not manage mods or modpacks.

## Collecting diagnostics

When reporting an issue, include:

- The exact command and its full output.
- `umc version list | head` or the relevant version ID.
- The relevant `instance.json` and `install.json` with sensitive paths redacted.
- The task record and event file for task failures.
- The process record for process failures.
- The tail of `logs/umc-console.log` for game launch failures.
- Your Java version (`java -version`) and platform.

Do not include account credentials or refresh tokens. Logs may still contain personal data.
