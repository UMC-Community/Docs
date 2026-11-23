# Using UMC

UMC is a headless launcher engine for Minecraft: Java Edition. This section explains the everyday
workflow with the `umc` CLI, what UMC writes to disk, and how to recover when something goes wrong.

::: tip Scope of this release

The current Linux x86_64 release supports **vanilla installation**, **offline launch**, and
**Microsoft sign-in for vanilla online launch**. Loader installation, loader online launch, and
modpack management are not implemented yet. Loader work is paused after version discovery and install preflight.

:::

## What you can do today

- Discover official Minecraft Java Edition versions from Mojang metadata.
- Create isolated instances with their own game directory and `instance.json`.
- Download the client, libraries, assets, natives, and logging configuration, checking against
  upstream SHA-1 and size metadata where provided.
- Detect compatible Java, or provision a Mojang-managed runtime for a specific Minecraft version.
- Sign in with a Microsoft account, store a refresh token securely, and launch authenticating
  online sessions without reopening the browser.
- Launch an installed instance in offline mode and supervise the game process.
- Inspect, cancel, and recover install tasks; list and stop game processes.
- Repair instance configuration from a backup or a verified install record.
- Serve the same operations over local JSON-RPC with `umcd`.

## What is not available yet

| Area | Current state |
|---|---|
| Fabric / Forge / NeoForge install and launch | Paused after version discovery and install preflight; installation and launch are not implemented |
| Online launch through loader adapters | Not implemented; online launch is vanilla-only |
| Mods, modpacks, resource packs | Not implemented |
| Windows and macOS | Planned ports; not part of the current release target |
| In-game console input through UMC | Not available; game stdin is closed |

## Core concepts

| Concept | Meaning |
|---|---|
| **Version** | An official Minecraft version ID such as `1.21.1`, as listed by `umc version list`. |
| **Instance** | An isolated configuration and game directory. Instances share downloaded versions, libraries, assets, and runtimes. |
| **Task** | A persistent, sequenced operation such as installing an instance or a Java runtime. |
| **Java runtime** | A managed runtime under `runtimes/`, or a system Java found through `JAVA_HOME` or `PATH`. |
| **Process** | A game process launched by UMC, tracked by a UMC process ID and OS PID. |
| **Data directory** | The root for instances, downloads, runtimes, tasks, processes, logs, and the daemon socket. |

## Recommended workflow

```sh
# 1. Choose a version
umc version list

# 2. Create an isolated instance
umc instance create Survival 1.21.1

# 3. Install the game files (use the printed instance ID)
umc instance install <instance-id>

# 4. Make sure Java 21 is available
umc java detect 21
# or provision Mojang's runtime
umc java install 1.21.1

# 5. Sign in with a Microsoft account
umc auth login

# 6. Launch online
umc launch <instance-id> --online

# Or launch offline for local testing
umc launch <instance-id> --offline Steve
```

The install commands above wait for completion and print progress on stderr. Task commands such as
`umc task get` require the local daemon; see [Tasks and the local daemon](./tasks-and-daemon).

## Command map

