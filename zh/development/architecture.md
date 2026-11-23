---
source: en/development/architecture.md
---

# 架构

UMC 是无界面启动引擎。社区应用负责界面和产品决策；Core 负责启动器操作及其持久化状态。

## 产品边界

```text
GUI / 脚本 ── Rust SDK ──┐
GUI / 脚本 ── JSON-RPC ──┼── umc-core ── 操作系统、文件系统、HTTPS
终端 ──────── CLI ───────┘
```

- `umc-core` 是启动器行为的唯一实现。
- SDK、CLI、stdio 适配器和守护进程都是 Core 之上的适配器。
- UMC 不捆绑 Minecraft，也不为启动器运营托管账号服务。Microsoft 登录由本地启动器 Core 实现。独立可选的 UMC Auth 由社区运营，提供 Yggdrasil 兼容账号；它不认证 Microsoft 账号，也不验证 Minecraft 所有权。
- UMC 不提供任意 shell 执行。

## 工作区

| Crate | 职责 |
|---|---|
| `umc-api` | 稳定的可序列化契约：请求、实例、任务、进程、Java 信息和错误类别 |
| `umc-core` | 应用服务：版本元数据、下载、实例、Java、启动、进程监管、任务、守护进程分发 |
| `umc-sdk` | 类型化 Rust 封装；在进程内或通过守护进程调用同一 RPC 分发器 |
| `umc` | CLI 和换行分隔的 stdio JSON-RPC 适配器 |
| `umcd` | 本地 Unix Socket / Windows 命名管道 JSON-RPC 宿主 |
| `umc-loader-api` | 加载器发现和预检契约 |
| `umc-loader-fabric` | Fabric Meta 适配器 |
| `umc-loader-forge` | Forge Maven 元数据和安装器构件适配器 |
| `umc-loader-neoforge` | NeoForge Maven 元数据和安装器构件适配器 |
| `umc-loader-registry` | 内建和宿主注册适配器的组合 |

加载器 crate 依赖 `umc-loader-api` 和上游元数据源。它们不依赖 Core、RPC 或 GUI 代码。

## Core 模块

```text
umc-core/src/
  lib.rs       # UmcCore、RPC 分发、版本清单缓存
  engine.rs    # 下载、安装、实例、Java、启动、进程记录
  tasks.rs     # 持久化任务、事件、取消、并发限制
  daemon.rs    # 本地 IPC 接受循环和连接处理
```

### 分发

所有接入面都通过 JSON-RPC 请求进入。SDK 在进程内构建 `RpcRequest` 并直接调用 `UmcCore::dispatch`，或把相同消息信封发送给 `umcd`。这保证 SDK 和 RPC 行为一致。

`system.info` 通告 Core 版本和 API 版本。`system.capabilities` 是能力发现机制；客户端不得根据 crate 版本推断能力。

## 安装流水线

```text
instance.install
  ├─ 读取 instance.json；拒绝加载器实例
  ├─ 获取官方版本清单（缓存 1 小时）
  ├─ 下载并校验 versions/<v>/<v>.json
  ├─ 下载并校验 versions/<v>/<v>.jar
  ├─ 对每个允许的库：
  │    ├─ 下载构件；校验 SHA-1 和大小
  │    ├─ 存在平台原生库时下载
  │    └─ 解压原生库到 natives/<v>/
  ├─ 下载资源索引
  ├─ 按哈希去重并下载资源对象
  ├─ 需要时生成旧版本的虚拟资源
  ├─ 下载日志配置
  └─ 写入 instances/<id>/install.json
```

下载：

- 仅使用 HTTPS；重定向也必须保持 HTTPS。
- 连接超时 15 秒。
- 元数据和每次下载读取的停滞超时 45 秒。
- 每个文件最多尝试三次。
- 复用现有文件前先校验。
- 失败或取消时删除未完成的 `.part-*` 文件。
- 所有任务合计最多同时进行 32 个文件下载。
- 下载的客户端、库、资源、日志配置和运行时文件，会在上游提供相应元数据时按 SHA-1 和文件大小校验。

平台规则目前只考虑操作系统名称和特性标志。尚未评估操作系统的 `arch` 和 `version` 条件；这是某些平台专用库的已知限制。

## 启动流水线

```text
launch.start（offline_mode 必须为 true）
  ├─ 校验离线用户名
  ├─ 读取 instance.json；拒绝加载器实例
  ├─ 读取 install.json 和版本元数据
  ├─ 确定所需 Java 主版本和 Mojang 组件
  ├─ 选择兼容的托管运行时，然后选择系统 Java
  ├─ 校验内存和分辨率
  ├─ 根据官方规则和替换变量构建 JVM 参数
  ├─ 根据官方 arguments 或旧版 minecraftArguments 构建游戏参数
  ├─ 打开 instances/<id>/logs/umc-console.log
  ├─ 以关闭的标准输入启动游戏
  ├─ 写入 processes/<process-id>.json
  └─ 监管子进程直到退出
```

离线身份使用标准的 `OfflinePlayer:<username>` MD5 派生，并设置 RFC 4122 版本位和变体位。访问令牌为 `offline`，用户类型为 `legacy`，版本类型为 `UMC`。

