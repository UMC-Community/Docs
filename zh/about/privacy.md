---
source: en/about/privacy.md
---

# 隐私政策

_最后更新：2026 年 11 月 21 日_

本隐私政策说明 UMC（Universal Minecraft Core）会收集、发送和存储哪些数据。它适用于 UMC Core 库、命令行工具、守护进程、SDK、加载器适配器、文档和官方构建产物。本政策不涵盖单独部署的 UMC Auth 服务，也不适用于 Microsoft、Xbox、Minecraft、模组平台或你加入的服务器等第三方服务；这些服务由各自运营者负责其数据和隐私政策。

## 摘要

- 启动器 Core 不运营托管玩家账号服务、遥测端点、分析管道、广告系统、崩溃报告服务、云同步或远程管理服务。UMC Auth 是独立、可选、由社区运营的 Yggdrasil 兼容账号服务，其运营者负责说明和管理相关数据。
- UMC 在本地设备上存储游戏文件、实例、运行时、任务状态和日志。
- Microsoft 登录发生在 Microsoft 的页面上。UMC 永远不会收到你的 Microsoft 密码。
- 当前版本只保存 Microsoft 刷新 Token 和非敏感账号元数据。Microsoft、Xbox、XSTS 和 Minecraft 访问 Token 只存在于进程内存中，不会持久化。
- 在线启动使用已保存的刷新 Token 获取新 Token，无需打开浏览器。
- 版本查询、安装和加载器元数据请求会直接发往相关上游服务，这些服务可能收到普通连接元数据，例如你的 IP 地址。

## 存储在设备上的数据

UMC 将数据保存在 `UMC_DATA_DIR`（开发环境中为 `./umc-data`）下，可能包括：

| 数据 | 用途 |
|---|---|
| 实例配置和元数据 | 记录每个实例的名称、Minecraft 版本、内存设置、加载器选择和安装状态。 |
| 游戏文件、资源、库和 Java 运行时 | 从 Mojang 和其他上游源下载，以便在本地运行游戏。 |
| 任务和进程记录 | 让守护进程报告进度、恢复中断的工作并跟踪正在运行的游戏。 |
| 日志 | 记录安装进度、启动输出和错误，用于排查问题。 |
| 版本和元数据缓存 | 避免重复请求上游服务。 |
| `accounts/` 下的账号元数据 | Minecraft 用户名、UUID、最后登录时间、默认账号标记和凭据后端。不包含 Token。 |
| 刷新 Token | 优先存入操作系统钥匙串；不可用时存入 `credentials/<account-id>.json`，权限为 `0600`。 |

UMC 不存储你的 Microsoft 密码。Microsoft、Xbox、XSTS 和 Minecraft 访问 Token 不会写入磁盘。

## Microsoft 账号登录

运行 `umc auth login` 时，会发生以下过程：

1. UMC 在回环接口上启动临时 HTTP 监听器，并在浏览器中打开 Microsoft 授权页面。使用 `--no-browser` 时，UMC 改为打印 URL。
2. 你在 Microsoft 站点上登录，包括任何同意、账号选择或双重验证提示。UMC 不会看到你的凭据。
3. Microsoft 将浏览器重定向到回环地址，并附带一次性授权码。UMC 校验 `state` 值，并使用 PKCE（S256）将请求绑定到本次登录。
4. UMC 在 Microsoft 的 Token 端点用授权码换取 Microsoft Token。
5. UMC 将 Microsoft 访问 Token 发送到 Xbox Live 用户认证、XSTS 授权和 Minecraft 服务登录，并获得 Xbox、XSTS Token 以及 Minecraft 访问 Token。
6. UMC 请求 Minecraft 档案（用户名、UUID、皮肤和披风），以确认账号。

请求的 scope 为 `XboxLive.signin offline_access`。`offline_access` 允许 Microsoft 返回刷新 Token，UMC 会保存它，以便之后的在线启动无需打开浏览器。

登录过程中处理的账号数据：

