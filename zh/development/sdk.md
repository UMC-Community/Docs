---
source: en/development/sdk.md
---

# Rust SDK

`umc-sdk` 是 CLI 和守护进程所用同一 Core 与 JSON-RPC 契约之上的类型化封装。它是 Rust 应用推荐的集成方式。

::: warning 尚未发布

该 crate 尚未发布到 crates.io。在公共 API 稳定之前，请使用 path 或 git 依赖。

:::

## 依赖

```toml
[dependencies]
umc-sdk = { path = "../UMC/crates/umc-sdk" }
umc-api = { path = "../UMC/crates/umc-api" }        # 契约类型，例如 MemoryConfig
umc-loader-api = { path = "../UMC/crates/umc-loader-api" } # 仅自定义适配器需要
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

`umc-sdk` 会重新导出常用请求和结果类型。`umc-api` 是契约 crate，包含未重新导出的类型，例如 `MemoryConfig`、`Resolution` 和 `ProcessStatus`。

## 创建 Launcher

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

Builder 选项：

| 方法 | 作用 |
|---|---|
| `data_dir(path)` | 选择托管数据根目录；默认 `umc-data` |
| `connect_daemon()` | 通过本地 `umcd` Socket/管道路由调用，而不是进程内 Core |
| `register_loader(adapter)` | 添加进程内加载器适配器；守护进程模式使用守护进程自己的注册表 |
| `build()` | 创建 Launcher；进程内模式会创建数据目录 |

`Launcher::data_dir()` 返回解析后的绝对数据目录。

## 版本与加载器发现

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

加载器发现和计划已实现。Core 尚未执行加载器安装计划；参见 [加载器适配器](./loaders)。

## 实例

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

SDK 没有单个实例 getter；请从 `instances()` 结果中按 `id` 过滤。游戏进程运行期间拒绝删除。

## 安装与任务进度

```rust
use umc_sdk::InstallRequest;

let handle = launcher
    .install(InstallRequest {
        instance_id: config.id.clone(),
        timeout_seconds: None, // 默认六小时
    })
    .await?;

let info = launcher.wait_task(&handle.task_id).await?;
println!("install finished: {:?}", info.result);
```

`wait_task` 每 250 ms 轮询一次，并在 `failed`、`cancelled` 或 `interrupted` 时返回错误。

订阅带序号的事件以获取进度：

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

`next_events` 最多长轮询 30 秒，并自动更新 `after_sequence()`。如果进程可能重启，请持久化该序号。

`cancel_task` 请求取消。守护进程模式下任务可以跨客户端断开存活；进程内模式下任务与你的进程绑定。

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

`detect_java(Some(path), minimum)` 接受显式 Java 路径。`install_java_runtime` 要求 Minecraft 版本元数据已经安装。

## 账号

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

`auth_login(open_browser, redirect_uri)` 返回任务句柄。`open_browser` 为 `false` 时，先读取 `auth.url` 再自行打开浏览器。任务结果包含账号 ID 和名称；Token 不会出现在 RPC 接口中。`auth_refresh` 和在线 `launch` 会使用已保存的刷新 Token 续期会话。

## 启动与进程

```rust
use umc_sdk::LaunchRequest;

// 离线启动
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

// 使用默认或指定账号在线启动
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

在线启动时 `username` 会被忽略，由已登录档案提供名称和 UUID。保存了多个账号时使用 `account_id`。使用 `java_path` 覆盖 Java，使用 `memory` 覆盖实例内存，使用 `resolution` / `fullscreen` / 额外参数设置启动选项。

```rust
println!("pid {} process {}", process.pid, process.process_id);

let current = launcher.process_status(&process.process_id).await?;
let all = launcher.processes().await?;

launcher.stop_process(&process.process_id).await?;
```

进程状态需要轮询；没有进程事件流。进程内启动的监管逻辑在你的进程内。如果游戏需要比 UI 或客户端进程存活更久，请使用守护进程模式。

## 任务

```rust
let task = launcher.task("<task-id>").await?;
let events = launcher.task_events("<task-id>", 0, 30_000).await?;
launcher.cancel_task("<task-id>").await?;
```

进程内 SDK 任务和守护进程任务都使用相同的持久化任务文件，但只有守护进程任务是为客户端重启后的重连设计的。

## 守护进程模式

```rust
let launcher = umc_sdk::Launcher::builder()
    .data_dir("/path/to/umc-data")
    .connect_daemon()
    .build()
    .await?;
```

要求：

- `umcd` 必须以相同的 `UMC_DATA_DIR` 运行。
- 数据目录必须对两个进程都可访问。
- 加载器适配器必须由守护进程宿主注册，而不是客户端。
- 任务可以跨客户端断连持久化；守护进程重启后会恢复进程记录。

不要同时对同一个实例混合使用进程内和守护进程变更操作。

## 自定义加载器适配器

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

适配器是可信的、编译后的 Rust 代码。UMC 不会动态加载提供方代码。trait 契约见 [加载器适配器](./loaders)。

## API 总览

| 方法 | 结果 |
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

## 错误处理

除 `build()` 返回 `Result<Launcher, std::io::Error>` 外，所有 SDK 操作都返回 `Result<T, String>`。字符串来自 Core 分发器，用于诊断。请把它映射到你自己的用户可读错误类别，而不是原样显示。

## 稳定性

SDK 遵循工作区的 SemVer 策略。1.0 之前，破坏性变更需要新的次版本。JSON-RPC 契约独立版本化（`v1`）。参见 [兼容性策略](../about/compatibility)。