`install.json` 中的类路径保存绝对路径。移动数据目录后，需要为每个实例重新执行安装，以刷新启动上下文。

## 实例存储与恢复

每个实例包含：

```text
instances/<id>/
  instance.json
  install.json
  game/
  logs/umc-console.log
```

`instance.json` schema 版本 1 保存：

- 生成的实例 ID；
- 显示名称；
- Minecraft 版本；
- 可选的加载器描述（预留）；
- Java 选择提示（本版本预留）；
- 以 MiB 为单位的内存限制；
- 相对于数据根目录的游戏目录。

写入与恢复行为：

- 写入使用同步的临时文件和原子重命名。
- 上一个有效配置保留为 `instance.json.bak`。
- 读取时迁移旧版 schema 版本 0。
- 损坏的主文件被隔离为 `instance.json.corrupt-<uuid>`。
- 修复会恢复有效备份，或根据已验证的安装记录重建。
- 配置修复不会修改游戏数据。

## 任务引擎

任务提供持久化操作状态：

```text
tasks/<task-id>.json
tasks/events/<task-id>.jsonl
```

- 每个任务的事件序号单调递增，并带 UTC 时间戳。
- 取消是协作式的；未完成的下载会被删除。
- 任务在调用方指定、最多六小时的期限内超时。
- 最多同时运行两个操作和 32 个文件下载。
- 守护进程启动时，未完成任务变为 `interrupted`。
- 已完成任务的结果和事件历史仍可查询。

任务管理器位于启动任务的进程中。CLI 安装命令在进程内运行任务并等待；守护进程独立于客户端运行任务，并持久化以供重连。

## Java 解析

1. 从版本元数据读取 `javaVersion.majorVersion` 和 `javaVersion.component`。
2. 优先选择组件匹配且主版本足够新的托管运行时。
3. 回退到 `JAVA_HOME` 和 `PATH` 中的系统 Java。
4. 如果没有兼容 Java，返回明确说明所需主版本的错误。

托管运行时从 Mojang 运行时目录安装。目录清单和每个运行时文件都经过哈希校验，下载的 Java 还会执行一次以确认主版本。

## 进程监管

启动的游戏通过 UMC 进程 ID 和操作系统 PID 跟踪。命令行包含 `-Dumc.process_id=<process-id>`。

- `process.status` 和 `process.list` 会根据该标记核对保存的 PID。
- `process.stop` 在发送信号前验证标记，避免杀死被复用的 PID。
- Unix 使用 `SIGTERM`；Windows 终止已验证的进程树。
- 如果监管者已不存在，后续协调会把已退出进程标记为 `exit_code: null`。
- 损坏的进程记录会失败关闭。

## 加载器适配器

`umc-loader-api` 定义：

- `LoaderAdapter`，包含 `id`、`list_versions` 和 `plan_install`。
- `LoaderId`、`LoaderVersion`、`LoaderInstallRequest`。
- `LoaderInstallPlan` 和 `LoaderInstallStrategy`。

内建注册表组合 Fabric、Forge 和 NeoForge 适配器。Rust 宿主可以注册可信的进程内适配器。适配器只发现元数据并生成计划；Core 尚未执行加载器安装或合并加载器启动元数据。

## 错误边界

- `umc-api` 定义稳定的错误类别。
- JSON-RPC 保留码用于协议错误；UMC 专用码在 1.0 之前是暂定的。
- 内部 Rust 错误字符串不是稳定的协议码。
- SDK 方法返回 `Result<T, String>` 用于诊断；应用应把它们映射到自己的错误类型。

## 安全边界

- 所有托管路径都会规范化并限制在选定数据根目录之下。
- 托管路径中的符号链接会被拒绝。
- 下载必须使用 HTTPS。
- 守护进程使用仅本地 IPC：
  - Unix Socket 模式 `0600`，数据目录模式 `0700`。
  - Windows 命名管道使用仅所有者 ACL，并拒绝远程客户端。
  - 不监听 TCP。
- RPC 不提供任意 shell 执行。
- 只持久化 Microsoft 刷新 Token，存入操作系统钥匙串或权限为 `0600` 的后备文件。Microsoft、Xbox、XSTS 和 Minecraft 访问 Token 永远不会写入实例 JSON 或日志。

## 并发

- 进程内实例锁会串行化同一进程内某个实例的操作。
- 任务和下载信号量限制单个进程内的全局并发。
- CLI 和守护进程是不同进程，不共享这些锁。
- 对同一实例的变更操作只使用一个控制面。

## 已知限制

- 加载器安装和启动尚未实现；只有发现和预检计划。在线启动仅支持原版。
- 模组、整合包和资源包管理尚未实现。
- Windows 和 macOS 不在验证的发布目标中。
- 尚未评估操作系统架构和版本规则条件。
- `install.json` 保存绝对类路径。
- 下载在每次尝试时重新开始，而不是续传。
- 游戏日志不会轮转。
- 守护进程仅限本地；没有远程认证或授权层。

## 未来模块

计划工作遵循发布顺序：认证、加载器执行和版本合并、模组分发、平台移植，以及更完整的公共 API。接口应只在真正需要替代实现时引入，而不是预先铺到每个函数。
