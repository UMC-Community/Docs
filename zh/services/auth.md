---
source: en/services/auth.md
---

# UMC Auth

UMC Auth 是一个可选的、自托管的 Minecraft: Java Edition 社区账号与认证服务。它提供注册网站，以及供 [authlib-injector](https://github.com/yushijinhun/authlib-injector) 或支持外置登录的启动器使用的 Yggdrasil 兼容 API。源码和部署文件位于 [UMC-Auth 仓库](https://github.com/UMC-Community/UMC-Auth)。

它使用 Go 编写，账号存储在 PostgreSQL 中。该服务独立于 `umc` 和 `umcd`，社区可以把它和 UMC 配套运行，也可以配其他启动器使用。

## 部署

UMC Auth 由三个容器组成：Nginx、Go 认证 API 和 PostgreSQL。Nginx 是唯一公网入口，认证 API 和数据库位于内部 Docker 网络。用户中心域名提供 Vue 用户中心和管理面板，并把 `/api/` 代理到认证服务。

部署环境位于 `deploy`。架构、环境变量、Nginx 配置、数据模型、邮件规划和资源预算见 [UMC Auth 部署环境](./auth-deployment)。启动器的 Microsoft 登录路线独立存在，保持不变。

## 提供的能力

- 用户名和密码注册
- 每个账号一个稳定的 32 位 Minecraft UUID
- Argon2id 密码哈希
- 面向 Vue 面板、启动器和外部客户端的版本化 `/api/v1` 账号 API
- `account` 域名上的 Vue 3 用户中心和管理面板
- 短时 Access Token、轮换 Refresh Token 和重用检测
- 六位数字邮箱验证码和重置密码验证码，带发件箱重试
- `user`、`moderator`、`admin`、`superadmin` 角色
- Yggdrasil `authenticate`、`refresh`、`validate`、`invalidate`、`signout`、`join`、`hasJoined` 和档案接口
- Minecraft 皮肤和披风，以及带签名的 `textures` 档案属性
- 短时 Access Token 和 HttpOnly、SameSite=Lax 的 Refresh Cookie
- 用户、游戏服务器和审计的管理页面；角色、手动验证、重置密码、邮件日志、加入记录和统计的管理 API
- 可选的 Cloudflare Turnstile 或自建工作量证明
- 按 IP、IPv6 `/64` 和全局限流
- 通过 Nginx 和运营者提供的证书启用 HTTPS

## 环境要求

- 带 Docker 和 Docker Compose 的 Linux 服务器
- 指向服务器的两个域名：`auth` 和 `account`
- 覆盖两个域名的证书，或通配符证书
- TCP 80/443 可访问
- 自建邮件需要邮件主机名、TCP 25/465/993，以及 DNS/PTR 控制权

Compose 会自动启动 PostgreSQL 17。如果在 Docker 外运行，需要 Go 1.24+ 和 PostgreSQL 17。

## 部署

在仓库中执行：

```sh
cd deploy
./scripts/setup.sh
```

编辑 `deploy/.env`：

```ini
AUTH_DOMAIN=auth.example.com
ACCOUNT_DOMAIN=account.example.com
POSTGRES_PASSWORD=使用一个长随机密码
SERVER_NAME=Example Auth
BOOTSTRAP_TOKEN=使用一个长随机引导令牌
REGISTRATION_MODE=invite
```

把 `fullchain.pem` 和 `privkey.pem` 放到 `deploy/certs`，构建 Vue 面板，然后启动：

```sh
./scripts/build-web.sh
docker compose up -d --build
```

打开：

```text
https://account.example.com/
```

在 `/register` 注册第一个账号。如果设置了 `BOOTSTRAP_TOKEN`，注册页会要求填写。第一个账号会成为 superadmin，并绕过邀请码、CAPTCHA 和邮箱验证，以便初始化实例。初始化完成后请删除或更换 `BOOTSTRAP_TOKEN`。

auth 域名只提供 API。`/`、`/api/v1`、`/api/yggdrasil` 和 `/textures/` 返回 JSON，其他路径返回 JSON `404`。登录和注册页面位于 `https://account.example.com/`。

## 认证地址

把下面的地址填入 authlib-injector 或支持外置登录的启动器：

```text
https://auth.example.com/api/yggdrasil
```

Minecraft 服务端使用同样的 agent，并保持 `online-mode=true`：

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

玩家先在网站注册，然后通过启动器登录。服务端通过 `hasJoined` 验证每次进入，并拿到账号 UUID。

## 注册模式

| 模式 | 行为 |
|---|---|
| `invite` | 必须提供邀请码，适合私有社区 |
| `open` | 所有人可注册，应配合 PoW 或 Turnstile 以及限流 |
| `closed` | 关闭新注册，但第一个账号仍可用于初始化 |

在 `deploy/.env` 中设置 `REGISTRATION_MODE`。

### 邀请码

管理员在账号面板中创建邀请码：

```text
https://account.example.com/admin/invites
```

邀请码可以设置最大使用次数、过期时间和备注。明文只在创建时显示一次，数据库只保存 SHA-256 哈希，并且可以随时吊销。

注册链接可以预填邀请码：

```text
https://account.example.com/register?invite=UMC-XXXX-XXXX-XXXX
```

## 用户中心与管理后台

`https://account.example.com` 上的 Vue 3 面板提供注册、邮箱验证、登录、找回密码、账号仪表盘、会话、皮肤/披风编辑和个人资料。staff 和管理员还可以使用用户搜索、状态、角色、手动验证、重置密码、邀请码、审计日志、游戏服务器、加入记录和发件箱页面。

目前没有独立的管理员密码，也没有两步验证。

## 邮箱验证

邮箱验证是可选的。可以使用外部 SMTP 提供商，也可以使用随部署环境提供的 Stalwart 邮件 profile。

外部 SMTP：

```ini
EMAIL_VERIFICATION=required
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=starttls
```

自建 Stalwart：

```ini
EMAIL_VERIFICATION=required
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=...
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=implicit
```

运行 `deploy/scripts/provision-mail.sh` 可创建邮件域名、DKIM 密钥、管理员、
no-reply 账号和 TLS 证书。参见[部署环境](./auth-deployment#自建邮件-stalwart)。

`SMTP_TLS` 支持 `starttls`、`implicit` 和 `none`。

启用后：

- 账号 API 注册会创建待验证账号，并发送六位数字验证码，10 分钟有效、最多 5 次尝试、
  60 秒重发间隔。
- 旧 Web 表单发送 24 小时有效的一次性验证链接。
- 未验证账号不能登录，也不能通过 Yggdrasil 认证。
- 验证 Token 只保存哈希。

第一个 superadmin 会自动视为已验证，以便在 SMTP 尚未配置好时完成初始化。

## Turnstile 与工作量证明

```ini
CAPTCHA_MODE=turnstile
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

或者：

```ini
CAPTCHA_MODE=pow
POW_DIFFICULTY=16
```

- **Turnstile** 通常无感，但浏览器必须能访问 Cloudflare，部分网络下可能不稳定。它的 Token 只适用于浏览器，不能给 API 客户端使用。
- **工作量证明** 完全自建。浏览器在注册前求解一个短 SHA-256 挑战，不依赖第三方网络，也适合 API 客户端。

挑战绑定客户端地址，5 分钟后过期，并且只能使用一次。

## 限流

| 变量 | 默认值 | 含义 |
|---|---|---|
| `REGISTER_LIMIT_PER_HOUR` | `3` | 每个 IPv4 地址或 IPv6 `/64` 每小时注册数 |
| `REGISTER_LIMIT_PER_DAY` | `10` | 每个地址每天注册数 |
| `REGISTER_LIMIT_GLOBAL_PER_HOUR` | `100` | 全站每小时注册预算 |
| `LOGIN_LIMIT_PER_MINUTE` | `10` | 登录和 Yggdrasil 认证尝试次数 |
| `POW_CHALLENGE_LIMIT_PER_MINUTE` | `30` | 工作量证明挑战请求数 |
| `PROFILE_LOOKUP_LIMIT_PER_MINUTE` | `60` | 批量用户名查询次数 |
| `VERIFY_LIMIT_PER_MINUTE` | `10` | 邮箱验证和重发请求数 |
| `REFRESH_LIMIT_PER_MINUTE` | `60` | Access Token 刷新请求数 |
| `FORGOT_LIMIT_PER_MINUTE` | `5` | 找回密码请求数 |

限流在 auth 容器内存中实现，容器重启后会重置。多副本部署时请增加共享限流或边缘代理。

## HTTPS

当 `PUBLIC_ORIGIN` 是 `http://` 时，服务默认拒绝启动，除非设置：

```ini
ALLOW_INSECURE_HTTP=true
```

这只应在本机开发时使用。生产环境中 Nginx 负责 TLS、HTTP 到 HTTPS 跳转、HSTS，并保证 auth 容器端口不直接对外。续期证书后，在 `deploy` 中重新加载 Nginx：

```sh
docker compose exec nginx nginx -s reload
```

在能解析 DNS 的机器上验证部署：

```sh
AUTH_DOMAIN=auth.example.com ACCOUNT_DOMAIN=account.example.com ./scripts/check-deployment.sh
```

脚本会检查：

- HTTP 是否跳转 HTTPS
- TLS 证书链是否可信
- 证书是否至少还有 7 天
- auth 域名的 HSTS
- `/healthz` 和 `/` 的 JSON 服务信息
- Yggdrasil 元数据 Content-Type
- auth 域名的页面路径是否返回 JSON `404`
- 8080 端口是否未直接暴露
- 账号面板的 CSP、HSTS、登录页、API 代理和 SPA 深链接回退

## 账号 API v1

服务在 `/api/v1` 下提供 JSON 账号 API，供 Vue 用户中心、启动器和管理客户端使用：

```text
POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/verify-email/resend
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
GET  /api/v1/users/me
GET  /api/v1/users/me/sessions
DELETE /api/v1/users/me/sessions/{id}
GET  /api/v1/users/me/minecraft
POST /api/v1/users/me/skin
DELETE /api/v1/users/me/skin
POST /api/v1/users/me/cape
DELETE /api/v1/users/me/cape
GET  /api/v1/profiles/{uuid}
GET  /api/v1/profiles/by-username/{name}
GET  /textures/{skin|cape}/{uuid}/{sha256}
```

`/api/v1/admin/` 下的管理端接口覆盖用户搜索、禁用/启用、角色、手动验证邮箱、重置密码、邀请码、
审计搜索、发件箱、游戏服务器登记、加入记录和统计。正式契约见 [UMC Auth API v1](../reference/auth-v1)。

Access Token 默认 15 分钟。Refresh Token 默认 30 天，每次使用都会轮换；重复使用会撤销整个会话族。
Web 客户端通过 HttpOnly Cookie 接收 Refresh Token，其他客户端从 JSON 中获取。

## API

元数据：

```text
GET /api/yggdrasil
```

Yggdrasil：

```text
POST /api/yggdrasil/authserver/authenticate
POST /api/yggdrasil/authserver/refresh
POST /api/yggdrasil/authserver/validate
POST /api/yggdrasil/authserver/invalidate
POST /api/yggdrasil/authserver/signout
POST /api/yggdrasil/sessionserver/session/minecraft/join
GET  /api/yggdrasil/sessionserver/session/minecraft/hasJoined
GET  /api/yggdrasil/sessionserver/session/minecraft/profile/{uuid}
GET  /api/yggdrasil/api/user/profile/{uuid}
POST /api/yggdrasil/api/profiles/minecraft
GET  /api/register/challenge
```

网站：

```text
GET  /register
GET  /login
GET  /dashboard
GET  /verify-email?token=...
GET  /admin
GET  /healthz
```

## 备份与恢复

账号、RSA 签名密钥和 Minecraft 档案保存在 `auth-db` PostgreSQL 卷中。上传的皮肤和披风保存在
`auth-uploads` 卷中。在 `deploy` 中执行：

```sh
docker compose stop auth-api
docker compose exec -T db pg_dump -U umc_auth -d umc_auth -Fc > umc-auth.dump
docker run --rm -v umc-auth_auth-uploads:/data -v "$PWD":/backup \
  alpine tar czf /backup/auth-uploads.tar.gz -C /data .
docker compose start auth-api
```

如果 Compose 项目名不同，请先用 `docker volume ls` 确认卷名。

恢复时先停止 auth 服务：

```sh
docker compose stop auth-api
docker compose exec -T db pg_restore -U umc_auth -d umc_auth --clean --if-exists < umc-auth.dump
docker compose start auth-api
```

数据库转储包含密码哈希、Token 哈希和私钥，请按敏感数据保管。

## 安全说明

- 密码使用 Argon2id；访问 Token 和 Web 会话 Token 只保存 SHA-256 哈希。
- 上传文件限制为 1 MB，并校验 PNG 及皮肤/披风尺寸；纹理 URL 带内容哈希且不可变。
- Refresh Cookie 为 HttpOnly + SameSite=Lax；Access Token 为短时 Bearer Token。auth 域名不提供 HTML 表单。
- auth 容器以非 root 用户运行，根文件系统只读。
- 公网只暴露 Nginx 的 80/443；auth 应用和 PostgreSQL 端口保持内部访问。
- 公开注册通常应使用邀请码，或启用 CAPTCHA/PoW 并配合限流。

## 当前限制

- 没有修改邮箱或用户自助删除账号。
- 管理员设置仍是环境变量，修改后需要重启。
- 管理员没有两步验证。
- OAuth 客户端仍在规划中；游戏服务器登记和 Yggdrasil 加入记录已可在管理面板使用。
- UMC 启动器的 Microsoft 登录路线独立存在；本服务不实现客户端侧三方服认证。

## 开发

运行检查：

```sh
./scripts/check.sh
```

本机连接 PostgreSQL 运行：

```sh
PUBLIC_ORIGIN=http://127.0.0.1:8080 \
ALLOW_INSECURE_HTTP=true \
COOKIE_SECURE=false \
BIND_ADDR=127.0.0.1:8080 \
DATABASE_URL="host=127.0.0.1 port=5432 user=umc_auth dbname=umc_auth sslmode=disable" \
PGPASSWORD=devpassword \
go run ./cmd/umc-auth
```
