# Architecture

UMC is a headless launcher engine. Community applications own the interface and product decisions;
Core owns launcher operations and their persistent state.

## Product boundary

```text
GUI / scripts ── Rust SDK ──┐
GUI / scripts ── JSON-RPC ──┼── umc-core ── OS, filesystem, HTTPS
Terminal ─────── CLI ───────┘
```

- `umc-core` is the only implementation of launcher behavior.
- The SDK, CLI, stdio adapter, and daemon are adapters over Core.
- UMC does not bundle Minecraft or operate a hosted account service for the launcher. Microsoft
  sign-in is implemented locally in the launcher Core. The separate optional UMC Auth service is
  community-operated and provides Yggdrasil-compatible accounts; it does not authenticate Microsoft
  accounts or verify Minecraft ownership.
- UMC does not expose arbitrary shell execution.

## Workspace

| Crate | Responsibility |
|---|---|
| `umc-api` | Stable serializable contracts: requests, instances, tasks, processes, Java info, error kinds |
| `umc-core` | Application services: version metadata, downloads, instances, Java, launch, process supervision, tasks, daemon dispatch |
| `umc-sdk` | Typed Rust facade; calls the same RPC dispatcher in-process or through the daemon |
| `umc` | CLI and newline-delimited stdio JSON-RPC adapter |
| `umcd` | Local Unix socket / Windows named pipe JSON-RPC host |
| `umc-loader-api` | Loader discovery and preflight contract |
| `umc-loader-fabric` | Fabric Meta adapter |
| `umc-loader-forge` | Forge Maven metadata and installer artifact adapter |
| `umc-loader-neoforge` | NeoForge Maven metadata and installer artifact adapter |
| `umc-loader-registry` | Built-in and host-registered adapter composition |

Loader crates depend on `umc-loader-api` and upstream metadata sources. They do not depend on Core,
RPC, or GUI code.

## Core modules

```text
umc-core/src/
  lib.rs       # UmcCore, RPC dispatch, version manifest cache
  engine.rs    # downloads, install, instances, Java, launch, process records
  tasks.rs     # persistent tasks, events, cancellation, concurrency limits
  daemon.rs    # local IPC accept loop and connection handling
```

### Dispatch

Every surface enters through a JSON-RPC request. The SDK builds an `RpcRequest` and calls
`UmcCore::dispatch` directly when running in-process, or sends the same envelope to `umcd`. This
keeps SDK and RPC behavior aligned.

`system.info` advertises the Core version and API version. `system.capabilities` is the feature
discovery mechanism; clients must not infer capabilities from the crate version.

## Install pipeline

```text
instance.install
  ├─ read instance.json; reject loader instances
  ├─ fetch the official version manifest (1 hour cache)
  ├─ download and verify versions/<v>/<v>.json
  ├─ download and verify versions/<v>/<v>.jar
  ├─ for each allowed library:
  │    ├─ download artifact; verify SHA-1 and size
  │    ├─ download platform natives when present
  │    └─ extract natives under natives/<v>/
  ├─ download the asset index
  ├─ deduplicate asset objects by hash and download them
  ├─ materialize virtual assets for legacy versions when required
  ├─ download the logging configuration
  └─ write instances/<id>/install.json
```

Downloads:

- HTTPS only; redirects must remain HTTPS.
- 15-second connect timeout.
- 45-second stall timeout for metadata and each download read.
- Up to three attempts per file.
- Existing files are verified before being reused.
- A partial `.part-*` file is removed on failure or cancellation.
- A maximum of 32 file downloads run at once across tasks.
- Client, library, asset, log, and runtime files are checked by SHA-1; size is checked when the
  metadata provides it.

Platform rules currently consider the OS name and feature flags. The OS `arch` and `version`
conditions are not yet evaluated; this is a known limitation for some platform-specific libraries.

## Launch pipeline

```text
launch.start (offline_mode must be true)
  ├─ validate the offline username
  ├─ read instance.json; reject loader instances
  ├─ read install.json and version metadata
  ├─ determine required Java major and Mojang component
  ├─ choose a compatible managed runtime, then system Java
  ├─ validate memory and resolution
  ├─ build JVM arguments from official rules and substitutions
  ├─ build game arguments from official arguments or legacy minecraftArguments
  ├─ open instances/<id>/logs/umc-console.log
  ├─ spawn the game with stdin closed
  ├─ write processes/<process-id>.json
  └─ monitor the child until exit
```

Offline identity uses the standard `OfflinePlayer:<username>` MD5 derivation with RFC 4122 version
and variant bits. The access token is `offline`, the user type is `legacy`, and the version type is
`UMC`.

The classpath in `install.json` stores absolute paths. Moving the data directory requires re-running
install for each instance so the launch context is refreshed.

