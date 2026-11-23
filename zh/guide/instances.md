---
source: en/guide/instances.md
---

# 实例

实例是一套隔离的 Minecraft 安装：拥有自己的配置、游戏目录、日志和安装记录。已下载的版本、库、资源和 Java 运行时会在同一数据目录下的多个实例之间共享。

## 目录结构

```text
<data>/
  instances/
    <instance-id>/
      instance.json        # 面向用户的配置
      install.json         # 安装时写入的启动上下文
      game/                # 游戏目录（存档、选项、模组、截图）
      logs/
        umc-console.log    # 游戏 stdout 和 stderr
  versions/                # 共享的版本元数据和客户端 JAR
  libraries/               # 共享库
  assets/                  # 共享资源对象和索引
  natives/                 # 每个版本解压出的原生库
  runtimes/                # 托管 Java 运行时
```

实例创建时会创建游戏目录。可以把存档和其他游戏自有文件放在这里；不要手工把文件放进 UMC 的 `versions/`、`libraries/` 或 `assets/` 目录。

## 创建实例

```sh
umc version list
umc instance create Survival 1.21.1
```

命令会输出新的 `InstanceConfig`：

```json
{
  "schema_version": 1,
  "id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "name": "Survival",
  "minecraft_version": "1.21.1",
  "java_runtime": "auto",
  "memory": { "minimum_mib": 1024, "maximum_mib": 4096 },
  "game_directory": "instances/instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204/game"
}
```

| 字段 | 含义 |
|---|---|
| `id` | 生成的 UMC 实例 ID。所有实例命令都使用它。 |
| `name` | 显示名称，1–128 个字符。 |
| `minecraft_version` | 官方版本 ID；必须存在于 Mojang 清单中。 |
| `loader` | 为未来的加载器支持预留。当前 CLI 无法设置它，原版安装器会拒绝带加载器的实例。 |
| `java_runtime` | 预留的选择提示。当前版本的启动逻辑按版本组件和兼容性选择 Java；见 [Java 运行时](./java)。 |
| `memory` | 以 MiB 为单位的 `-Xms` / `-Xmx`。默认 1024 / 4096。 |
| `game_directory` | 相对于数据目录的路径。 |

当前 CLI 不提供 `instance edit` 命令。如果需要不同的 Minecraft 版本，请创建新实例。内存和启动选项可以通过 Rust SDK 或 JSON-RPC `launch.start` 覆盖，不需要修改 `instance.json`。

## 列出和查看

```sh
umc instance list
umc instance get <instance-id>
```

`instance list` 返回 JSON 数组。如果某个配置无法恢复，命令会报错，而不是静默隐藏该目录。使用 `instance repair` 或按下文说明检查隔离文件。

## 安装游戏文件

```sh
umc instance install <instance-id>
```

安装器会：

1. 读取实例配置，并要求它是原版实例。
2. 获取官方版本清单。
3. 下载并校验版本元数据 JSON。
4. 下载并校验客户端 JAR。
5. 解析库的平台规则，并下载每个所需构件。
6. 下载原生库，并解压到 `natives/<version>/`。
7. 下载资源索引及其中引用的每个资源对象。
8. 下载日志配置。
9. 写入带解析后启动上下文的 `instances/<id>/install.json`。

每个文件都会校验 SHA-1，并在元数据提供时校验大小。已经匹配的现有文件会被复用，因此安装可以安全重复执行。每个下载最多尝试三次；失败或取消时会删除未完成文件。

安装器会拒绝配置了加载器的实例。加载器适配器已在版本发现和安装预检后暂停，目前尚未实现加载器安装与启动。

### `install.json`

`install.json` 是内部状态，包含解析后的主类、资源索引、类路径和日志配置。类路径条目是当前数据目录下的绝对路径。如果把数据目录移动到其他路径，请重新执行 `umc instance install <instance-id>`，以便为新位置重写 `install.json`。

## 修复配置

如果 `instance.json` 损坏或无法读取：

```sh
umc instance repair <instance-id>
```

恢复顺序：

1. 主配置有效时原样返回。
2. 使用有效备份（`instance.json.bak`）。
3. 根据已验证的 `install.json` 和版本元数据重建配置。
4. 如果两个来源都无效，修复失败。

损坏的主文件不会被删除，而是重命名为类似 `instance.json.corrupt-<uuid>` 的名称，以便后续检查。修复不会删除游戏目录或存档，只恢复配置。

旧版 schema 版本 0 的配置在读取时会迁移到 schema 版本 1，旧字节保留为 `instance.json.bak`。

## 删除实例

```sh
umc instance remove <instance-id>
```

这会删除实例配置、安装记录、日志和游戏目录。如果该实例的游戏进程仍在运行，或 UMC 无法验证保存的进程状态，命令会拒绝执行。请先停止进程：

```sh
umc process list
umc process stop <process-id>
umc instance remove <instance-id>
```

删除实例不会删除共享的版本、库、资源、Java 运行时或其他实例。托管运行时请使用 `umc java remove` 删除。

## 共享下载与磁盘占用

同一 Minecraft 版本的多个实例会复用 `versions/`、`libraries/` 和 `assets/` 下的相同文件。安装第二个实例时仍会校验这些文件，但不会重复下载已经匹配的文件。当前版本没有自动的资源/库垃圾回收；删除实例不会释放共享下载。

## 安全注意事项

- 手工编辑或删除文件前备份数据目录。
- 游戏或安装运行期间不要编辑 `instance.json` 或 `install.json`。
- 使用 `instance remove` 而不是手工删除实例目录，以便执行进程检查。
- 游戏日志和记录可能包含玩家名称和本地路径。分享前请先检查。

## 限制

- 带加载器的实例目前无法安装或启动。
- CLI 无法原地修改实例的 Minecraft 版本。
- CLI 不提供内存或分辨率编辑；每次启动的覆盖请使用 SDK 或 JSON-RPC 启动请求。
