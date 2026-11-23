---
source: en/services/index.md
---

# 可选服务

UMC 提供一组可以独立部署的配套服务。它们都不是安装或启动 Minecraft 的必需组件，社区和启动器开发者可以只运行自己需要的部分。

UMC Auth 和首版 UMC 镜像站都有 Docker Compose 部署，可与启动器部署在一起、放在 HTTPS 反向代理后，或部署到单独的主机。Java 版服务器仍在规划中，尚未打包。

| 服务 | 状态 | 用途 |
|---|---|---|
| [UMC Auth](./auth) | 账号系统已实现 | 账号 API、Vue 用户中心/管理面板、可选 Stalwart 邮件和 Yggdrasil 兼容认证 |
| [Java 版游戏服务器](./java-server) | 计划中 | 用 Docker 运行 Minecraft: Java Edition 服务端 |
| [镜像站](./mirror) | 初步实现 | 仅 HTTPS 上游、下载前 SHA-1 校验的 Go 对象缓存 |

## 设计原则

- **默认可选。** 普通 UMC 安装不会主动连接这些服务。
- **独立部署。** 已实现的服务拥有各自的部署配置和数据存储。
- **HTTPS 优先。** 公开服务应放在负责 TLS 的反向代理后面。
- **社区自持。** 账号、下载内容和纹理都由运营者控制。
- **小范围。** 每个服务只做一件事，并暴露有文档的 API，而不是做成大型管理平台。

## 如何选择

- 如果玩家需要在你自己的网站上注册，并通过 authlib-injector 或其他兼容 Yggdrasil 的启动器进入服务器，请运行 **UMC Auth**。
- 如果需要为社区托管 Docker 化的 Java 版服务端，可以运行 **Java 版游戏服务器**。
- 如果社区访问 Mojang 下载源较慢或不稳定，可以运行**镜像站**。

UMC Auth 采用 Nginx + Go 认证 API + PostgreSQL 的容器化部署。`/api/v1` 账号 API、Yggdrasil 接口、会话模型、邮箱验证码、找回密码、管理端 API、可选的 Stalwart 自建邮件以及 Vue 用户中心/管理面板已实现。[UMC Auth 指南](./auth)介绍服务本身；[部署环境](./auth-deployment)介绍架构、环境变量、数据模型、邮件规划和资源预算。