| 数据 | 当前处理方式 |
|---|---|
| Microsoft 密码 | UMC 不会看到或存储，只在 Microsoft 页面上输入。 |
| Microsoft 访问 Token | 在命令运行期间保存在内存中，不写入磁盘。 |
| Microsoft 刷新 Token | 存入操作系统钥匙串；没有可用钥匙串时存入 `0600` 文件。用于静默续期。 |
| Xbox Live 和 XSTS Token | 在登录链路中保存在内存中，不写入磁盘。 |
| Minecraft 访问 Token | 保存在内存中并传给游戏进程，不写入磁盘。 |
| Minecraft 档案（名称、UUID、皮肤、披风） | 仅保存非敏感账号元数据（名称和 UUID）。皮肤和披风不做持久化。 |

使用 `umc auth logout` 删除已保存的凭据会从本机移除刷新 Token 和账号元数据，不会更改你的 Microsoft 账号。

## 网络请求

UMC 从你的设备直接向上游服务发起 HTTPS 请求，不经过 UMC 运营的代理。

| 用途 | 常见目标 |
|---|---|
| Minecraft 版本清单和游戏元数据 | `piston-meta.mojang.com`、`launchermeta.mojang.com` |
| 游戏文件、资源和库 | Mojang 及相关 CDN 主机 |
| Java 运行时下载 | Mojang 运行时元数据和下载主机 |
| 加载器元数据和安装器下载 | Fabric、Forge 和 NeoForge 端点 |
| Microsoft 登录和 Token 交换 | `login.microsoftonline.com` |
| Xbox Live 和 XSTS 授权 | `user.auth.xboxlive.com`、`xsts.auth.xboxlive.com` |
| Minecraft 服务登录和档案 | `api.minecraftservices.com` |

这些服务可能收到普通连接元数据，包括你的 IP 地址、请求时间、请求的 URL、User-Agent，以及该请求所需的 Token 或账号信息。它们各自的隐私政策适用。

## 本地守护进程与 IPC

UMC 守护进程只监听本地 IPC 端点（Unix Socket 或 Windows 命名管道），不开放网络端口。任何能连接该端点的本地进程都可以控制 UMC，因此请保护数据目录及其权限。除操作系统访问控制外，UMC 不对本地客户端做额外认证。

## 日志与诊断

日志可能包含：

- 玩家名称、Minecraft UUID 和账号名称；
- 本地文件路径和实例名称；
- 游戏、Java 和模组的输出，包括游戏打印的服务器地址或聊天内容；
- 上游服务返回的错误信息。

Token 不会写入日志。UMC 使用的 Token 类型在格式化调试信息时会隐藏内容，并且不会被序列化为 JSON。公开分享日志前请先检查，并移除任何私密内容。

## UMC 不会做的事

- 不做遥测、分析、使用统计或广告标识。
- 不做崩溃报告，也不会自动上传日志。
- 启动器 Core 不提供云同步、远程备份或托管账号服务。UMC Auth 是由社区独立部署和运营的可选服务。
- 不出售或共享个人数据。
- 除你主动发起的安装、版本、加载器、Java 和登录操作外，不进行后台请求。

## 保留与删除

本地数据会一直保留，直到你删除它：

- 在 UMC 中删除实例，或删除其目录，可删除该实例的文件、设置和日志。
- 删除 `UMC_DATA_DIR` 可移除所有由 UMC 管理的数据。
- 运行 `umc auth logout` 可移除已保存的刷新 Token 和账号元数据。删除 `UMC_DATA_DIR` 也会移除文件后备；钥匙串条目应通过 `auth logout` 清理。
- 卸载 UMC 不一定会删除 `UMC_DATA_DIR`；如需彻底移除，请自行删除。

发送给 Microsoft、Mojang 或其他第三方的数据，由这些服务按其自身政策保留。

## 第三方服务

Microsoft、Xbox、Minecraft、Mojang、Fabric、Forge、NeoForge、模组平台和多人服务器都是独立服务。它们收集的数据受其条款和隐私政策管辖。UMC 无法删除它们持有的数据，也无法替你更改其账号设置。

## 政策变更

当 UMC 增加遥测、托管服务、崩溃报告、模组分发或其他重要数据流时，本政策会更新。页首日期表示最后变更时间，重大变更会在发布说明中注明。

## 联系方式

有关隐私的问题，可以在项目的 [GitHub Issue 跟踪器](https://github.com/UMC-Community/UMC/issues)中提出。
