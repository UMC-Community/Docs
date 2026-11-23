# Contributing

This page describes the UMC source repository and the separate Docs repository.

## Repository layout

| Path | Contents |
|---|---|
| `crates/umc-api` | Stable serializable contracts shared by all surfaces |
| `crates/umc-core` | Launcher engine: downloads, instances, Java, launch, tasks, daemon |
| `crates/umc-sdk` | Typed Rust facade over Core and the RPC dispatcher |
| `crates/umc-cli` | `umc` CLI and `umcd` daemon binaries |
| `crates/umc-loader-api` | Loader adapter contract |
| `crates/umc-loader-fabric` | Fabric Meta adapter |
| `crates/umc-loader-forge` | Forge Maven adapter |
| `crates/umc-loader-neoforge` | NeoForge Maven adapter |
| `crates/umc-loader-registry` | Built-in and host-registered adapter composition |
| `protocols/` | Canonical API contracts, including JSON-RPC v1 |
| `.github/workflows/` | Core CI and release workflows |

The separate [Docs repository](https://github.com/UMC-Community/Docs) contains `en/`, `zh/`,
`.vitepress/`, the site build scripts, and its GitHub Pages workflow. It is checked out next to UMC
at `~/UMC-Community/Docs`.

## Build and test

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
cargo test --workspace --locked
cargo build --workspace --locked --release
```

The workspace uses Rust edition 2024 with a minimum supported Rust version of **1.89**.

See [Testing and CI](./testing) for the test coverage, CI behavior, and manual release checklist.

## Code guidelines

- Keep `umc-api` free of transport and implementation dependencies.
- Put launcher behavior in `umc-core`, not in the CLI, SDK, or loader adapters.
- Return `Result<_, String>` from Core operations unless a typed error is part of the public
  contract.
- Validate and confine filesystem paths beneath the data root. Reject symlinks at managed paths.
- Use HTTPS for downloads and verify hashes and sizes when metadata provides them.
- Do not add arbitrary shell execution to the RPC surface.
- Do not dynamically load provider code. Loader adapters are trusted, compiled Rust crates.
- Preserve the instance configuration migration and recovery policy when changing storage.
- Do not expose internal Rust error strings as stable protocol codes.

## Documentation conventions

- English is the source of truth under `en/`.
- Chinese mirrors the same relative path under `zh/`.
- Do not put `_en` or `_zh` in Markdown filenames.
- Do not hand-copy English pages into `zh/`; run `npm run docs:sync`.
- Generated fallback pages carry `translation: pending`. Remove that marker when you translate a
  page so future syncs do not overwrite it.
- Do not translate code, commands, paths, API names, or protocol field names.
- Use relative links inside the guide; the i18n sync rewrites `/en/` links to `/zh/` in fallback
  pages.
- Edit `protocols/rpc-v1.md` in UMC for RPC changes. The Docs build syncs API contracts into
  `en/reference/`; tracked copies keep standalone local builds usable.

Documentation commands:

```sh
npm ci
npm run docs:dev
npm run docs:build
npm run docs:i18n:status
```

Run these commands from the Docs repository root. `docs:build` must pass, including dead-link
checking, before a documentation change is merged.

## Test data hygiene

Use a temporary data directory for manual tests:

```sh
export UMC_DATA_DIR="$(mktemp -d)"
```

Do not commit generated data directories, game logs, task records, process records, or downloaded
game files. Do not point tests at a real user data directory.

## CI

- UMC `CI` checks formatting, MSRV, and the Linux release build.
- Docs `Documentation` builds the site and deploys it from `main`.
- UMC `Release` runs on `v*` tags and publishes the Linux archive.

`cargo test` is currently expected to be run locally. See [Testing and CI](./testing) for the current
coverage and the manual validation checklist.

## Release process

1. Update the workspace version and release notes.
2. Verify the version matches the intended tag.
3. Run the full local test and manual validation checklist.
4. Push a `v*` tag.
5. The release workflow builds and publishes the Linux archive and checksum.

Windows and macOS are not in the validated release target. Releases are currently unsigned. See the
[compatibility policy](../about/compatibility).

## License and project boundaries

UMC is licensed under MIT. Do not add Minecraft game files, Mojang/Microsoft logos, or third-party
content that you do not have the right to redistribute. Do not imply official affiliation with
Mojang or Microsoft. See the [Terms of Service](../about/terms) and
[Privacy Policy](../about/privacy).

## Reporting issues

Include the exact command, full output, platform, Java version, and the relevant task, process, or
console log. Redact local paths, player names, and other personal data before posting.
