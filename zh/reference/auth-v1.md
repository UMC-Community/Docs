---
source: en/reference/auth-v1.md
---

# UMC Auth API v1

状态：已由 `UMC-Auth` 实现。本页是 Vue 用户中心、启动器和管理客户端使用的账号 API 契约。
Minecraft 兼容的 Yggdrasil API 仍位于 `/api/yggdrasil`，另行文档化。

## 基础地址

```text
https://auth.example.com/api/v1
```

用户中心可以在 `account.example.com` 上调用 `/api/v1`，由 Nginx 代理到同一个服务，使浏览器 Cookie
保持第一方。不要跨域调用这些接口。

auth 域名只返回 JSON。`GET /` 返回服务元数据：
`{"service":"UMC Auth","api":"...","yggdrasil":"..."}`。`/login` 等页面路径返回 JSON `404`；
浏览器界面只由 account 域名提供。

## 约定

- HTTPS + JSON，UTF-8，`Content-Type: application/json`。
- 字段使用 `snake_case`。
- 时间戳是 Unix 秒（UTC）。
- 玩家 ID 是 32 位小写十六进制字符，不带连字符。响应同时给出 `id` 和 `uuid`，值相同。
- 未知 JSON 字段会返回 `400 invalid_json`。
- 所有错误使用同一结构：

```json
{
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid login or password"
  }
}
```

## 认证

### API 客户端

`POST /api/v1/auth/login`、`/register`（关闭邮箱验证时）和 `/verify-email` 返回：

```json
{
  "access_token": "opaque-token",
  "refresh_token": "opaque-token",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_expires_in": 2592000,
  "user": {},
  "session": {}
}
```

请求时携带：

```http
Authorization: Bearer opaque-token
```

Access Token 默认 15 分钟（`ACCESS_TOKEN_MINUTES`）。Refresh Token 默认 30 天
（`REFRESH_TOKEN_DAYS`），每次刷新都会轮换。数据库只保存 SHA-256 哈希。

### Web 客户端

登录、注册或刷新时发送 `"client": "web"`。Refresh Token 不再放在 JSON 中，而是写入 HttpOnly Cookie：

- 名称：`umc_auth_refresh`
- 路径：`/api/v1/auth`
- `HttpOnly`；HTTPS 下带 `Secure`；`SameSite=Lax`
- 有效期：`REFRESH_TOKEN_DAYS`

浏览器只在内存中保存短时 Access Token，并以 Bearer 方式发送。页面刷新时调用无请求体的
`POST /api/v1/auth/refresh`，由 Cookie 完成刷新。

### Refresh Token 重用

Refresh Token 会轮换。再次使用已经用过的 Refresh Token 会撤销整个会话族，并返回
`401 invalid_grant`，用户必须重新登录。

## 端点

### 服务器元数据

`GET /api/v1/meta`

未登录的用户中心用于读取公开配置：

```json
{
  "server_name": "UMC Auth",
  "registration_mode": "invite",
  "registration_open": true,
  "first_account": false,
  "bootstrap_required": false,
  "email_verification": "required",
  "captcha_mode": "pow",
  "turnstile_site_key": "",
  "auth_origin": "https://auth.example.com",
  "yggdrasil_url": "https://auth.example.com/api/yggdrasil"
}
```

`registration_open` 仅在注册关闭且已有账号时为 false；`first_account` 在实例还没有账号时为 true；`bootstrap_required` 仅在首账号必须提供 `BOOTSTRAP_TOKEN` 时为 true。

### 注册

`POST /api/v1/auth/register`

```json
{
  "username": "Player_1",
  "email": "player@example.com",
  "password": "at-least-8-characters",
  "invite_code": "UMC-XXXX-XXXX-XXXX",
  "bootstrap_token": "",
  "turnstile_token": "",
  "pow_token": "",
  "pow_nonce": "",
  "client": "web"
}
```

