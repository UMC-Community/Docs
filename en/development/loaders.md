# Loader adapters

Loader adapters discover loader versions and produce loader-specific installation plans. They do not
download or execute installers.

::: warning Current scope

Fabric, Forge, and NeoForge adapters can list compatible versions and return a preflight plan. Core
does not execute those plans yet, and the vanilla installer and launcher reject instances with a
loader configured.

:::

## Contract

`umc-loader-api` defines the transport-independent contract.

```rust
#[async_trait]
pub trait LoaderAdapter: Send + Sync {
    fn id(&self) -> LoaderId;
    async fn list_versions(&self, minecraft_version: &str) -> Result<Vec<LoaderVersion>, String>;
    async fn plan_install(
        &self,
        request: LoaderInstallRequest,
    ) -> Result<LoaderInstallPlan, String>;
}
```

### `LoaderId`

- 1–64 lowercase ASCII letters, digits, `-`, `_`, or `.`.
- Built-in constructors: `LoaderId::fabric()`, `LoaderId::forge()`, `LoaderId::neoforge()`.
- `LoaderId::new(value)` validates custom IDs.

### `LoaderVersion`

```json
{
  "loader": "fabric",
  "minecraft_version": "1.21.1",
  "version": "0.16.9",
  "stable": true
}
```

### `LoaderInstallRequest`

```json
{
  "minecraft_version": "1.21.1",
  "loader_version": null
}
```

`loader_version: null` asks the adapter to select its preferred stable version.

### `LoaderInstallPlan`

```json
{
  "loader": "fabric",
  "minecraft_version": "1.21.1",
  "loader_version": "0.16.9",
  "version_id": "fabric-loader-0.16.9-1.21.1",
  "strategy": {
    "strategy": "fabric_profile",
    "profile_url": "https://meta.fabricmc.net/v2/versions/loader/1.21.1/0.16.9/profile/json"
  }
}
```

### `LoaderInstallStrategy`

| Strategy | Payload | Meaning |
|---|---|---|
| `fabric_profile` | `profile_url` | Fabric's launcher profile JSON |
| `forge_installer` | `installer_url`, `sha1_url` | Forge installer artifact and checksum sidecar |
| `neoforge_installer` | `installer_url`, `sha1_url` | NeoForge installer artifact and checksum sidecar |
| `custom` | `provider`, `payload` | A host-defined strategy |

The installer strategy is kept explicit so every loader can keep its own installation semantics
instead of being flattened into a generic download.

## Built-in adapters

| Adapter | Metadata source | Version selection |
|---|---|---|
| Fabric | `https://meta.fabricmc.net/` | Stable loader version, otherwise first |
| Forge | `https://maven.minecraftforge.net/` | Stable version for the Minecraft line, otherwise first |
| NeoForge | `https://maven.neoforged.net/` | Stable version mapped to the Minecraft line, otherwise first |

Requests use an HTTPS client with the UMC user agent. Each adapter validates the Minecraft version
string and returns an error rather than panicking on malformed upstream data.

## Register an adapter

Rust hosts can register trusted, compiled adapters:

```rust
use std::sync::Arc;
use umc_loader_api::LoaderAdapter;
use umc_sdk::Launcher;

let launcher = Launcher::builder()
    .data_dir("./umc-data")
    .register_loader(Arc::new(MyAdapter::new()) as Arc<dyn LoaderAdapter>)
    .build()
    .await?;
```

The registry replaces an existing adapter with the same `LoaderId`. UMC does not download or
dynamically load provider code. When using `umcd`, the daemon host must compile and register the
adapter; a client cannot inject code into the daemon.

## Example adapter skeleton

```rust
use async_trait::async_trait;
use reqwest::Client;
use umc_loader_api::{
    LoaderAdapter, LoaderId, LoaderInstallPlan, LoaderInstallRequest,
    LoaderInstallStrategy, LoaderVersion,
};

pub struct MyAdapter {
    client: Client,
}

impl MyAdapter {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("MyLauncher/0.1")
                .build()
                .expect("valid client configuration"),
        }
    }
}

#[async_trait]
impl LoaderAdapter for MyAdapter {
    fn id(&self) -> LoaderId {
        LoaderId::new("my-loader").expect("valid loader id")
    }

    async fn list_versions(
        &self,
        minecraft_version: &str,
    ) -> Result<Vec<LoaderVersion>, String> {
        // Validate input, fetch over HTTPS, parse, and return versions.
        todo!()
    }

    async fn plan_install(
        &self,
        request: LoaderInstallRequest,
    ) -> Result<LoaderInstallPlan, String> {
        let versions = self.list_versions(&request.minecraft_version).await?;
        // Select a version and describe the installation strategy.
        todo!()
    }
}
```

Register the adapter as shown in [Register an adapter](#register-an-adapter).

## Design rules

- **Validate input.** Reject empty, overlong, non-ASCII, or path-like version strings.
- **Use HTTPS.** Do not fetch loader metadata over plain HTTP.
- **Do not install in the adapter.** A plan should identify artifacts and checksums. Downloading,
  verifying, extracting, and executing belong in Core so task, cancellation, and integrity behavior
  stay shared.
- **Prefer stable versions.** When the caller does not pin a version, select a stable release and
  fall back to the newest available entry.
- **Preserve loader semantics.** Return the strategy that actually describes the installation flow.
- **Fail with strings, not panics.** Upstream APIs change; return actionable errors.
- **Stay transport-independent.** Loader crates must not depend on Core, RPC, or GUI code.

## Upstream maintenance

Loader metadata formats are external contracts. When an upstream service changes:

1. Update the adapter's parsing and version mapping.
2. Keep the public `LoaderInstallPlan` shape stable where possible.
3. Add tests for version filtering and plan construction.
4. Update this page and the [release notes](../reference/releases/v0.1.0) if behavior changes.

CurseForge and Modrinth catalogs are separate from loader installation and are not part of these
adapters.

## Related

- [Integration guide](./) — choosing a surface and registering adapters.
- [Rust SDK](./sdk) — `register_loader` example.
- [RPC v1](../reference/rpc-v1) — `loader.list`, `loader.versions`, and `loader.plan`.
