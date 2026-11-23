# Compatibility and release policy

## Support baseline

- Rust edition: 2024.
- Minimum supported Rust version (MSRV): 1.89. CI checks the workspace with Rust 1.89 and builds release binaries with stable Rust.
- Active platform target: Linux x86_64 GNU. Windows and macOS remain planned ports; their code is not currently in the release validation target.
- Runtime validation is currently Linux-only. A successful build does not certify daemon IPC permissions or game launch behavior on another operating system.
- UMC 0.1 supports vanilla Minecraft Java Edition installation, Microsoft account sign-in, online vanilla launch, and explicit offline launch. Loader installation and loader launch remain outside this release scope.

## Version compatibility

Rust crate versions and the JSON-RPC protocol version evolve independently.

- Rust crates use SemVer. Before 1.0, a breaking Rust API change requires a new minor version; patch releases remain compatible. After 1.0, breaking public API changes require a major version.
- JSON-RPC `v1` is advertised via `system.info`. Add methods and optional fields compatibly; clients should ignore unknown fields and event names. Do not change the meaning or remove a `v1` method, field, or event. A breaking wire change requires a separately advertised protocol version.
- `system.capabilities` is the feature discovery mechanism. Clients must not infer capabilities from the Core crate version.
- The RPC error mapping and some response fields remain provisional during 0.x and must be documented before a 1.0 compatibility promise.
- The instance configuration carries its own `schema_version`; every new on-disk schema needs a migration and recovery policy.

## CI and artifacts

`.github/workflows/ci.yml` checks formatting and the declared MSRV, then builds Linux x86_64 release binaries. It packages `umc`, `umcd`, the MIT license, and install instructions in a tar archive and uploads the archive with a SHA-256 checksum for seven days. `.github/workflows/release.yml` validates that the pushed `v*` tag matches the Cargo package version, then builds and publishes a versioned Linux x86_64 GNU archive and checksum as a GitHub Release. Windows and macOS are intentionally left out of the active matrix. Releases are unsigned, and Rust crates are not published to crates.io.

Before creating a public release:

1. Document third-party licenses for bundled Rust dependencies. UMC release archives currently contain the UMC binaries and documentation, not Minecraft game assets; game files and runtimes are fetched by the user at runtime. Keep it that way unless distribution rights are reviewed.
2. Review the RPC v1 contract, error mappings, and instance migration policy for the release.
3. Keep Linux install, daemon permissions, reconnect, launch, stop, and vanilla install behavior validated on a native runner.
4. Include the project non-affiliation notice in release descriptions and keep license/third-party notices with the artifacts.
5. Add signing only after release key ownership and storage are defined.
6. Re-enable Windows and macOS CI/runtime validation when those ports are scheduled.

## License

UMC is licensed under MIT. The root `LICENSE` file is authoritative, and every workspace package inherits `license = "MIT"` and author metadata from the workspace manifest.