- 用户名：3–16 位 ASCII 字母、数字或下划线。
- 密码：8–128 个字符。
- 邮箱必填，并统一规范化为小写。
- `REGISTRATION_MODE=invite` 时需要 `invite_code`。
- 设置 `BOOTSTRAP_TOKEN` 时，第一个账号需要 `bootstrap_token`。
- 实例启用 Turnstile 或工作量证明时，需要对应字段。
- 第一个账号自动成为 superadmin 并直接通过验证。

需要邮箱验证时返回：

```http
HTTP/1.1 202 Accepted
```

```json
{
  "verification_required": true,
  "message": "Check your email for a six-digit verification code",
  "user": { "email_verified": false, "status": "pending" }
}
```

否则返回 `201 Created` 和上面的 Token 响应。

用户名或邮箱重复时统一返回 `409 registration_conflict`，不暴露具体是哪个字段冲突。

### 验证邮箱

`POST /api/v1/auth/verify-email`

```json
{"email": "player@example.com", "code": "123456", "client": "web"}
```

验证码为六位数字，10 分钟有效，最多尝试 5 次。成功后邮箱标记为已验证，账号激活，并返回 Token 响应。

### 重发验证码

`POST /api/v1/auth/verify-email/resend`

```json
{"email": "player@example.com"}
```

请求有效时始终返回 `202 Accepted`，无论地址是否存在。60 秒内再次请求返回
`429 resend_too_soon`。

### 登录

`POST /api/v1/auth/login`

```json
{"login": "Player_1", "password": "secret", "client": "web"}
```

`login` 可以是用户名或邮箱。密码验证通过后，才会检查禁用、锁定和未验证状态。

同一 IP 和登录名在 15 分钟内失败 10 次后返回 `429 account_locked`，直到窗口过期。

### 刷新

`POST /api/v1/auth/refresh`

```json
{"refresh_token": "opaque-token", "client": "api"}
```

Web 客户端可以不传请求体，直接使用 `umc_auth_refresh` Cookie。刷新成功后旧 Refresh Token 失效，
返回新的 Access Token。Web 响应会设置新 Cookie，并且不在 JSON 中返回 `refresh_token`。

### 登出

`POST /api/v1/auth/logout`

```json
{"refresh_token": "opaque-token"}
```

Refresh Token 也可以来自 Cookie，或改用 Bearer Access Token。会话被撤销，Refresh Cookie 被清除。
接口幂等，返回 `204 No Content`。

### 忘记密码

`POST /api/v1/auth/password/forgot`

```json
{"email": "player@example.com"}
```

有效请求始终返回 `202 Accepted`。如果地址存在、已验证且未禁用，会发送六位重置码。验证码 10 分钟有效，
最多尝试 5 次，只保存哈希。

### 重置密码

`POST /api/v1/auth/password/reset`

```json
{
  "email": "player@example.com",
  "code": "654321",
  "new_password": "new-at-least-8-characters"
}
```

重置成功会撤销该账号的所有会话和 Yggdrasil Token，返回 `204 No Content`。

### 当前用户

`GET /api/v1/users/me`

需要 Bearer Access Token。

```json
{
  "user": {
    "id": "32-hex",
    "uuid": "32-hex",
    "username": "Player_1",
    "email": "player@example.com",
    "email_verified": true,
    "role": "user",
    "status": "active",
    "created_at": 1790000000,
    "updated_at": 1790000000
  },
  "session": {
    "id": "session-public-id",
    "client": "web",
    "ip": "203.0.113.10",
    "user_agent": "Mozilla/5.0",
    "created_at": 1790000000,
    "last_used_at": 1790000000,
    "expires_at": 1792592000,
    "current": true
  }
}
```

### 会话

`GET /api/v1/users/me/sessions`

按创建时间倒序返回当前账号的活动会话。

`DELETE /api/v1/users/me/sessions/{id}`

按公开 `id` 撤销会话。撤销当前会话会清除 Refresh Cookie。返回 `204 No Content` 或 `404 not_found`。

