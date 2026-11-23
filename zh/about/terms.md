---
source: en/about/terms.md
---

# 服务条款

_最后更新：2026 年 11 月 19 日_

本服务条款（下称“条款”）说明使用 UMC（Universal Minecraft Core）的条件，适用范围包括 UMC Core 库、命令行工具、守护进程、SDK、加载器适配器、文档和官方构建产物（合称“UMC”）。下载、安装或使用 UMC，即表示你同意本条款。如果你不同意，请不要使用 UMC。

本页是项目自身的政策说明，不构成法律意见，也不替代 Microsoft 服务协议、Minecraft EULA 或任何第三方条款。

## UMC 是什么

UMC 是独立的开源社区项目。它不由 Mojang Studios 或 Microsoft 制作、批准、背书或支持，也不是官方 Minecraft 产品。“Minecraft”这一名称用于标识 UMC 所设计的游戏，不代表所有权、合作关系或背书。

在项目列表、发布说明和应用 About/Legal 页面中使用清晰声明：

> UMC 是独立项目。它不是官方 Minecraft 产品，也未获得 Mojang 或 Microsoft 的批准或关联。

Mojang 和 Microsoft 保留对 Minecraft 名称、商标、徽标、游戏、启动器及相关材料的权利。不要以暗示官方地位的方式使用其徽标或呈现方式。分发或推广 Minecraft 相关产品前，请阅读当前的 [Minecraft Usage Guidelines](https://www.minecraft.net/en-us/usage-guidelines) 和 [Minecraft EULA](https://www.minecraft.net/en-us/eula)。

## 许可证

UMC 编写的源代码和文档按本仓库的 MIT 许可证授权。MIT 许可证只覆盖 UMC 有权授权的材料，不授予 Minecraft 游戏文件、Minecraft/Mojang/Microsoft 商标、第三方模组、模组加载器、整合包或在线服务的任何权利。

## 归属边界

| 材料 | 项目边界 |
|---|---|
| UMC 编写的源代码和文档 | 版权归列出的 UMC 作者和贡献者所有，并按本仓库的 MIT 许可证授权。 |
| UMC 名称和项目美术 | 用于标识这个独立项目。使用 UMC 品牌的许可，不等于可以使用 Minecraft 或 Mojang/Microsoft 品牌。 |
| Minecraft 游戏文件、Minecraft/Mojang/Microsoft 商标及其在线服务 | 不归 UMC 所有或许可。UMC 不在发布包中捆绑游戏；引擎根据用户请求的安装，从元数据和下载源获取游戏文件。 |
| Microsoft、Xbox 和 Minecraft 账号凭据及档案信息 | 不是 UMC 财产。UMC 通过 Microsoft 的 OAuth 页面登录，永远不会收到你的 Microsoft 密码。账号数据的处理方式见[隐私政策](privacy.md)。 |
| Fabric、Forge、NeoForge、模组平台、模组和整合包 | 由各自独立维护或创建。其名称、代码、内容、商标、条款和许可证仍归各自所有者。UMC 的适配器不授予这些项目或内容的权利。 |
| Rust 依赖 | 由各自作者声明的许可证管辖的第三方软件。发布打包应包含适用的声明；UMC 的 MIT 许可证不能替代依赖许可证。 |

“Powered by UMC Core”是可选的集成署名，不是背书，也不是 MIT 要求。再分发说明见[开发者指南](../development/index.md)。

## 你的责任

- **使用自己的账号。** 使用你有权使用的 Microsoft 账号登录，并遵守 Microsoft 服务协议、Minecraft EULA 和 Minecraft Usage Guidelines。
- **不要绕过访问控制。** 不要使用 UMC 规避身份验证、所有权检查、家长控制、区域限制、付费权益或复制保护。
- **不要再分发不属于你的内容。** 游戏文件、资源、模组、整合包和第三方二进制仍受各自许可证约束。安装内容并不代表你有权分享它。
- **保护本地数据。** 任何能读取 UMC 数据目录或连接其本地 IPC 端点的人都能控制该安装。请保护该目录，并只在你自己的用户账号下运行 UMC。
- **不要滥用服务。** 不要使用 UMC 攻击、过载、抓取或规避 Mojang、Microsoft、模组平台或社区服务的速率限制。
- **审查你安装的内容。** 模组、整合包和加载器安装器都是第三方软件。你需要对自己选择运行的内容负责。

## 账号与第三方服务

UMC 可以使用 OAuth 2.0 授权码流程和 PKCE 通过 Microsoft 账号登录。登录发生在 Microsoft 自己的页面上；UMC 不会接收或存储你的 Microsoft 密码。登录后，UMC 会与 Xbox Live、XSTS 和 Minecraft 服务交换 Token，以获得 Minecraft 会话和档案。

你对 Microsoft、Xbox 和 Minecraft 服务的使用受其各自的条款和隐私政策约束。UMC 无法创建、恢复、封禁或申诉账号，也无法授予游戏所有权。资格、所有权检查、家长控制和区域限制由 Microsoft 和 Mojang 执行，而不是 UMC。

UMC 与你使用的模组加载器、模组平台或服务器没有关联。这些服务的运营方自行制定规则和条款。

## 无保证

UMC 按 MIT 许可证提供，包括其“AS IS”保证免责和责任限制。项目不保证 UMC 不中断、无错误、安全，或与任何特定游戏版本、模组、加载器或操作系统兼容。

## 支持边界

Mojang、Microsoft 以及第三方模组或加载器维护者，不会仅因 UMC 与其软件或服务交互而对 UMC 提供支持。UMC 特有问题请通过项目的 GitHub Issue 跟踪器报告。游戏、账号、加载器和模组问题可能需要联系各自的维护者。

## 条款变更

随着 UMC 增加或调整功能，本条款可能会更新。当前版本始终以本文档和仓库历史中发布的版本为准；页首日期表示最后变更时间。如果有重大变更，会在发布说明中注明。更新后继续使用 UMC，即表示适用更新后的条款。

## 联系方式

有关本条款的问题，可以在项目的 [GitHub Issue 跟踪器](https://github.com/UMC-Community/UMC/issues)中提出。