## Instance storage and recovery

Each instance has:

```text
instances/<id>/
  instance.json
  install.json
  game/
  logs/umc-console.log
```

`instance.json` schema version 1 stores:

- generated instance ID,
- display name,
- Minecraft version,
- optional loader descriptor (reserved),
- Java selection hint (reserved in this release),
- memory limits in MiB,
- game directory relative to the data root.

Write and recovery behavior:

- Writes use a synced temporary file and atomic rename.
- The previous valid configuration is retained as `instance.json.bak`.
- Legacy schema version 0 is migrated on read.
- A corrupt primary is quarantined as `instance.json.corrupt-<uuid>`.
- Repair restores a valid backup or rebuilds from a validated install record.
- Game data is never modified by configuration repair.

## Task engine

Tasks provide durable operation state:

```text
tasks/<task-id>.json
tasks/events/<task-id>.jsonl
```

- Per-task events have monotonically increasing sequences and UTC timestamps.
- Cancellation is cooperative; partial downloads are removed.
- Tasks time out after a caller-selected deadline, up to six hours.
- At most two operations and 32 file downloads run concurrently.
- On daemon startup, unfinished tasks become `interrupted`.
- Completed task results and event history remain queryable.

The task manager lives in the process that started the task. The CLI's install commands run tasks
in-process and wait; the daemon runs tasks independently of clients and persists them for
reconnection.

## Java resolution

1. Read `javaVersion.majorVersion` and `javaVersion.component` from version metadata.
2. Prefer a managed runtime whose component matches and whose major version is new enough.
3. Fall back to system Java from `JAVA_HOME` and `PATH`.
4. Fail with an explicit required-major error if nothing compatible is found.

Managed runtimes are installed from Mojang's runtime catalog. The catalog manifest and every runtime
file are hash-verified, and the downloaded Java is executed once to confirm its major version.

## Process supervision

A launched game is tracked by a UMC process ID and OS PID. The command line includes
`-Dumc.process_id=<process-id>`.

- `process.status` and `process.list` reconcile saved PIDs against that marker.
- `process.stop` verifies the marker before signaling, preventing recycled-PID kills.
- Unix uses `SIGTERM`; Windows terminates the verified process tree.
- If the supervisor is gone, a later reconciliation marks an exited process with `exit_code: null`.
- Corrupt process records fail closed.

## Loader adapters

`umc-loader-api` defines:

- `LoaderAdapter` with `id`, `list_versions`, and `plan_install`.
- `LoaderId`, `LoaderVersion`, `LoaderInstallRequest`.
- `LoaderInstallPlan` and `LoaderInstallStrategy`.

The built-in registry composes Fabric, Forge, and NeoForge adapters. Rust hosts may register
trusted in-process adapters. Adapters only discover metadata and produce plans; Core does not yet
execute loader installs or merge loader launch metadata.

## Error boundaries

- `umc-api` defines stable error categories.
- JSON-RPC reserved codes are used for protocol errors; UMC-specific codes are provisional until
  1.0.
- Internal Rust error strings are not stable protocol codes.
- SDK methods return `Result<T, String>` for diagnostics; applications should map them to their own
  error types.

## Security boundaries

- All managed paths are canonicalized and confined beneath the selected data root.
- Symbolic links are rejected at managed paths.
- Downloads require HTTPS.
- The daemon uses local-only IPC:
  - Unix socket mode `0600` under a data directory mode `0700`.
  - Windows named pipe with an owner-only ACL and remote clients rejected.
  - No TCP listener.
- RPC does not offer arbitrary shell execution.
- Only the Microsoft refresh token is persisted, in the OS keyring or a `0600` fallback file. Microsoft, Xbox, XSTS, and Minecraft access tokens are never written to instance JSON or logs.

## Concurrency

- In-process instance locks serialize operations for one instance inside one process.
- Task and download semaphores bound global concurrency inside one process.
- The CLI and daemon are separate processes and do not share those locks.
- Use one control surface for mutations on the same instance.

## Known limitations

- Loader installation and launch are paused after version discovery and install preflight; they are
  not implemented. Online launch is vanilla-only.
- Mod, modpack, and resource-pack management are not implemented.
- Windows and macOS are not in the validated release target.
- OS architecture and version rule conditions are not evaluated.
- `install.json` stores absolute classpath paths.
- Downloads restart per attempt rather than resuming.
- Game logs are not rotated.
- The daemon is local-only; there is no remote authentication or authorization layer.

## Future modules

Microsoft sign-in and vanilla online launch are implemented. Loader execution and version merging
are paused after discovery and preflight. Planned work includes mod distribution, platform ports,
and a more complete public API. Interfaces should be introduced where a real alternate
implementation is needed, not preemptively across every function.