### 档案

`GET /api/v1/profiles/{uuid}`

`GET /api/v1/profiles/by-username/{name}`

公开档案查询，使用与 Yggdrasil 档案查询相同的按 IP 限流。

```json
{"id": "32-hex", "name": "Player_1", "properties": []}
```

设置皮肤或披风后，`properties` 会包含与 Yggdrasil 档案接口相同格式的带签名 `textures` 条目：

```json
{
  "name": "textures",
  "value": "base64-json",
  "signature": "base64-rsa-sha256"
}
```

解码后的 `value` 包含 `timestamp`、`profileId`、`profileName`，以及带 `SKIN` 和/或 `CAPE`
地址的 `textures` 对象；皮肤的 `metadata.model` 为 `classic` 或 `slim`。签名是使用服务 RSA
密钥对 base64 `value` 字符串做 SHA-256 后的 PKCS#1 v1.5 签名。对应公钥可从 `/api/yggdrasil`
元数据获取。

### Minecraft 档案

`GET /api/v1/users/me/minecraft`

```json
{
  "profile": {
    "uuid": "32-hex",
    "name": "Player_1",
    "skin_url": "https://auth.example.com/textures/skin/32-hex/sha256-hex",
    "cape_url": "",
    "skin_model": "classic",
    "updated_at": 1790000000
  }
}
```

`POST /api/v1/users/me/skin`

`multipart/form-data`，包含 `file`（PNG，64×64 或 64×32，最大 1 MB）和可选的 `model`
（`classic` 或 `slim`，默认 `classic`）。请求体上限为 2 MB。返回更新后的档案。

`DELETE /api/v1/users/me/skin`

删除当前皮肤，返回更新后的档案。

`POST /api/v1/users/me/cape`

`multipart/form-data`，包含 `file`（64×32 或 64×64 PNG，最大 1 MB）。返回更新后的档案。

`DELETE /api/v1/users/me/cape`

删除当前披风，返回更新后的档案。

纹理文件可公开访问且不可变：`GET /textures/{skin|cape}/{uuid}/{sha256}`，响应类型为
`image/png` 并带长期缓存头。上传新文件会改变 URL，因此客户端不会看到旧纹理。

## 管理端 API

所有管理端接口都需要 staff 权限。`moderator` 可以查看用户列表和审计日志；用户状态、角色、手动验证、
重置密码、邮件和统计接口需要 `admin` 或 `superadmin`。角色为 `user`、`moderator`、`admin`、`superadmin`。

- 管理员不能修改自己的角色或状态。
- 只有 `superadmin` 能修改其他管理员、授予 `admin` 或管理 `superadmin`。
- 所有变更都会写入审计日志。

| 端点 | 用途 |
|---|---|
| `GET /api/v1/admin/users?query=&limit=&offset=` | 搜索用户名、邮箱或 UUID |
| `GET /api/v1/admin/users/{uuid}` | 查看单个账号 |
| `POST /api/v1/admin/users/{uuid}/status` | `{"disabled": true}` 封禁或解封 |
| `POST /api/v1/admin/users/{uuid}/role` | `{"role": "moderator"}` |
| `POST /api/v1/admin/users/{uuid}/verify-email` | 手动标记邮箱已验证 |
| `POST /api/v1/admin/users/{uuid}/reset-password` | 设置 `new_password`，或生成一次性返回的 `generated_password` |
| `GET /api/v1/admin/audit?query=&limit=` | 最近审计记录，可按操作者、动作或详情筛选 |
| `GET /api/v1/admin/mail?status=&limit=` | 发件箱元数据（不返回邮件正文） |
| `POST /api/v1/admin/mail/{id}/retry` | 重置失败邮件并重试 |
| `GET /api/v1/admin/stats` | 用户和邮件计数 |
| `GET /api/v1/admin/invites?limit=` | 邀请码列表，包含状态、使用次数和过期时间 |
| `POST /api/v1/admin/invites` | `{"count", "uses", "days", "note"}`；仅本次返回明文 `codes` |
| `POST /api/v1/admin/invites/{id}/revoke` | 吊销邀请码 |
| `GET /api/v1/admin/servers?limit=` | 已登记的游戏服务器 |
| `POST /api/v1/admin/servers` | `{"name", "address", "description"}` 登记服务器 |
| `POST /api/v1/admin/servers/{id}/status` | `{"status": "active" \| "disabled"}` |
| `DELETE /api/v1/admin/servers/{id}` | 删除服务器；加入记录保留 |
| `GET /api/v1/admin/servers/joins?server_id=&limit=` | 最近的 Yggdrasil 加入记录 |