| Goal | Command | Details |
|---|---|---|
| List Minecraft versions | `umc version list` | One version ID per line |
| Create an instance | `umc instance create <name> <version>` | [Instances](./instances) |
| List / inspect instances | `umc instance list`, `umc instance get <id>` | [Instances](./instances) |
| Install or repair files | `umc instance install <id>` | [Instances](./instances) |
| Repair configuration | `umc instance repair <id>` | [Instances](./instances) |
| Remove an instance | `umc instance remove <id>` | [Instances](./instances) |
| Detect Java | `umc java detect [minimum-major]` | [Java runtimes](./java) |
| List managed runtimes | `umc java runtimes` | [Java runtimes](./java) |
| Install a Mojang runtime | `umc java install <minecraft-version>` | [Java runtimes](./java) |
| Sign in with Microsoft | `umc auth login` | See [Microsoft account](#microsoft-account) |
| Account status | `umc auth status`, `umc auth accounts` | See [Microsoft account](#microsoft-account) |
| Renew a session | `umc auth refresh [--account <id>]` | See [Microsoft account](#microsoft-account) |
| Sign out | `umc auth logout [--account <id>]` | Deletes the stored refresh token |
| Launch online | `umc launch <id> --online [--account <id>]` | [Launching and processes](./launching) |
| Launch offline | `umc launch <id> --offline <username>` | [Launching and processes](./launching) |
| Inspect processes | `umc process list`, `umc process status <id>` | [Launching and processes](./launching) |
| Stop a process | `umc process stop <id>` | [Launching and processes](./launching) |
| Inspect tasks | `umc task get <id>`, `umc task events <id>` | Requires `umcd`; [Tasks and the local daemon](./tasks-and-daemon) |
| Cancel a task | `umc task cancel <id>` | Requires `umcd` |
| Start the daemon | `umcd` | [Tasks and the local daemon](./tasks-and-daemon) |
| Start the stdio RPC adapter | `umc rpc --stdio` | [Developer integration](../development/) |

## Microsoft account

### Sign in

```sh
umc auth login
umc auth login --no-browser
umc auth login --redirect-uri http://localhost
```

UMC opens Microsoft's authorization page in your browser and listens on a temporary loopback port
for the callback. The authorization code is bound to the request with PKCE and a random `state`
value. UMC never receives your Microsoft password.

After Microsoft sign-in, UMC exchanges the code for Microsoft tokens, authenticates with Xbox Live
and XSTS, logs in to Minecraft services, and fetches the Minecraft profile. Only the refresh token
is saved.

### Inspect saved accounts

```sh
umc auth status
umc auth accounts
```

`auth status` reports whether an account is signed in, the default account, the credential backend
(`keyring` or `file`), and any storage warning. Account IDs are Minecraft UUIDs.

### Renew without a browser

Online launch renews the session automatically:

```sh
umc launch <instance-id> --online
```

You can also renew explicitly:

```sh
umc auth refresh
umc auth refresh --account <account-id>
```

A refresh uses the stored refresh token to obtain new Microsoft, Xbox, XSTS, and Minecraft tokens.
No browser is opened. If Microsoft rejects the refresh token (for example after a password change
or long inactivity), the saved credential is removed and you must run `umc auth login` again.

### Multiple accounts

The first account becomes the default. With more than one saved account, pass the account ID:

```sh
umc launch <instance-id> --online --account <account-id>
```

### Sign out

```sh
umc auth logout
umc auth logout --account <account-id>
```

Sign-out deletes the stored refresh token and account metadata from this machine. It does not
change your Microsoft account or Minecraft profile.

### Where credentials are stored

- **OS keyring** — GNOME Keyring/KWallet (Linux), macOS Keychain, or Windows Credential Manager.
- **File fallback** — `UMC_DATA_DIR/credentials/<account-id>.json` with `0600` permissions when no
  keyring is available.

Set `UMC_CREDENTIAL_STORE=file` to use the file backend explicitly. When the variable is unset, UMC
prefers the OS keyring and falls back automatically if it is unavailable. Microsoft access tokens,
Xbox/XSTS tokens, and Minecraft access tokens are never written to disk.

## Two ways to run long operations

UMC has two execution paths:

1. **In-process CLI** — `umc instance install` and `umc java install` start a task inside the CLI
   process, print progress, and wait for completion. Closing the CLI interrupts that task.
2. **Local daemon / JSON-RPC** — `umcd` keeps the engine alive, returns a task ID immediately, and
   lets clients inspect, cancel, and reconnect to tasks. `umc task ...` uses this path.

Do not start the same install through both the CLI and the daemon at the same time. UMC serializes
operations inside one process, but the CLI and daemon are separate processes and do not share an
in-process instance lock.

## Data and safety

Set `UMC_DATA_DIR` to choose the managed data root. If it is unset, development builds use
`./umc-data` relative to the current working directory.

- Do not edit `instance.json` by hand. Use `umc instance repair` if it is damaged.
- Game logs, task records, and process records can contain usernames, local paths, server addresses,
  and game output. Review them before sharing.
- Back up the data directory before manual cleanup. Stop running game processes and the daemon first.
- Use UMC commands to remove instances and runtimes where possible so running-process checks are
  applied.

See [Data, logs, and backups](./data-and-logs) for the full directory layout and backup guidance.

## Next steps

- [CLI reference](./cli) — every command, argument, and output convention.
- [Instances](./instances) — create, install, repair, and remove instances.
- [Java runtimes](./java) — detection, provisioning, and selection order.
- [Launching and processes](./launching) — offline launch, logs, and process control.
- [Troubleshooting](./troubleshooting) — common errors and recovery steps.
- [JSON-RPC v1](../reference/rpc-v1) — integrate a GUI or another language.
