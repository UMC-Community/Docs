---
source: en/development/loaders.md
---

# 加载器适配器

加载器适配器发现加载器版本并生成加载器专用的安装计划。它们不下载或执行安装器。

::: warning 当前范围

Fabric、Forge 和 NeoForge 适配器可以列出兼容版本并返回预检计划。Core 尚未执行这些计划，原版安装器和启动器会拒绝配置了加载器的实例。

:::

## 契约

`umc-loader-api` 定义与传输无关的契约。

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

- 1–64 个小写 ASCII 字母、数字、`-`、`_` 或 `.`。
- 内建构造器：`LoaderId::fabric()`、`LoaderId::forge()`、`LoaderId::neoforge()`。
- `LoaderId::new(value)` 会校验自定义 ID。

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

`loader_version: null` 表示由适配器选择首选的稳定版本。

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

| 策略 | 载荷 | 含义 |
|---|---|---|
| `fabric_profile` | `profile_url` | Fabric 启动器配置文件 |
| `forge_installer` | `installer_url`、`sha1_url` | Forge 安装器构件和校验和副文件 |
| `neoforge_installer` | `installer_url`、`sha1_url` | NeoForge 安装器构件和校验和副文件 |
| `custom` | `provider`、`payload` | 宿主定义的策略 |

安装策略保持显式，让每个加载器保留自己的安装语义，而不是被压平成通用下载。

## 内建适配器

| 适配器 | 元数据源 | 版本选择 |
|---|---|---|
| Fabric | `https://meta.fabricmc.net/` | 稳定加载器版本，否则第一个 |
| Forge | `https://maven.minecraftforge.net/` | 对应 Minecraft 版本的稳定版本，否则第一个 |
| NeoForge | `https://maven.neoforged.net/` | 映射到 Minecraft 版本的稳定版本，否则第一个 |

请求使用带 UMC 用户代理的 HTTPS 客户端。每个适配器都会校验 Minecraft 版本字符串，并在上游数据格式错误时返回错误，而不是 panic。

## 注册适配器

Rust 宿主可以注册可信的、编译后的适配器：

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

如果 `LoaderId` 相同，注册表会替换已有适配器。UMC 不会下载或动态加载提供方代码。使用 `umcd` 时，守护进程宿主必须编译并注册适配器；客户端无法向守护进程注入代码。

## 适配器示例骨架

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
        // 校验输入，通过 HTTPS 获取、解析并返回版本。
        todo!()
    }

    async fn plan_install(
        &self,
        request: LoaderInstallRequest,
    ) -> Result<LoaderInstallPlan, String> {
        let versions = self.list_versions(&request.minecraft_version).await?;
        // 选择版本并描述安装策略。
        todo!()
    }
}
```

按 [注册适配器](#注册适配器) 所示注册适配器。

## 设计规则

- **校验输入。** 拒绝空、超长、非 ASCII 或类似路径的版本字符串。
- **使用 HTTPS。** 不要通过明文 HTTP 获取加载器元数据。
- **不要在适配器中安装。** 计划应标识构件和校验和。下载、校验、解压和执行属于 Core，以便任务、取消和完整性行为保持一致。
- **优先稳定版本。** 调用方没有固定版本时，选择稳定版本，失败时回退到最新可用条目。
- **保留加载器语义。** 返回真正描述安装流程的策略。
- **返回字符串错误，不要 panic。** 上游 API 会变化；返回可操作的错误。
- **保持传输无关。** 加载器 crate 不得依赖 Core、RPC 或 GUI 代码。

## 上游维护

加载器元数据格式是外部契约。当上游服务变化时：

1. 更新适配器的解析和版本映射。
2. 尽可能保持公共 `LoaderInstallPlan` 结构稳定。
3. 为版本过滤和计划构建添加测试。
4. 如果行为变化，更新本页和 [发布说明](../reference/releases/v0.1.0)。

CurseForge 和 Modrinth 目录与加载器安装相互独立，不属于这些适配器。

## 相关

- [集成指南](./) —— 选择接入面和注册适配器。
- [Rust SDK](./sdk) —— `register_loader` 示例。
- [RPC v1](../reference/rpc-v1) —— `loader.list`、`loader.versions` 和 `loader.plan`。
