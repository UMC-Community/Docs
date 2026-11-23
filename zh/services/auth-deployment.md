---
source: en/services/auth-deployment.md
---

# UMC Auth 部署环境

本页介绍 UMC Auth 在
[`deploy`](https://github.com/UMC-Community/UMC-Auth/tree/main/deploy)
中的 Docker 部署环境。Nginx 是唯一公网入口，Go 认证 API 和 PostgreSQL 位于内部网络；用户中心域名预留给独立 Web 面板；可选的 Stalwart 邮件 profile 不改变账号核心。

> **状态。** 第一至第五阶段均已实现：Docker 环境、账号 API、自建邮件、Vue 面板、Minecraft
> 档案与皮肤/披风签名纹理，以及服务器和加入记录管理。修改邮箱和 OAuth 客户端仍在规划中。

## 部署原则

这是 UMC Auth 唯一支持的部署拓扑。

- Nginx 发布 80 和 443 端口。认证 API 和 PostgreSQL 从不发布端口。
- `auth.example.com` 只提供 JSON：账号 API、Yggdrasil、纹理、健康检查，以及 `/` 的服务元数据。其他路径返回 JSON `404`。
- `account.example.com` 提供 Vue 用户中心和管理面板，并把 `/api/` 代理到认证服务，使浏览器 Cookie 保持第一方。
- 邮件是独立服务，通过 SMTP 连接，不属于账号核心。
- 启动器的 Microsoft 登录路线独立存在，不受本部署影响。

## 目标架构

```text
Minecraft 启动器 / Minecraft 服务端
                 │ HTTPS
                 ▼
          Nginx :80 / :443
          ├── auth.example.com    → auth-api:8080 → PostgreSQL
          ├── account.example.com → Vue 面板 + /api/ 代理 → auth-api:8080
          └── mail.example.com    → Stalwart（可选邮件 profile）
                                          │
                                          └── SMTP / IMAP → Internet
```

- `edge` 网络：Nginx 和认证 API。
- `internal` 网络：认证 API、PostgreSQL 和可选的邮件容器。
- 第一阶段只有 Nginx 发布公网端口。PostgreSQL 和认证 API 保持私有。
- 启用邮件 profile 后发布 25、465、993、4190，管理界面仅回环访问。

## 启动器与三方服认证路线

启动器的 Microsoft 认证路线保持不变：

- `umc auth login` 使用 Microsoft 账号登录。
- `umc launch --online` 刷新 Minecraft 会话并启动正版在线游戏。
- UMC Auth 不认证 Microsoft 账号，也不验证 Minecraft 所有权。

三方服路线使用 Yggdrasil。客户端必须通过
[authlib-injector](https://github.com/yushijinhun/authlib-injector) 启动，或者使用支持外置登录的启动器；Minecraft 服务端使用同一个 agent，并保持 `online-mode=true`：

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

这套部署准备的是三方服路线的服务端。UMC 启动器内的客户端接入另行推进，不由当前环境提供。

## 域名规划

| 域名 | 用途 | 行为 |
|---|---|---|
| `auth.example.com` | 认证 API、Yggdrasil、纹理、健康检查 | 纯 API；`/` 返回 JSON，页面路径返回 JSON 404 |
| `account.example.com` | Vue 用户中心和管理面板 | 提供 SPA 并代理 `/api/` |
| `mail.example.com` | 可选的自建邮件主机名 | 启用 Stalwart profile 时使用 |
| `example.com` | 社区主站 | 与本栈无关 |

请使用同时覆盖 `auth` 和 `account` 的证书，或通配符证书。如果只有一个域名，请同时删除 Nginx 模板中的
`account` server 块和 `compose.yaml` 中的 `ACCOUNT_DOMAIN` 环境项。

## 能力现状

| 能力 | 状态 |
|---|---|
| 注册、登录、Argon2id 密码哈希 | 已实现 |
| 每个账号稳定的 32 位 Minecraft UUID | 已实现 |
| Yggdrasil authenticate / refresh / validate / invalidate / signout | 已实现 |
| 会话 `join` / `hasJoined` 和档案查询 | 已实现 |
| 邀请码、工作量证明、Turnstile、按 IP 和全局限流 | 已实现 |
| 可选的 SMTP 邮箱验证链接 | 已实现 |
| 管理邀请码、用户和审计日志 | 已实现 |
| 不暴露用户名或邮箱是否已存在的注册响应 | `/api/v1` 已实现；旧 Web 表单仍会提示账号已注册 |
| 找回密码、登录历史、撤销会话 | `/api/v1` 已实现 |
| 短时 Access Token + 可撤销 Refresh Token | `/api/v1` 已实现 |
| 账号 REST API v1 | 已实现 |
| 独立 Vue 3 用户中心和管理面板 | 已实现 |
| 六位数字邮箱验证码（替代验证链接） | `/api/v1` 已实现；Web 表单仍发送链接 |
| 自建邮件服务 | 已实现为可选 Stalwart profile；外部 DNS/PTR 待配置 |
| 皮肤、披风、签名档案属性 | 已实现；纹理保存在 `auth-uploads` 卷 |
| 游戏服务器登记和 Yggdrasil 加入记录 | 已实现 |
| `username_normalized` / `email_normalized` 列 | 已通过版本化迁移实现 |
| `user`、`moderator`、`admin`、`superadmin` 角色 | 已实现 |
| 修改邮箱 | 计划中 |
| OAuth 客户端 | 计划中 |

账号 API 和 Yggdrasil 接口目前已经可用。列出计划中的能力是为了便于规划资源和迁移。

## 仓库与服务器目录

```text
UMC-Auth/
├── Dockerfile
├── cmd/umc-auth/             # Go 服务
├── web/                      # Vue 3 用户中心和管理面板
│   ├── src/
│   └── dist/                 # 构建产物（不提交）
└── deploy/                   # 部署环境（本页）
    ├── compose.yaml
    ├── .env.example
    ├── nginx/
    │   ├── nginx.conf
    │   └── templates/default.conf.template
    ├── certs/                # fullchain.pem、privkey.pem
    ├── acme/                 # 可选的 HTTP-01 验证目录
    ├── mail/                 # provisioning 输出和管理员凭据（不提交）
    └── scripts/
        ├── setup.sh
        ├── provision-mail.sh
        └── build-web.sh
```

`auth-api` 的构建上下文是 UMC-Auth 仓库根目录，因为镜像需要从 Go 源码构建。服务器上请保留仓库检出，或者单独构建并发布镜像，再把 `build:` 换成 `image:`。

推荐的服务器目录：

```text
/opt/UMC-Auth/                    # 仓库检出
  deploy/                         # 在这里运行 Compose
/opt/umc-auth-backups/            # 数据库转储和异地备份
```

除非同时修改构建配置，否则不要把单独的 `deploy/` 目录复制到服务器。

## 第一阶段：准备服务器

### 1. DNS 与防火墙

为两个域名创建指向服务器的 `A`（可选 `AAAA`）记录。开放 TCP 80 和 443，不要开放 8080 或 5432。

如果宿主机已经运行 Web 服务器，启动本栈前先停止它，或者按下文“复用现有 Nginx”处理。

### 2. 获取文件并创建 `.env`

```sh
git clone https://github.com/UMC-Community/UMC-Auth.git /opt/UMC-Auth
cd /opt/UMC-Auth/deploy
./scripts/setup.sh
$EDITOR .env
```

`setup.sh` 会把 `.env.example` 复制为 `.env`，创建 `certs/` 和 `acme/`，并在缺少证书时给出提示。

必填项：

| 变量 | 含义 |
|---|---|
| `AUTH_DOMAIN` | 认证服务公网主机名，也是 `PUBLIC_ORIGIN` 的主机 |
| `ACCOUNT_DOMAIN` | Vue 用户中心和管理面板主机名 |
| `POSTGRES_PASSWORD` | 数据库密码，认证服务也使用它 |
| `SERVER_NAME` | 界面和 Yggdrasil 元数据中显示的名称 |
| `BOOTSTRAP_TOKEN` | 创建第一个 superadmin 账号时需要填写的令牌 |

其余设置控制注册模式、CAPTCHA、邮箱验证、SMTP、会话有效期、Token 有效期和限流。它们与认证服务使用同一组变量，具体含义见 [UMC Auth 页面](./auth)。账号 API 另外使用 `ACCESS_TOKEN_MINUTES`（默认 15）、`REFRESH_TOKEN_DAYS`（默认 30）、`VERIFY_LIMIT_PER_MINUTE`（默认 10）、`FORGOT_LIMIT_PER_MINUTE`（默认 5）和 `REFRESH_LIMIT_PER_MINUTE`（默认 60）。

### 3. 放置 TLS 证书

把证书链和私钥放到：

```text
certs/fullchain.pem
certs/privkey.pem
```

证书必须覆盖 `AUTH_DOMAIN` 和 `ACCOUNT_DOMAIN`。续期证书后重新加载 Nginx：

```sh
docker compose exec nginx nginx -s reload
```

`acme/` 目录挂载到容器的 `/var/www/certbot`，可用于可选的 HTTP-01 验证。本项目不打包 certbot，请使用你信任的现有工具。

### 4. 构建 Vue 面板

```sh
./scripts/build-web.sh
```

脚本使用 `node:22-alpine`，把产物写入 `web/dist`，Nginx 将其挂载到
`/usr/share/nginx/html/account`。如果主机已有 Node 22+，也可以执行
`cd ../web && npm ci && npm run build`。

### 5. 启动

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f auth-api
```

### 6. 验证

```sh
curl -fsS https://auth.example.com/healthz
curl -fsS https://auth.example.com/
curl -fsSI https://auth.example.com/api/yggdrasil
curl -sSI https://auth.example.com/login | head -1
curl -fsSI https://account.example.com/ | head
```

预期结果：

- `/healthz` 返回 `ok`。
- `/` 返回 `{"service":"UMC Auth",...}` JSON。
- `/api/yggdrasil` 返回 JSON 元数据。
- `/login` 返回 JSON `404`；auth 域名不提供任何 HTML 页面。
- `account.example.com` 提供 Vue 面板，并把 `/api/` 代理到认证服务。
- HTTP 跳转到 HTTPS，并带有 HSTS。

部署检查也可以用于这个环境：

```sh
AUTH_DOMAIN=auth.example.com ACCOUNT_DOMAIN=account.example.com ../scripts/check-deployment.sh
```

### 7. 初始化第一个账号

打开 `https://account.example.com/register`，填写 `BOOTSTRAP_TOKEN`。第一个账号会成为 superadmin，并绕过邀请码、CAPTCHA 和邮箱验证。初始化完成后从 `.env` 删除 `BOOTSTRAP_TOKEN` 并重启 API：

```sh
docker compose up -d auth-api
```

## Nginx 行为

自带模板提供：

- HTTP 到 HTTPS 跳转，并保留 ACME 验证路径。
- TLS 1.2 和 1.3、会话缓存和 HSTS。
- 转发 `Host`、`X-Real-IP`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。
- 边缘限流：登录和注册每分钟 20 次，刷新每分钟 60 次，API 每秒 30 次，Yggdrasil 使用同一 API 限流。
- 公开的 `/healthz`。
- auth 域名的 `/` 返回服务元数据 JSON；API、Yggdrasil、纹理和健康检查走反向代理。其他路径返回 JSON `404`，不再提供 HTML 页面。
- SPA history 模式回退（`try_files ... /index.html`）。
- 同源 `/api/` 反代，复用相同的代理头和边缘限流。
- 请求体上限 3 MB，适配 1 MB 纹理上传及 multipart 开销。

应用自身仍会执行进程内限流。边缘限流是第二层防护，不能替代应用限流。

### 复用现有 Nginx

如果宿主机已经终止 TLS，可以删除 `compose.yaml` 中的 `nginx` 服务，只把 API 发布到回环地址，并保持 `TRUST_PROXY_HEADERS=true`：

```yaml
  auth-api:
    ports:
      - "127.0.0.1:8080:8080"
```

然后把 `nginx/templates/default.conf.template` 中的代理规则复制到宿主机配置。不要把 `8080`
发布到公网接口；服务会拒绝非 HTTPS 的公网来源，但公开可达的容器端口仍然是不必要的暴露。

## PostgreSQL 与数据模型

PostgreSQL 不发布端口，只位于 `internal` 网络。`auth-db` 卷保存账号和元数据；`auth-uploads`
卷保存皮肤和披风文件。

表结构由 `cmd/umc-auth/migrations` 中的内嵌版本化迁移管理。`0001` 是原始幂等表结构；
`0002` 增加账号 API 所需的列和表，并原地回填已有数据；`0003` 将规范化身份列设为非空。
已应用的版本记录在 `schema_migrations`。

唯一性由数据库保证：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized ON users (username_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized
    ON users (email_normalized) WHERE email_normalized <> '';
```

旧的 `users_username_lower` 和 `users_email_lower` 索引保留用于兼容。

当前表：

| 表 | 用途 |
|---|---|
| `users` | 账号、规范化用户名和邮箱、密码哈希、角色、状态、时间戳 |
| `access_tokens` | Yggdrasil Access Token 哈希 |
| `web_sessions` | 旧 HTML 会话 Cookie 哈希 |
| `auth_sessions` | `/api/v1` Access / Refresh Token 哈希、会话族、设备信息、撤销状态 |
| `email_verification_codes` | 六位验证码哈希、用途、过期时间、尝试次数、发送次数 |
| `password_reset_tokens` | 一次性重置码哈希 |
| `login_attempts` | 登录成功和失败记录 |
| `mail_outbox` | 待发邮件、重试状态、最后错误 |
| `joins` | Yggdrasil 会话进入记录 |
| `invites` | 邀请码哈希 |
| `email_verifications` | 旧版 24 小时验证链接 |
| `pow_challenges` | 工作量证明挑战 |
| `audit_log` | 管理和安全操作 |
| `settings` | 签名密钥、工作量证明密钥和其他服务端状态 |
| `minecraft_profiles` | 玩家名、UUID、皮肤/披风哈希与地址、皮肤模型、纹理更新时间 |
| `server_instances` | 已登记服务器、地址、状态、创建者 |
| `server_join_records` | 长期 Yggdrasil 加入记录，包含用户名、服务器 id 和 IP |

账号服务保留 `BIGINT` 内部主键，并使用 `users.uuid` 作为外部玩家标识。这样不需要破坏性重写主键，
同时保持 Minecraft UUID 稳定。

尚未创建的计划表：

| 表 | 用途 |
|---|---|
| `oauth_clients` | 启动器或应用客户端 |

新的表结构变更必须新增编号迁移，不要修改已经应用的迁移。

## API 面

### 当前已实现

| 分组 | 端点 |
|---|---|
| Yggdrasil 认证 | `POST /api/yggdrasil/authserver/authenticate`、`refresh`、`validate`、`invalidate`、`signout` |
| 会话 | `POST /api/yggdrasil/sessionserver/session/minecraft/join`、`GET .../hasJoined` |
| 档案 | `GET /api/yggdrasil/sessionserver/session/minecraft/profile/{uuid}`、`POST /api/yggdrasil/api/profiles/minecraft` |
| 元数据 | `GET /api/yggdrasil` |
| Web | `/register`、`/login`、`/dashboard`、`/verify-email`、`/admin` |

### 账号 API v1

账号 API 已实现，正式契约见 [UMC Auth API v1](../reference/auth-v1)。

| 端点 | 用途 |
|---|---|
| `POST /api/v1/auth/register` | 注册账号 |
| `POST /api/v1/auth/verify-email` | 验证邮箱验证码 |
| `POST /api/v1/auth/verify-email/resend` | 重发验证码 |
| `POST /api/v1/auth/login` | 登录并创建会话 |
| `POST /api/v1/auth/refresh` | 轮换 Access / Refresh Token |
| `POST /api/v1/auth/logout` | 撤销当前会话 |
| `POST /api/v1/auth/password/forgot` | 申请重置密码 |
| `POST /api/v1/auth/password/reset` | 完成密码重置 |
| `GET /api/v1/users/me` | 当前账号和会话 |
| `GET /api/v1/users/me/sessions` | 当前会话列表 |
| `DELETE /api/v1/users/me/sessions/{id}` | 撤销指定会话 |
| `GET /api/v1/users/me/minecraft` | Minecraft 档案和纹理地址 |
| `POST /api/v1/users/me/skin` | 上传 64×64 或 64×32 皮肤，支持 `classic` / `slim` |
| `DELETE /api/v1/users/me/skin` | 删除当前皮肤 |
| `POST /api/v1/users/me/cape` | 上传 64×32 或 64×64 披风 |
| `DELETE /api/v1/users/me/cape` | 删除当前披风 |
| `GET /api/v1/profiles/{uuid}` | 按 UUID 查询档案 |
| `GET /api/v1/profiles/by-username/{name}` | 按玩家名查询档案 |
| `GET /textures/{skin\|cape}/{uuid}/{sha256}` | 公开且不可变的纹理文件 |
| `/api/v1/admin/*` | 用户搜索、状态、角色、手动验证、重置密码、邀请码、审计搜索、邮件、服务器、加入记录、统计 |

Vue 面板通过 `account.example.com/api/v1` 使用同一套 API，由 Nginx 代理到认证服务。

## 自建邮件（Stalwart）

第三阶段增加一个可选的 Stalwart v1 容器，位于 Compose 的 `mail` profile 下。它提供 SMTP、
TLS 提交、IMAPS、ManageSieve、DKIM 签名，以及仅回环访问的管理界面。账号核心只需要 SMTP，
不内嵌邮件投递。

启用：

```sh
# 在 .env 中设置 MAIL_* 和 SMTP_*。保持 SMTP_PASSWORD 等于
# MAIL_NO_REPLY_PASSWORD，并确保证书覆盖 MAIL_HOSTNAME。
./scripts/provision-mail.sh
# 发布 mail/dns-records.txt 中的记录，然后：
#   EMAIL_VERIFICATION=required
docker compose --profile mail up -d
docker compose up -d auth-api
```

provision 脚本需要主机上有 Python 3 和 OpenSSL。它会以 bootstrap 模式启动 Stalwart，完成主机名和域名设置、自动生成 DKIM 密钥，
把生成的管理员凭据写入 `mail/admin-credentials.txt`，创建或更新 no-reply 账号，安装证书，
并把 DNS zone 写入 `mail/dns-records.txt`。

| 端口 | 用途 | 暴露方式 |
|---|---|---|
| 25 | 入站 SMTP | 公网 |
| 465 | 隐式 TLS 提交 | 公网 |
| 993 | IMAPS | 公网 |
| 4190 | ManageSieve | 公网；不用时建议封锁 |
| 8080 | setup/recovery HTTP | 仅回环 |
| 8443 | 管理界面 HTTPS（容器 443） | 仅回环 |

Stalwart 首次启动时会从 GitHub 下载 WebUI 包。如果主机无法访问 GitHub，请使用 `mail-cli`
服务或允许出站 HTTPS。

管理界面：

```sh
# 日常管理：
ssh -L 8443:127.0.0.1:8443 <user>@<server>
# 打开 https://127.0.0.1:8443/admin

# setup 或恢复：
ssh -L 8080:127.0.0.1:8080 <user>@<server>
# 打开 http://127.0.0.1:8080/admin
```

### 认证服务 SMTP

```ini
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=使用专用邮件密码
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=implicit
```

邮件容器同时接入 `edge` 网络用于外发投递，并接入带 `${MAIL_HOSTNAME}` 别名的 `internal` 网络。
认证服务通过该别名连接，证书校验使用 `mail.example.com` 的公网证书。

### DNS 与网络条件

Stalwart 安装完成后会生成 zone 文件，包含 MX、SPF、DKIM、DMARC、MTA-STS、SRV 和 autoconfig
记录。关键记录：

| 记录 | 主机 | 示例 |
|---|---|---|
| `A` | `mail` | `1.2.3.4` |
| `MX` | `@` | `mail.example.com` |
| `TXT`（SPF） | `@` | `v=spf1 mx ip4:1.2.3.4 -all` |
| `TXT`（DKIM） | 生成的 selector | zone 中的公钥 |
| `TXT`（DMARC） | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@example.com` |
| `PTR` | 服务器 IP | `mail.example.com` |

自建邮件不等于一定能送达 Gmail、Outlook 或 QQ 邮箱。送达取决于公网 IP 信誉、PTR、25 端口、
SPF、DKIM 和 DMARC。部分 VPS 服务商会封锁出站 TCP 25，决定自建邮件前必须先确认。

旧 Web 表单发送 24 小时有效的一次性验证链接；账号 API 使用带尝试次数和重发限制的六位数字验证码。
过渡期两条路径同时可用。

账号 API 验证策略：

| 项目 | 值 |
|---|---|
| 验证码 | 六位随机数字 |
| 有效期 | 10 分钟 |
| 尝试次数 | 最多 5 次 |
| 重发间隔 | 同一邮箱 60 秒 |
| 存储 | 哈希、用途、过期时间、尝试次数、发送次数 |
| 复用 | 验证成功后立即失效 |
| 投递 | 写入 `mail_outbox`，SMTP 失败时重试 |

本地 SMTP 提交、IMAP 投递、DKIM 签名，以及认证服务 → Stalwart 的 outbox 链路已经测试通过。
外部送达仍需要真实的 DNS 和 PTR 记录。

## 资源预算（2 核 / 2 GB）

| 组件 | 初期预算 |
|---|---|
| Linux 与 Docker | 400–650 MB |
| PostgreSQL | 150–300 MB |
| Go 认证 API | 30–150 MB |
| Nginx | 占用较小，主要是共享页缓存 |
| Stalwart 邮件（可选） | 约 200–500 MB，取决于配置 |
| 缓冲空间 | 尽可能保留 |

建议：

- 这台主机不要部署 Redis、Elasticsearch 或 ClamAV。
- 限制 PostgreSQL 连接数，设置适度的共享缓冲区。
- 认证 API 保持单副本；进程内限流不跨副本共享。
- 配置 1–2 GB Swap 作为突发缓冲，不要当作正常内存使用。
- 在测量内存之前，不要在同一台 2 GB 主机上再运行 Minecraft 服务端。游戏服务端、邮件和认证一起运行会非常紧张。

## 安全检查

- 密码使用 Argon2id；Access、Refresh、会话、邀请码和验证 Token 只保存哈希。
- 邮件待发送时，发件箱正文会包含验证码。投递成功后会清空正文；待发送记录和数据库备份都应按敏感数据处理。
- 在 Nginx 终止 HTTPS，认证 API 和数据库不进入公网。
- Refresh Cookie 使用 `Secure`、`HttpOnly`、`SameSite=Lax`，并保持 auth 域名只返回 JSON。
- 公开注册应使用邀请码、工作量证明或 Turnstile，并配合限流。
- 不允许匿名 SMTP 转发，也不开放无限量的公共邮箱注册。
- 管理操作和安全事件写入审计日志。
- 皮肤和披风上传必须校验 PNG 和尺寸，保持单文件 1 MB 上限，并使用内容哈希文件名。
- 同时备份数据库和 `auth-uploads` 纹理卷。
- 注册接口避免暴露邮箱或用户名是否已存在。
- 备份数据库和邮件存储，加密备份，并定期测试恢复。
- 数据库转储和 `privkey.pem` 都按敏感数据保管。

## 备份与恢复

数据库：

```sh
docker compose stop auth-api
docker compose exec -T db pg_dump -U umc_auth -d umc_auth -Fc > umc-auth-$(date +%F).dump
docker compose start auth-api
```

皮肤和披风文件：

```sh
docker run --rm -v umc-auth_auth-uploads:/data -v "$PWD":/backup \
  alpine tar czf /backup/auth-uploads-$(date +%F).tar.gz -C /data .
```

如果 Compose 项目名不是 `umc-auth`，请先用 `docker volume ls` 确认卷名。

恢复时先停止 API：

```sh
docker compose stop auth-api
docker compose exec -T db pg_restore -U umc_auth -d umc_auth --clean --if-exists < umc-auth.dump
docker compose start auth-api
```

启用邮件 profile 时，还需要在停止邮件容器后备份 Stalwart 卷：

```sh
docker compose --profile mail stop mail
docker run --rm -v umc-auth_stalwart-data:/data -v "$PWD":/backup \
  stalwartlabs/stalwart:v1 tar czf /backup/stalwart-data-$(date +%F).tar.gz -C /data .
docker run --rm -v umc-auth_stalwart-etc:/data -v "$PWD":/backup \
  stalwartlabs/stalwart:v1 tar czf /backup/stalwart-etc-$(date +%F).tar.gz -C /data .
docker compose --profile mail start mail
```

至少保留 7 份每日备份和 4 份每周备份，复制到另一台设备，并定期实际恢复一次。从未恢复过的备份只是猜测。

## 实施阶段

| 阶段 | 范围 | 状态 |
|---|---|---|
| 1 | Docker 基础环境：Compose、Nginx、PostgreSQL、域名和 HTTPS | `deploy/` 中已有环境脚手架 |
| 2 | 账号 API 与数据模型：REST v1、迁移、会话、验证码、找回密码 | 已实现 |
| 3 | 自建邮件：SMTP/IMAP、外部送达测试、SPF/DKIM/DMARC/PTR | 已实现；外部 DNS/PTR 待配置 |
| 4 | 用户中心：Vue 3 面板、个人资料、会话、修改邮箱 | 已实现；修改邮箱待开发 |
| 5 | Minecraft 档案与管理：皮肤、披风、签名纹理、服务器登记、加入记录、审计搜索 | 已实现 |
| 6 | Minecraft 协议：档案、皮肤、Session Server、启动器/服务端接入 | Yggdrasil 接口已实现；启动器接入另行推进 |
| 7 | 安全与发布：镜像构建、限流测试、送达测试、恢复演练 | 计划中 |

### 第二阶段已交付

第二阶段让 Go 服务成为 Vue 面板和邮件系统的账号后端，同时不破坏 Yggdrasil 接口。

1. **契约。** [`protocols/auth-v1.md`](https://github.com/UMC-Community/UMC-Auth/blob/main/protocols/auth-v1.md)
   和 [`protocols/auth-v1.yaml`](https://github.com/UMC-Community/UMC-Auth/blob/main/protocols/auth-v1.yaml) 定义 `/api/v1`。
2. **迁移。** 内嵌版本化 SQL 迁移替代启动时建表。`0002` 增加规范化身份列、角色、状态、
   会话、验证码、重置令牌、登录记录和发件箱，并原地回填已有数据。
3. **会话。** Access Token 默认 15 分钟；Refresh Token 默认 30 天并轮换。重复使用已轮换的
   Refresh Token 会撤销整个会话族。
4. **邮箱验证码。** 六位数字、10 分钟有效、最多 5 次尝试、60 秒重发间隔，并通过发件箱重试
   SMTP 失败。
5. **管理端 API。** 用户搜索、禁用/启用、角色变更、手动验证、重置密码、审计、邮件日志和统计。
6. **测试。** 存储集成测试和 HTTP 级测试覆盖注册、登录、刷新、重用检测、登出、管理操作、
   邮箱验证码、重置码和发件箱。

### 第三阶段已交付

第三阶段增加可选的 Stalwart 邮件 profile：

- Stalwart v1 提供 SMTP、提交、IMAPS、ManageSieve、DKIM 和仅回环的管理界面。
- `deploy/scripts/provision-mail.sh` 完成 bootstrap、域名、DKIM、管理员、no-reply 账号和
  TLS 证书设置。
- 认证服务通过 `mail.example.com:465` 和隐式 TLS 发信，Docker 网络别名使证书校验使用公网主机名。
- 发件箱、SMTP 提交、IMAP 投递和 DKIM 签名已经端到端测试。
- 外部送达前需要发布 `mail/dns-records.txt` 并配置 PTR。

### 第四阶段已交付

第四阶段增加 Vue 3 用户中心和管理面板：

- 源码位于 `web`（Vue 3、Vue Router、Vite），构建到 `web/dist`。
- `deploy/scripts/build-web.sh` 使用固定 `node:22-alpine` 镜像构建，主机不需要安装 Node。
- Nginx 在 `account.example.com` 提供 SPA，支持 history 模式回退，并把 `/api/` 代理到
  `auth-api:8080`，使 Refresh Cookie 保持第一方。
- 页面覆盖注册、邮箱验证、登录、找回密码、仪表盘、会话、个人资料、管理概览、用户、审计和发件箱。
- Access Token 只保存在内存；Refresh Token 保存在 HttpOnly Cookie。另有一个非敏感提示 Cookie，
  避免游客页发起无意义的刷新请求。
- 已用 headless Chrome 测试注册、登录、刷新恢复、管理端角色/状态/密码操作，以及移动端无横向溢出。

### 第五阶段已交付

第五阶段增加 Minecraft 身份和服务器管理：

- 迁移 `0005` 创建 `minecraft_profiles`、`server_instances` 和 `server_join_records`，并为已有账号
  回填档案。
- 个人资料页可上传皮肤（64×64 或 64×32，classic/slim）和披风（64×32 或 64×64），单文件上限
  1 MB，并以像素化方式预览。
- 纹理文件按 SHA-256 命名，保存在 `UPLOAD_DIR`（即 `auth-uploads` 卷），通过
  `/textures/{kind}/{uuid}/{hash}` 以不可变缓存提供。
- Yggdrasil 档案现在包含带签名的 `textures` 属性。服务使用 RSA 密钥、PKCS#1 v1.5 和 SHA-256
  对 base64 载荷签名；公钥仍可从 `/api/yggdrasil` 元数据获取。
- Yggdrasil `join` 接口记录用户名、服务器 id、客户端 IP 和时间。
- 管理面板增加“服务器”页，可登记服务器、启用/禁用、删除，并筛选加入记录。审计搜索支持
  匹配操作者、动作和详情。
- Go 测试覆盖签名验证、上传/读取/删除、服务器 CRUD、加入记录和审计搜索。

下一个实施阶段是启动器/服务端接入与发布加固。

## 相关页面

- [UMC Auth](./auth) — 账号服务概览和配置
- [UMC Auth API v1](../reference/auth-v1) — 正式 `/api/v1` 契约
- [Java 版服务器](./java-server) — 使用这套认证运行游戏服务端
- [服务概览](./) — 每个可选服务的用途
