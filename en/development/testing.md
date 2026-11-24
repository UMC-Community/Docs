# Testing and CI

This page describes the local test suite, the checks that run in GitHub Actions, and the manual
validation expected before a release.

## Local checks

Run from the repository root:

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
cargo test --workspace --locked
cargo build --workspace --locked --release
```

The declared minimum Rust version is **1.89**. CI verifies the workspace with that toolchain.

The test suite uses temporary directories and does not launch a real Minecraft client. Tests that
would require Mojang downloads are intentionally not part of the automated suite.

## Cross-compilation (experimental)

Windows is not a validated release target yet, but the workspace cross-compiles from Linux with the
GNU toolchain. On Ubuntu 22.04:

```sh
rustup target add x86_64-pc-windows-gnu
sudo apt install -y gcc-mingw-w64-x86-64
cargo build --workspace --release --target x86_64-pc-windows-gnu
```

The artifacts are `target/x86_64-pc-windows-gnu/release/umc.exe` and `umcd.exe`. Cross-compiled
binaries are not part of the release workflow or the manual validation checklist; test them on real
Windows before relying on them.

## What the tests cover

- Instance configuration migration from schema version 0 to 1.
- Backup creation, corrupt-primary quarantine, and repair from a backup.
- Repair from a validated install record.
- Removal refusal while a process is running.
- Corrupt process records failing closed.
- Listing behavior when an instance configuration is corrupt.
- Future schema versions not being downgraded.
- Asset digest and size verification.
- Asset index validation, deduplication, and invalid hashes.
- Non-HTTPS download URLs and traversal paths being rejected.
- Instance configuration validation.
- Java compatibility reporting for an installed but too-old runtime.
- Daemon reconnection, stale process recovery, and stopping a verified process.
- Runtime manifest path confinement.

## CI workflows

| Workflow | Trigger | Checks |
|---|---|---|
| `CI` | Push to any branch, `v*` tag, pull request, manual | `cargo fmt --check`, MSRV 1.89 `cargo check --workspace --locked`, Linux x86_64 release build, archive + SHA-256 |
| Docs `Documentation` | Push to `main`, pull request to `main`, manual | `npm ci`, `npm run docs:build`, GitHub Pages deploy on `main` |
| `Release` | Push of a `v*` tag | Tag/version match, Linux release build, published GitHub Release |

The current CI does **not** run `cargo test` or `cargo clippy`. Run the test suite locally before
opening a pull request.

The Docs repository build also runs the i18n synchronization step. See
[Documentation workflow](#documentation-workflow).

## Manual release validation

Before publishing a release, validate on a native Linux x86_64 runner:

1. Download and verify the release archive checksum.
2. `umc version list` succeeds.
3. Create an instance and install it.
4. Re-run install and confirm verified files are reused.
5. Launch in offline mode, confirm the game starts, and inspect `umc-console.log`.
6. Stop the game with `umc process stop` and confirm the process record becomes `exited`.
7. Start `umcd`, create an install task through the daemon, and follow task events.
8. Restart the daemon and confirm unfinished tasks are `interrupted` and process state is recovered.
9. Install a managed Java runtime and confirm launch selects it.
10. Repair a deliberately corrupted instance configuration.
11. Remove an instance and confirm running-process protection.
12. Build the Docs site and check the `/Docs/en/` and `/Docs/zh/` routes.

Windows and macOS behavior is not validated for the current release.

## Documentation workflow

The documentation site uses English as the source language and Chinese as a mirrored locale:

```text
en/...   English source of truth
zh/...   Chinese translations or English fallbacks
```

Rules:

- Keep the same relative path and filename under `en` and `zh`.
- Do not add `_en` or `_zh` to Markdown filenames.
- Missing Chinese pages are created by `npm run docs:sync` as English fallbacks with a
  `translation: pending` marker.
- When you translate a page, remove `translation: pending`. The sync script will then leave it
  alone.
- Do not translate code, commands, file paths, API names, or protocol field names.

Useful commands:

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:i18n:status
```

Run these commands from the Docs repository root. `docs:i18n:status` lists pages that are still
pending and orphan Chinese pages that have no English source. The Docs workflow runs `docs:build`,
which also regenerates pending fallbacks.

## Test data hygiene

- Use a temporary `UMC_DATA_DIR` for manual tests.
- Do not point tests at a real user data directory.
- Do not commit generated data directories, logs, task records, or process records.
- Remove test instances with `umc instance remove` so running-process checks are exercised.

## Related

- [Integration guide](./) — how the crates, SDK, daemon, and docs fit together.
- [Architecture](./architecture) — pipelines and boundaries.
- [Troubleshooting](../guide/troubleshooting) — user-facing failure modes.
