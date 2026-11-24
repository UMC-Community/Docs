---
source: en/guide/quickstart.md
---

# 快速开始

从一台全新的 Linux 机器出发，用几条命令启动原版 Minecraft: Java Edition 客户端。UMC 会把游戏安装到独立实例中，并可以离线启动或使用 Microsoft 账号启动。

::: tip 开始之前

- **平台：** 当前发布目标是 Linux x86_64。推荐并使用 Ubuntu 22.04 LTS 作为已验证的构建环境。
- **网络：** 版本查询、游戏文件和 Java 运行时通过 HTTPS 下载。
- **构建工具：** Rust 1.89 或更新版本（通过 [rustup](https://rustup.rs/) 安装），以及 GCC、
  `pkg-config`、`git` 和 `curl`。
- **发布：** 当前没有已发布的预编译版本，请使用下面的第一个标签从源码构建。

:::

在全新的 Ubuntu 22.04 系统上，先安装构建依赖（详见[安装环境要求](/zh/guide/install#环境要求)）：

```sh
sudo apt update
sudo apt install -y build-essential pkg-config git curl
```

## 1. 安装 UMC

从源码构建，或在有发布版本时使用预编译发布包。

::: code-group

```sh [从源码]
git clone https://github.com/UMC-Community/UMC.git
cd UMC
cargo build --workspace --locked --release
```

```sh [预编译发布包（发布后可用）]
VERSION=<最新版本>
curl -LO "https://github.com/UMC-Community/UMC/releases/download/v${VERSION}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
curl -LO "https://github.com/UMC-Community/UMC/releases/download/v${VERSION}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
sha256sum -c "umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
tar -xzf "umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
```

:::

把 `umc` 和 `umcd` 放到 `PATH` 中，或者直接从构建目录调用。本页后续命令默认直接使用 `umc`。

## 2. 创建实例

列出官方版本，然后为需要的版本创建独立实例：

```sh
umc version list
umc instance create Survival 1.21.1
```

命令会输出一个以 `instance-` 开头的实例 ID。后续步骤使用这个 ID：

```json
{
  "id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "name": "Survival",
  "minecraft_version": "1.21.1"
}
```

## 3. 安装游戏文件

```sh
umc instance install instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204
```

CLI 会等待安装任务完成，并把进度输出到 stderr。客户端 JAR、库、资源和日志配置会在上游提供相应元数据时按 SHA-1 与文件大小校验。重复执行该命令可以修复缺失或损坏的文件。

如果在后台使用守护进程，可以用返回的任务 ID 跟踪进度：

```sh
umc task get <task-id>
umc task events <task-id>
```

## 4. 准备 Java

Minecraft 1.21.1 需要 Java 21。UMC 会先查找兼容的托管运行时，然后检查系统 Java。如果两者都不可用，安装 Mojang 运行时：

```sh
umc java install 1.21.1
```

查看 UMC 找到的 Java：

```sh
umc java detect 21
umc java runtimes
```

## 5. 登录并在线启动

```sh
umc auth login
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --online
```

`umc auth login` 只需打开一次 Microsoft 登录页面并保存刷新 Token。之后的在线启动会静默续期。CLI 会等待游戏退出，并把 stdout 和 stderr 写入 `instances/<instance-id>/logs/umc-console.log`。

## 6. 离线启动用于测试

```sh
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --offline Steve
```

把 `Steve` 替换为 1–16 个字符的离线用户名。

::: warning 离线模式

离线模式不会验证账号所有权，也无法加入要求 Microsoft 账号的服务器。需要认证游戏时请使用 `--online`。

:::

## 7. 下一步

- [用户指南](/zh/guide/user-guide) —— CLI、数据模型和工作流总览。
- [CLI 参考](/zh/guide/cli) —— 所有命令、参数和输出约定。
- [实例](/zh/guide/instances) —— 创建、安装、修复和删除实例。
- [Java 运行时](/zh/guide/java) —— 检测、安装和运行时选择。
- [启动与进程](/zh/guide/launching) —— 启动行为、日志和进程控制。
- [故障排查](/zh/guide/troubleshooting) —— 常见错误与恢复步骤。
- [Rust SDK](/zh/development/sdk) —— 在 Rust 应用中嵌入 UMC Core。
- [集成指南](/zh/development/) —— 在 SDK、CLI 和 JSON-RPC 之间选择。
- [JSON-RPC v1](/zh/reference/rpc-v1) —— 完整的方法和任务语义。
- [兼容性策略](/zh/about/compatibility) —— 平台支持与兼容性承诺。
