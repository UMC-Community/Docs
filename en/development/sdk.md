# Rust SDK

`umc-sdk` is a typed facade over the same Core and JSON-RPC contract used by the CLI and daemon. It
is the recommended integration for Rust applications.

::: warning Not published yet

The crate is not on crates.io. Use a path or git dependency while the public API stabilizes.

:::

## Dependency

```toml
[dependencies]
umc-sdk = { path = "../UMC/crates/umc-sdk" }
umc-api = { path = "../UMC/crates/umc-api" }        # contracts such as MemoryConfig
umc-loader-api = { path = "../UMC/crates/umc-loader-api" } # only for custom adapters
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

`umc-sdk` re-exports the common request and result types. `umc-api` is the contract crate for types
that are not re-exported, such as `MemoryConfig`, `Resolution`, and `ProcessStatus`.

## Create a launcher

```rust
use umc_sdk::Launcher;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let launcher = Launcher::builder()
        .data_dir("./umc-data")
        .build()
        .await?;

    for version in launcher.versions().await? {
        println!("{}", version.id);
    }
    Ok(())
}
```

Builder options:

| Method | Effect |
|---|---|
| `data_dir(path)` | Selects the managed data root; defaults to `umc-data` |
| `connect_daemon()` | Routes calls through a local `umcd` socket/pipe instead of in-process Core |
| `register_loader(adapter)` | Adds an in-process loader adapter; daemon mode uses the daemon's registry |
| `build()` | Creates the launcher; in-process mode creates the data directory |

`Launcher::data_dir()` returns the resolved absolute data directory.

## Versions and loader discovery

```rust
let versions = launcher.versions().await?;
let loaders = launcher.loaders().await?;
let fabric_versions = launcher
    .loader_versions(umc_sdk::LoaderId::fabric(), "1.21.1")
    .await?;
let plan = launcher
    .plan_loader_install(
        umc_sdk::LoaderId::fabric(),
        umc_sdk::LoaderInstallRequest {
            minecraft_version: "1.21.1".into(),
            loader_version: None,
        },
    )
    .await?;
```

Loader discovery and planning are implemented. Core does not execute loader install plans yet; see
[Loader adapters](./loaders).

## Instances

```rust
use umc_sdk::CreateInstanceRequest;
use umc_api::MemoryConfig;

let config = launcher
    .create_instance(CreateInstanceRequest {
        name: "Survival".into(),
        minecraft_version: "1.21.1".into(),
        memory: Some(MemoryConfig {
            minimum_mib: 1024,
            maximum_mib: 4096,
        }),
    })
    .await?;

println!("created {}", config.id);

let instances = launcher.instances().await?;
let repaired = launcher.repair_instance(&config.id).await?;
launcher.remove_instance(&config.id).await?;
```

There is no single-instance getter in the SDK; filter `instances()` by `id`. Removal refuses while a
game process is running.

## Install and task progress

```rust
use umc_sdk::InstallRequest;

let handle = launcher
    .install(InstallRequest {
        instance_id: config.id.clone(),
        timeout_seconds: None, // default is six hours
    })
    .await?;

let info = launcher.wait_task(&handle.task_id).await?;
println!("install finished: {:?}", info.result);
```

`wait_task` polls every 250 ms and returns an error for `failed`, `cancelled`, or `interrupted`.

For progress, subscribe to sequenced events:

```rust
let mut subscription = launcher.subscribe_task(&handle.task_id);

loop {
    let events = subscription.next_events().await?;
    for event in &events {
        println!("{}: {}", event.sequence, event.event);
    }

    let task = launcher.task(&handle.task_id).await?;
    match task.status {
        umc_sdk::TaskStatus::Queued | umc_sdk::TaskStatus::Running => continue,
        _ => break,
    }
}
```

`next_events` long-polls for up to 30 seconds and updates `after_sequence()` automatically. Persist
the sequence if your process may restart.

`cancel_task` requests cancellation. In daemon mode the task survives client disconnects; in
in-process mode it is tied to your process.

## Java

```rust
use umc_sdk::{JavaRuntimeInstallRequest, LaunchRequest};

let system_java = launcher.detect_java(None, 21).await?;
println!("{:?}", system_java);

let runtimes = launcher.java_runtimes().await?;

let java_task = launcher
    .install_java_runtime(JavaRuntimeInstallRequest {
        minecraft_version: "1.21.1".into(),
        timeout_seconds: None,
    })
    .await?;
launcher.wait_task(&java_task.task_id).await?;

launcher.remove_java_runtime("java-runtime-delta@21.0.5").await?;
```

`detect_java(Some(path), minimum)` accepts an explicit Java path. `install_java_runtime` requires
the Minecraft version metadata to be installed.

## Accounts

```rust
let status = launcher.auth_status().await?;
println!("backend: {}", status.credential_backend);

