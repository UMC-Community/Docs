---
source: en/guide/troubleshooting.md
---

# 故障排查

先查看准确的命令输出和相关日志或任务记录。UMC 的错误按失败阶段分组：版本元数据、实例配置、下载、Java、任务状态或进程控制。

## 快速诊断

| 症状 | 可能原因 | 第一步 |
|---|---|---|
| `Unknown Minecraft version` | 版本 ID 拼写错误，或不在官方清单中 | `umc version list` |
| `Instance is not installed` | 安装尚未完成 | `umc instance install <id>` |
| `No Java runtime found` | `JAVA_HOME` 或 `PATH` 中没有兼容 Java | `umc java detect <major>`，然后 `umc java install <version>` |
| `Java ... is incompatible` | Java 低于版本要求 | 安装更新的托管运行时 |
| `Download failed after 3 attempts` | 网络、代理、DNS 或远端服务问题 | 重试安装；检查连通性 |
| `SHA-1 mismatch` 或 `size mismatch` | 文件损坏或传输错误 | 重新执行安装；检查磁盘/网络 |
| `Task ... interrupted` | 守护进程在任务完成前重启 | 重新执行安装 |
| `Could not connect to UMC daemon` | 该数据目录的 `umcd` 未运行 | 使用相同 `UMC_DATA_DIR` 启动 `umcd` |
| `UMC daemon is already running` | 已有一个守护进程服务该数据目录 | 使用现有守护进程，或先停止它 |
| `Stop this instance's game process before removing it` | 游戏进程仍在运行 | `umc process list`，然后 `umc process stop` |
| `cannot verify process state; refusing` | 进程记录损坏或不安全 | 检查 `processes/`；不要盲目删除 |
| `instance list` 报告 `instance.json` 损坏 | 配置损坏 | `umc instance repair <id>` |

## 版本与清单问题

### `Unknown Minecraft version: <id>`

ID 必须与官方版本清单中的条目完全一致。运行：

```sh
umc version list | grep <id>
```

版本 ID 区分大小写。如果快照和旧版本出现在清单中，也会包含在内。

### `Version missing from official manifest`

版本可能已从清单中移除，或缓存的清单已过期。UMC 会把清单缓存 1 小时到 `cache/version_manifest_v2.json`；等缓存过期后重试，或在没有安装任务运行时删除该缓存文件。

## 实例与配置问题

### `Instance is not installed; call instance.install first`

启动命令需要 `instances/<id>/install.json`。安装实例：

```sh
umc instance install <instance-id>
```

### `instance.json` 损坏

`instance.list` 会报告无法恢复的配置，而不是隐藏目录。修复配置：

```sh
umc instance repair <instance-id>
```

修复会先使用有效备份，然后使用已验证的安装记录和版本元数据。损坏的主文件会被重命名为 `instance.json.corrupt-<uuid>` 以便检查。游戏数据会保留。如果既没有备份，也没有有效安装记录，修复无法继续；请从备份恢复。

### `This installer currently supports vanilla instances only`

实例配置了加载器，或使用了加载器专用安装路径。加载器安装尚未实现。请先创建原版实例。

## 下载与完整性问题

### `Download failed after 3 attempts: ...`

UMC 会对每个文件重试三次。请检查：

- 到 Mojang/Minecraft 下载主机的网络和 DNS。
- 拦截 HTTPS 的企业代理或防火墙。
- 可用磁盘空间。
- 远端服务是否暂时不可用。

重新执行 `umc instance install <id>` 会复用已经匹配的文件。

### `SHA-1 mismatch`、`size mismatch` 或 `size exceeds metadata`

磁盘上或传输中的文件与官方元数据不匹配。UMC 会移除未完成的下载并报告错误。请重新安装。如果问题重复出现，请检查修改响应的代理、故障磁盘或损坏的本地缓存。

### 下载没有续传，而是重新开始

UMC 不会跨重试尝试续传未完成文件。每次尝试都会从头下载该文件，并在移动到目标位置前完成校验。已经完成的文件会在下次安装时复用。

## Java 问题

### `No Java runtime found (requires Java N or newer)`

UMC 没有通过 `JAVA_HOME` 或 `PATH` 找到可用的 Java。可以：

```sh
umc java install <minecraft-version>
```

或把兼容的 Java 加入 `PATH` / `JAVA_HOME`，然后重新运行：

```sh
umc java detect N
```

### `Java X is incompatible with Minecraft Y (requires Java Z or newer)`

找到了已安装的 Java，但版本太旧。安装更新的托管运行时：

```sh
umc java install <minecraft-version>
```

或把 `JAVA_HOME` / `PATH` 指向兼容的 JDK。

### `Minecraft X is not installed; install it before provisioning Java`

`umc java install` 会读取已安装的版本元数据来确定所需运行时。请先安装实例：

```sh
umc instance install <instance-id>
umc java install <minecraft-version>
```

### `Unsupported Mojang Java runtime component` 或 `No ... runtime for <platform>`