服务器管理需要 `admin` 或 `superadmin`。加入记录由 Yggdrasil `join` 接口写入，包含用户名、
服务器 id、客户端 IP 和时间戳。

## 限流

| 范围 | 默认值 |
|---|---|
| 注册 | `REGISTER_LIMIT_PER_HOUR`、`REGISTER_LIMIT_PER_DAY`、全站每小时预算 |
| 登录 | `LOGIN_LIMIT_PER_MINUTE` |
| 刷新 | `REFRESH_LIMIT_PER_MINUTE` |
| 验证与重发 | `VERIFY_LIMIT_PER_MINUTE` |
| 忘记密码与重置 | `FORGOT_LIMIT_PER_MINUTE` |
| 档案查询 | `PROFILE_LOOKUP_LIMIT_PER_MINUTE` |

限流在单个 auth 容器内存中实现。Nginx 还会执行边缘限流。触发限制时返回 `429`，可能带
`Retry-After`（秒）。

## 错误码

| 代码 | 状态 | 含义 |
|---|---|---|
| `invalid_json` | 400 | JSON 格式错误或包含未知字段 |
| `invalid_username` | 400 | 用户名不合法 |
| `invalid_email` | 400 | 邮箱格式错误 |
| `weak_password` | 400 | 密码不合法 |
| `invalid_code` | 400 | 验证码或重置码错误/过期 |
| `invalid_texture` | 400 | 上传的皮肤或披风不是有效 PNG，或尺寸不符合要求 |
| `invalid_model` | 400 | 皮肤模型不是 `classic` 或 `slim` |
| `invalid_credentials` | 401 | 登录名或密码错误 |
| `unauthorized` | 401 | 缺少或无效的 Bearer Token |
| `invalid_grant` | 401 | Refresh Token 无效、过期或已被重用 |
| `forbidden` | 403 | 角色或所有权检查失败 |
| `account_disabled` | 403 | 账号已禁用 |
| `account_locked` | 429 | 登录失败次数过多 |
| `email_not_verified` | 403 | 需要先验证邮箱 |
| `registration_conflict` | 409 | 用户名或邮箱已注册 |
| `server_conflict` | 409 | 同名游戏服务器已存在 |
| `registration_closed` | 403 | 注册已关闭 |
| `invite_required` / `invalid_invite` | 403 | 邀请码缺失或无效 |
| `bootstrap_required` | 403 | 首账号引导令牌错误 |
| `captcha_failed` | 400 | Turnstile 或工作量证明失败 |
| `email_unavailable` | 503 | 未配置 SMTP |
| `too_many_requests` | 429 | 触发限流 |
| `not_found` | 404 | 资源不存在 |
| `internal_error` | 500 | 服务端异常 |

## 兼容性

- Yggdrasil 端点继续位于 `/api/yggdrasil`，供 authlib-injector 和 Minecraft 服务端使用。
- Vue 面板完成前，现有注册页和管理页继续可用。
- 密码使用 Argon2id。Access、Refresh、会话、邀请码和验证密钥只保存哈希。
- 本 API 不认证 Microsoft 账号，也不验证 Minecraft 所有权。
