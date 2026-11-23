---
source: en/services/mirror.md
---

# UMC 镜像站

UMC 镜像站是一个可选的 Go 服务，从已配置的上游提供方获取不可变的 Minecraft 构件，按预期 SHA-1 校验每个对象，并且只缓存校验通过的数据。它已有 Docker Compose 部署方式。源码和部署文件位于 [UMC-Mirror 仓库](https://github.com/UMC-Community/UMC-Mirror)。UMC Core 目前还不会自动使用它。

## 状态与完整性模型

首版只提供内容寻址对象。每个请求都必须携带启动器从 HTTPS Mojang 元数据中读取的预期 SHA-1。镜像站下载对象并计算完整响应的哈希；只有摘要匹配时才会存储或返回文件。命中缓存时也会重新计算哈希。没有预期 SHA-1 的对象不能通过此 API 获取。

该校验用于确认文件字节与预期摘要相符。预期摘要由启动器从 Mojang 的 HTTPS 元数据获取。Minecraft 元数据使用 SHA-1 作为完整性字段，因此本服务沿用该字段；SHA-1 不是现代数字签名，也不能证明发布者身份。

## HTTPS 与上游限制

- 每个已配置的上游地址都必须使用 HTTPS。HTTP、URL 用户凭据、查询参数和片段会导致服务启动失败。
- 重定向必须继续使用 HTTPS，并且目标主机必须在已配置的提供方列表中。
- 对外公开的 URL 也必须使用 HTTPS。Compose 部署通过 Caddy 自动配置 TLS。不要将服务内部的 `8080` 端口直接暴露到公网。
- HTTP 客户端不读取代理环境变量；如果上游 DNS 只解析到私有、回环或链路本地地址，请求会被拒绝。
- 客户端不能提交任意上游主机名，只能选择配置中已有的提供方 ID。

## API

```text
GET /v1/objects/{provider}/{sha1}/{upstream-path}
HEAD /v1/objects/{provider}/{sha1}/{upstream-path}
GET /healthz
```

例如，Mojang 元数据中包含 SHA-1 的对象可以这样请求：

```text
https://mirror.example.org/v1/objects/mojang-data/<sha1>/v1/objects/<sha1>/client.jar
```

路径中的 `provider` 和 `sha1` 分别选择已允许的 HTTPS 上游及预期摘要。剩余路径会追加到该上游的基础 URL。响应带有 ETag 和不可变缓存头。摘要不匹配时返回 `502`，并且不会留下缓存文件。

提供方配置位于仓库根目录的 `providers.json`。如果上游会重定向到 CDN，请先将重定向目标主机加入提供方配置。

## Docker Compose

```sh
cp .env.example .env
# 编辑 .env 中的 MIRROR_DOMAIN，并将该域名的 DNS 指向这台主机。
docker compose up -d --build
```

需要开放 80 和 443 端口，以便 Caddy 申请证书并提供 HTTPS。对象保存在 `mirror-cache` 卷中。`MAX_OBJECT_BYTES` 限制单个对象大小，`CACHE_MAX_BYTES` 限制缓存总量；缓存空间不足时会淘汰最早缓存的对象。`MAX_CONCURRENT_DOWNLOADS` 限制同时进行的上游下载数。

## 范围

- 不提供上传、账号系统、模组托管或文件改写。
- 不代理没有预期 SHA-1 的元数据文件。
- 暂无指标监控或 Core 自动接入。
- 当前镜像面向 Linux 容器；尚未验证其他宿主平台。

镜像站独立于 [UMC Auth](./auth)，不认证玩家，也不验证 Minecraft 所有权。