if !status.signed_in {
    let handle = launcher.auth_login(true, None).await?;
    loop {
        for event in launcher.task_events(&handle.task_id, 0, 5_000).await? {
            if event.event == "auth.url" {
                println!("open: {}", event.data["url"]);
            }
        }
        let task = launcher.task(&handle.task_id).await?;
        if task.status != umc_sdk::TaskStatus::Running
            && task.status != umc_sdk::TaskStatus::Queued
        {
            break;
        }
    }
}

let refreshed = launcher.auth_refresh(None).await?;
println!("{} expires in {:?}s", refreshed.account.name, refreshed.minecraft_expires_in);

launcher.auth_logout(None).await?;
```

`auth_login(open_browser, redirect_uri)` returns a task handle. Read `auth.url` before opening a
browser yourself when `open_browser` is `false`. The task result contains the account ID and name;
tokens are never part of the RPC surface. `auth_refresh` and online `launch` renew the session from
the stored refresh token.

## Launch and processes

```rust
use umc_sdk::LaunchRequest;

// Offline launch
let process = launcher
    .launch(LaunchRequest {
        instance_id: config.id.clone(),
        username: "Steve".into(),
        offline_mode: true,
        account_id: None,
        java_path: None,
        memory: None,
        resolution: None,
        fullscreen: false,
        extra_jvm_args: vec![],
        extra_game_args: vec![],
    })
    .await?;

// Online launch with the default or a selected account
let process = launcher
    .launch(LaunchRequest {
        instance_id: config.id.clone(),
        username: String::new(),
        offline_mode: false,
        account_id: None,
        java_path: None,
        memory: None,
        resolution: None,
        fullscreen: false,
        extra_jvm_args: vec![],
        extra_game_args: vec![],
    })
    .await?;
```

For online launch, `username` is ignored and the signed-in profile supplies the name and UUID.
Use `account_id` when more than one account is saved. Use `java_path` to override Java, `memory`
to override the instance memory, and `resolution` / `fullscreen` / extra arguments for launch
options.

```rust
println!("pid {} process {}", process.pid, process.process_id);

let current = launcher.process_status(&process.process_id).await?;
let all = launcher.processes().await?;

launcher.stop_process(&process.process_id).await?;
```

Process status must be polled; there is no process event stream. In-process launch keeps the monitor
in your process. Use daemon mode when the game must outlive the UI or client process.

## Tasks

```rust
let task = launcher.task("<task-id>").await?;
let events = launcher.task_events("<task-id>", 0, 30_000).await?;
launcher.cancel_task("<task-id>").await?;
```

In-process SDK tasks and daemon tasks are both backed by the same persistent task files, but daemon
tasks are the ones designed for reconnection after a client restart.

## Daemon mode

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .connect_daemon()
    .build()
    .await?;
```

Requirements:

- `umcd` must be running with the same `UMC_DATA_DIR`.
- The data directory must be accessible to both processes.
- Loader adapters must be registered by the daemon host, not the client.
- Tasks persist across client disconnects; process records are recovered after daemon restarts.

Do not mix in-process and daemon mutations for the same instance concurrently.

## Custom loader adapters

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

Adapters are trusted, compiled Rust code. UMC does not dynamically load provider code. See
[Loader adapters](./loaders) for the trait contract.

## API summary

| Method | Result |
|---|---|
| `versions()` | `Vec<VersionEntry>` |
| `loaders()` | `Vec<LoaderId>` |
| `loader_versions(loader, mc)` | `Vec<LoaderVersion>` |
| `plan_loader_install(loader, request)` | `LoaderInstallPlan` |
| `create_instance(request)` | `InstanceConfig` |
| `instances()` | `Vec<InstanceConfig>` |
| `remove_instance(id)` | `()` |
| `repair_instance(id)` | `RepairInstanceResult` |
| `detect_java(path, minimum)` | `JavaRuntimeInfo` |
| `java_runtimes()` | `Vec<JavaRuntimeInfo>` |
| `install_java_runtime(request)` | `TaskHandle` |
| `remove_java_runtime(runtime_id)` | `()` |
| `install(request)` | `TaskHandle` |
| `launch(request)` | `GameProcess` |
| `process_status(id)` | `GameProcess` |
| `processes()` | `Vec<GameProcess>` |
| `stop_process(id)` | `()` |
| `task(id)` | `TaskInfo` |
| `cancel_task(id)` | `()` |
| `task_events(id, after, wait_ms)` | `Vec<TaskEvent>` |
| `wait_task(id)` | `TaskInfo` |
| `subscribe_task(id)` | `TaskSubscription` |

## Error handling

All SDK operations return `Result<T, String>` except `build()`, which returns
`Result<Launcher, std::io::Error>`. The string comes from the Core dispatcher and is intended for
diagnostics. Map it to your own user-facing error categories rather than displaying it verbatim.

## Stability

The SDK follows the workspace SemVer policy. Before 1.0, breaking changes require a new minor
version. The JSON-RPC contract is versioned independently (`v1`). See the
[compatibility policy](../about/compatibility).
