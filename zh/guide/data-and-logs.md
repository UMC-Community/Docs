---
source: en/guide/data-and-logs.md
---

# 数据、日志与备份

UMC 把所有托管状态放在一个数据目录下。本页说明其中保存了什么、哪些文件可以删除，以及如何备份或移动数据目录。

## 选择数据目录

设置 `UMC_DATA_DIR`：

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umc version list
```

如果没有设置 `UMC_DATA_DIR`，开发构建使用相对于当前工作目录的 `./umc-data`。如果从不同目录运行命令，请使用绝对路径。

守护进程和每个客户端必须使用相同的数据目录。

## 目录结构

```text
<data>/
  cache/
    version_manifest_v2.json       # 官方版本列表，缓存 1 小时
  versions/
    <minecraft-version>/
      <minecraft-version>.json     # 官方版本元数据
      <minecraft-version>.jar      # 客户端 JAR
  libraries/                       # 已验证的库构件
  assets/
    indexes/<index-id>.json        # 资源索引
    objects/<xx>/<sha1>            # 按内容寻址的资源对象
    virtual/<index-id>/...         # 旧版本解压出的虚拟资源
  natives/<minecraft-version>/     # 解压出的原生库
  runtimes/
    <component>/<version>/
      umc-runtime.json             # 校验标记
  instances/
    <instance-id>/
      instance.json                # 实例配置
      install.json                 # 解析后的启动上下文
      game/                        # 游戏目录
      logs/umc-console.log         # 游戏 stdout 和 stderr
  tasks/
    <task-id>.json                 # 任务状态和结果
    events/<task-id>.jsonl         # 带序号的事件历史
  processes/
    <process-id>.json              # 游戏进程状态
  accounts/
    <account-id>.json              # 非敏感账号元数据
    default                        # 默认账号 ID
  credentials/
    <account-id>.json              # 刷新 Token 后备文件（0600，无钥匙串时）
  umc.sock                         # `umcd` 运行时的 Unix Socket
```

操作系统钥匙串可用时，刷新 Token 保存在钥匙串中，而不是 `credentials/`。

在 Windows 上，守护进程使用命名管道而不是 `umc.sock`。

## 可以删除什么

| 路径 | 可以删除？ | 影响 |
|---|---|---|
| `cache/` | 可以，在没有安装运行时 | 清单会重新获取 |
| `versions/`、`libraries/`、`assets/`、`natives/` | 不建议 | 共享下载会丢失；重新安装会重新下载 |
| `runtimes/` | 使用 `umc java remove` | 托管 Java 运行时丢失 |
| `instances/<id>/game/` | 只能通过删除实例 | 存档、选项、截图和世界数据丢失 |
| `instances/<id>/logs/` | 可以，在没有游戏运行时 | 控制台历史丢失 |
| `tasks/` | 任务活动期间不建议 | 任务历史和恢复状态丢失 |
| `processes/` | 不建议 | 进程协调状态丢失 |
| `accounts/`、`credentials/` | 使用 `umc auth logout` | 已保存的登录状态被移除 |
| `umc.sock` | 仅在守护进程未运行时 | 过期 Socket 可以删除；守护进程会重新创建 |

不要手工删除 `instance.json` 或 `install.json`。请使用 `umc instance repair` 或重新安装。

## 日志与诊断

### 游戏控制台日志

```text
instances/<instance-id>/logs/umc-console.log
```

这是一个只追加的文件，包含游戏的 stdout 和 stderr。它不会轮转，可能包含玩家名称、本地路径、服务器地址、Java 输出和模组输出。

### 任务记录与事件

```text
tasks/<task-id>.json
tasks/events/<task-id>.jsonl
```

任务记录包含操作名称、时间戳、进度、结果和错误。事件历史是换行分隔的 JSON，带有单调递增的序号，可能包含下载 URL 和本地路径。

### 进程记录

```text
processes/<process-id>.json
```

进程记录包含 UMC 进程 ID、实例 ID、操作系统 PID、状态、启动时间，以及已知时的退出码。

### 崩溃报告

Minecraft 可能在实例游戏目录下写入崩溃报告，通常位于 `instances/<instance-id>/game/crash-reports/`。UMC 不会解析、上传或删除它们。

## 备份

1. 停止游戏进程。
2. 如果 `umcd` 正在运行，停止它。
3. 把整个数据目录复制到安全位置。

```sh
umc process list
# 使用 umc process stop <process-id> 停止所有运行中的进程
# 使用 Ctrl+C 停止 umcd
cp -a "$UMC_DATA_DIR" "$HOME/umc-backup"
```

在下载或游戏运行时创建的备份可能包含不完整或不一致的状态。

::: warning 备份中的凭据

如果 UMC 使用文件凭据后备，备份中的 `credentials/` 会包含 Microsoft 刷新 Token。请私下保存备份，或在复制前运行 `umc auth logout`，恢复后重新登录。

:::

## 恢复

1. 停止 UMC 进程和守护进程。
2. 把目录恢复到相同的绝对路径。
3. 启动 `umcd`，或使用指向该目录的 `UMC_DATA_DIR` 运行命令。

如果恢复到**不同的绝对路径**，请为每个实例重新执行安装：

```sh
umc instance install <instance-id>
```

`install.json` 保存的是原位置的绝对类路径。重新安装会为新数据目录重写它。`instance.json` 中的游戏目录相对于数据根目录，因此可以正确移动。

## 权限与隐私

守护进程启动时会把数据目录限制为仅所有者可访问。请保持这种状态：

- 不要让目录全局可写。
- 不要共享守护进程 Socket 或命名管道。
- 附加到问题报告前检查日志和任务记录。
- UMC 不运营遥测端点或远程管理服务。

## 磁盘占用

游戏版本、库、资源和 Java 运行时是主要占用项。多个实例共享这些文件。当前版本没有自动垃圾回收；如果需要释放空间，使用 UMC 命令删除不用的实例和运行时，然后在确认没有实例需要它们之后再删除共享下载。

## 相关

- [实例](./instances) —— 实例级文件和修复。
- [任务与本地守护进程](./tasks-and-daemon) —— 任务和事件语义。
- [故障排查](./troubleshooting) —— 从损坏或缺失状态中恢复。