版本要求当前版本不提供的运行时组件，或 Mojang 没有为当前平台发布该组件。请使用满足版本要求的系统 Java。

### `Downloaded Java ... is incompatible`

下载的运行时没有通过主版本检查。删除运行时并重试：

```sh
umc java runtimes
umc java remove <runtime-id>
umc java install <minecraft-version>
```

如果再次失败，请改用系统 Java。

## 任务与守护进程问题

### `Could not connect to UMC daemon`

`umc task ...` 命令会连接本地守护进程。请使用相同数据目录启动它：

```sh
export UMC_DATA_DIR=/path/to/umc-data
umcd
```

确认客户端和守护进程使用相同的 `UMC_DATA_DIR`。

### `UMC daemon is already running`

一个数据目录只能由一个守护进程服务。请使用正在运行的守护进程，或停止后重新启动。如果没有守护进程在监听，过期 Socket 会被自动移除。

### `Task ... interrupted`

守护进程在任务未完成时重启。已完成的文件会被复用；请重新执行安装或运行时安装。任务结果和事件历史仍保留在 `tasks/` 下供检查。

### 任务长时间停留在 queued

最多同时运行两个操作，下载共享 32 个槽位。请等待当前操作完成，或使用 `umc task cancel <task-id>` 取消不再需要的任务。

### 任务取消没有立即完成

取消是协作式的。操作会在下载之间和长传输期间检查取消请求。任务进入 `cancelled` 时会删除未完成的下载。

## 进程问题

### `Stop this instance's game process before removing it`

该实例仍有 `running` 或 `starting` 的进程记录：

```sh
umc process list
umc process stop <process-id>
umc instance remove <instance-id>
```

### `Game process identity could not be verified; refusing to signal the PID`

UMC 会在发送信号前用 `-Dumc.process_id` 标记核对保存的 PID。如果 PID 已被复用或进程命令行被修改，UMC 会拒绝发送信号。检查 `processes/<process-id>.json` 和实例控制台日志。只有确认是目标游戏进程时，才手工停止它。

### `Corrupt game process state; refusing removal`

进程记录无法解析。UMC 会失败关闭，而不是可能杀死错误进程。检查记录，并在做任何修改前备份数据目录。

### 游戏已退出，但状态仍显示运行中

运行 `umc process status <process-id>` 或 `umc process list` 来重新核对保存的 PID。如果进程已经消失，会标记为 `exited`；监管者未观察到退出时 `exit_code` 可能为 `null`。

## 启动问题

### `Offline launch must be explicitly enabled with --offline`

请把标志作为最后一个参数传入：

```sh
umc launch <instance-id> <username> --offline
```

### `Offline username must be 1–16 ASCII letters, digits, or underscores`

使用只包含 `A–Z`、`a–z`、`0–9` 和 `_` 的名称，长度 1–16 个字符。更改用户名会改变离线 UUID 和玩家数据身份。

### `Could not start Minecraft: ...`

Java 进程无法启动。检查所选 Java 是否存在且可执行、实例是否已安装、游戏目录是否可写。如果进程启动后立即退出，请检查控制台日志。

### 游戏启动后立即关闭

检查实例控制台日志：

```text
instances/<instance-id>/logs/umc-console.log
```

常见原因包括 Java 版本不兼容、文件缺失或损坏、世界加载失败或游戏侧错误。控制台日志包含 Java 堆栈。

### 在线多人游戏不可用

离线模式无法加入要求已验证 Microsoft 账号的服务器。请先登录，然后在线启动：

```sh
umc auth login
umc launch <instance-id> --online
```

如果在线启动提示登录已过期，说明已保存的刷新 Token 被拒绝，请重新运行 `umc auth login`。保存了多个账号时，使用 `--account <account-id>` 选择。

### 钥匙串不可用

UMC 优先使用操作系统钥匙串；无法访问时回退到 `0600` 文件。使用 `umc auth status` 查看当前后端和警告。设置 `UMC_CREDENTIAL_STORE=file` 可显式使用文件后端。

### 登录时浏览器没有打开

运行 `umc auth login --no-browser`，手动打开输出的 URL。回调仍会发送到临时 localhost 端口，因此运行 UMC 的机器必须能够接收该回环请求。

## 平台与范围

### Windows 或 macOS

当前发布目标是 Linux x86_64。仓库中存在 Windows 和 macOS 代码路径，但尚未纳入验证的发布目标。

### 加载器、模组和整合包

加载器适配器目前只提供版本发现和安装预检计划。UMC 还不能安装或启动 Fabric、Forge 或 NeoForge 实例，也不管理模组或整合包。

## 收集诊断信息

报告问题时请包含：

- 准确命令及完整输出。
- `umc version list | head` 或相关版本 ID。
- 相关的 `instance.json` 和 `install.json`，并隐去敏感路径。
- 任务失败时的任务记录和事件文件。
- 进程失败时的进程记录。
- 游戏启动失败时 `logs/umc-console.log` 的末尾内容。
- Java 版本（`java -version`）和平台。

不要包含账号凭据或刷新 Token。日志仍可能包含个人数据。
