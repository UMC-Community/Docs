# About UMC

UMC (Universal Minecraft Core) is an independent, open-source launcher engine for Minecraft: Java
Edition, written in Rust. It is headless by design: UMC owns installation, verification,
authentication, launching, and process supervision, while the CLI, a GUI, or another service owns
the user experience.

## Why UMC exists

Most launchers combine the interface, account handling, downloads, and launch logic in one
application. That makes the launcher hard to reuse, test, and audit. UMC separates the engine from
the interface:

- **One engine, four interfaces.** The CLI, Rust SDK, stdio JSON-RPC, and local JSON-RPC daemon all delegate to the
  same `umc-core` implementation, so behavior and state stay consistent.
- **Local-first.** Instances, downloads, tasks, processes, and logs live beneath a data directory
  you control. The launcher Core runs no hosted account service, telemetry endpoint, or cloud sync.
  The separate optional UMC Auth service is community-operated and uses Yggdrasil-compatible accounts.
- **Explicit boundaries.** Downloads are verified, paths are confined to the data directory,
  tokens are redacted and never returned over RPC, and the daemon listens only on local IPC.

## What UMC does

| Area | Capabilities |
|---|---|
| Versions and installation | Official Mojang metadata, verified client/library/asset downloads, isolated instances, repair |
| Java | System Java detection and opt-in Mojang-managed runtimes |
| Accounts | Microsoft OAuth with PKCE and local callback, keyring-backed refresh tokens, silent renewal |
| Launching | Vanilla offline and authenticated online launch, configurable memory, JVM/game arguments, process supervision |
| Automation | Persistent tasks with events, cancellation, and recovery; local daemon; Rust SDK; JSON-RPC v1 |

## Design principles

1. **Headless core.** No window is required to install, authenticate, or launch.
2. **One implementation.** Frontends do not reimplement launcher logic.
3. **Local-first privacy.** Player data and credentials stay on the machine; telemetry is absent.
4. **Verifiable downloads.** Downloaded files are checked against upstream integrity metadata where available.
5. **Conservative security.** OAuth tokens never enter instance configuration or logs, and local
   control surfaces are restricted to the current user.

## Project status

Available now:

- Vanilla version discovery, verified installation, and repair
- Microsoft account sign-in and silent session renewal
- Offline and authenticated vanilla online launch
- Managed Java runtimes and process supervision
- Persistent tasks, local daemon, Rust SDK, and JSON-RPC

Paused or planned:

- Fabric, Forge, and NeoForge installation and launch (paused after version discovery and install preflight)
- Online launch through loader adapters
- Mod, modpack, and resource-pack management
- Windows and macOS validation

See the [compatibility policy](./compatibility) for platform and API support commitments.

## Independence and license

UMC is not made, approved, endorsed, or supported by Mojang Studios or Microsoft, and it is not an
official Minecraft product. Minecraft names, marks, game files, and services remain with their
owners. UMC does not bundle the game.

UMC-authored source code and documentation are licensed under the MIT License. See the
[Terms of Service](./terms) and [Privacy Policy](./privacy) for the project's usage and data
practices.

## Get involved

- [Documentation](/en/guide/quickstart) — install and use UMC
- [Integration guide](/en/development/) — build on the engine
- [GitHub](https://github.com/UMC-Community/UMC) — source, issues, and releases
- [Contributing](/en/development/contributing) — development workflow
