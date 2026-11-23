---
source: en/services/java-server.md
---

# Java 版游戏服务器

UMC Java 版游戏服务器是计划中的可选服务，用于通过 Docker 镜像运行 Minecraft: Java Edition 服务端。其代码仓库为 [UMC-Java-Server](https://github.com/UMC-Community/UMC-Java-Server)。

它是**服务端**，不是启动器：它托管世界，供玩家加入。UMC 启动器引擎和认证服务仍然保持独立。

## 状态

尚未实现。本页描述预期范围。

在该服务完成之前，运营者可以直接运行 Paper、Vanilla、Fabric、Forge 或 NeoForge 服务端，并把 authlib-injector 指向 [UMC Auth](./auth)。

## 计划能力

- 选择 Minecraft Java Edition 版本和服务端实现
- 初始化时显式接受 Minecraft EULA
- 配置内存、端口、视距、难度和其他 `server.properties`
- 用 Docker 卷持久化世界、插件、模组和配置
- 以非 root 用户运行，应用层只读
- 可选地通过 authlib-injector 接入 UMC Auth
- 控制台输出、日志、优雅停止和重启策略
- 世界数据备份与恢复工具
- 可选的 RCON，默认只绑定本机

## 预期 Compose 形态

```yaml
services:
  server:
    image: ghcr.io/umc-community/umc-java-server:latest
    environment:
      MINECRAFT_VERSION: "1.21.1"
      SERVER_TYPE: paper
      MEMORY: 4G
      EULA: "true"
    ports:
      - "25565:25565"
    volumes:
      - server-data:/data
```

这只是设计草图，不是已发布的镜像。

## 认证

Java 版服务端可以通过 authlib-injector 使用 UMC Auth：

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

使用外置登录时保持 `online-mode=true`。不要把服务端无防护地暴露到公网；需要防火墙、备份和账号提供商策略。

## 不包含的内容

- 启动器 UI
- Microsoft 账号所有权校验
- 整合包分发
- 公开服务器列表
- 自动插件市场

## 与其他服务的关系

- [UMC Auth](./auth) 提供账号和 Yggdrasil 认证。
- [镜像站](./mirror) 可以为启动器缓存游戏文件，与服务端独立。
- UMC 启动器引擎仍然负责客户端安装和启动。
