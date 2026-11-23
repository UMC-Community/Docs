# UMC Auth

UMC Auth is an optional self-hosted account and authentication service for Minecraft: Java Edition
communities. It provides a registration website and a Yggdrasil-compatible API for servers that use
[authlib-injector](https://github.com/yushijinhun/authlib-injector) or a launcher with external
authentication support.

It is written in Go and stores accounts in PostgreSQL. The service is independent from `umc` and
`umcd`; a community can run it next to UMC or with another launcher.

## Deployment

UMC Auth runs as three containers: Nginx, the Go auth API, and PostgreSQL. Nginx is the only public
entrypoint. The auth API and database stay on internal Docker networks. The account host serves the
Vue user center and admin panel and proxies `/api/` to the same auth service.

The deployment environment lives in `services/auth/deploy`. See
[UMC Auth deployment environment](./auth-deployment) for its architecture, environment variables,
Nginx configuration, data model, mail plan, and resource budget. The launcher's Microsoft sign-in
route is separate and unchanged.

## What it provides

- Username and password registration
- A stable 32-character Minecraft UUID per account
- Argon2id password hashing
- A versioned `/api/v1` account API for the Vue panel, launchers, and external clients
- A Vue 3 user center and admin panel at the account host
- Short-lived access tokens with rotating refresh tokens and reuse detection
- Six-digit email verification and password reset codes with an outbox
- `user`, `moderator`, `admin`, and `superadmin` roles
- Yggdrasil `authenticate`, `refresh`, `validate`, `invalidate`, `signout`, `join`, `hasJoined`, and
  profile endpoints
- Minecraft skins and capes with signed `textures` profile properties
- Short-lived access tokens with HttpOnly, SameSite=Lax refresh cookies
- Admin UI for users, servers, and audit; admin API for roles, manual verification, password reset,
  mail logs, join history, and statistics
- Optional Cloudflare Turnstile or self-hosted proof-of-work
- Per-IP, IPv6 `/64`, and global rate limits
- HTTPS through Nginx with operator-provided certificates

## Requirements

- Linux server with Docker and Docker Compose
- Two DNS names pointing at the server: `auth` and `account`
- A TLS certificate covering both names, or a wildcard certificate
- TCP ports 80 and 443 reachable
- For self-hosted mail: a mail hostname, TCP ports 25/465/993, and DNS/PTR control

The Compose stack starts PostgreSQL 17 automatically. Running outside Docker needs Go 1.24+ and a
PostgreSQL 17 database.

## Deploy

From the repository:

```sh
cd services/auth/deploy
./scripts/setup.sh
```

Edit `deploy/.env`:

```ini
AUTH_DOMAIN=auth.example.com
ACCOUNT_DOMAIN=account.example.com
POSTGRES_PASSWORD=use-a-long-random-password
SERVER_NAME=Example Auth
BOOTSTRAP_TOKEN=use-a-long-random-bootstrap-token
REGISTRATION_MODE=invite
```

Place `fullchain.pem` and `privkey.pem` in `deploy/certs`, build the Vue panel, then start the stack:

```sh
./scripts/build-web.sh
docker compose up -d --build
```

Open:

```text
https://account.example.com/
```

Register the first account at `/register`. If `BOOTSTRAP_TOKEN` is set, enter it on the form. The
first account becomes a superadmin and bypasses invites, CAPTCHA, and email verification so the
instance can be bootstrapped. Remove or change `BOOTSTRAP_TOKEN` after setup.

The auth host is API-only. It returns JSON from `/`, `/api/v1`, `/api/yggdrasil`, and
`/textures/`; other paths return a JSON `404`. The login and registration UI lives on
`https://account.example.com/`.

## Authentication endpoint

Give this URL to authlib-injector or a launcher that supports external authentication:

```text
https://auth.example.com/api/yggdrasil
```

For a Minecraft server, start it with the same agent and keep `online-mode=true`:

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

Players register on the website, then sign in through their launcher. The server verifies each join
through `hasJoined` and receives the account UUID.

## Registration modes

| Mode | Behavior |
|---|---|
| `invite` | An invite code is required. Recommended for private communities. |
| `open` | Anyone may register; combine with PoW or Turnstile and rate limits. |
| `closed` | New registrations are disabled. The first account can still bootstrap the instance. |

Set `REGISTRATION_MODE` in `deploy/.env`.

### Invite codes

Administrators create codes in the account panel:

```text
https://account.example.com/admin/invites
```

A code can have a maximum number of uses, an expiry date, and a note. The plaintext code is shown
once; the database stores only its SHA-256 hash. Codes can be revoked at any time.

A registration link can prefill the code:

```text
https://account.example.com/register?invite=UMC-XXXX-XXXX-XXXX
```

## User center and admin panel

The Vue 3 panel at `https://account.example.com` provides registration, email verification, login,
password recovery, the account dashboard, sessions, skin/cape editing, and profile pages. Staff and
administrators get an admin area for user search, status, roles, manual verification, password
reset, invite codes, the audit log, game servers, join history, and the mail outbox.

There is no separate admin password and no two-factor authentication yet.

## Email verification

Email verification is optional. The service can use an external SMTP provider or the bundled Stalwart
mail profile.

External SMTP:

```ini
EMAIL_VERIFICATION=required
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=starttls
```

Bundled Stalwart:

```ini
EMAIL_VERIFICATION=required
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=...
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=implicit
```

Run `services/auth/deploy/scripts/provision-mail.sh` to create the mail domain, DKIM keys,
administrator, no-reply account, and TLS certificate. See
[the deployment environment](./auth-deployment#self-hosted-mail-stalwart).

`SMTP_TLS` accepts `starttls`, `implicit`, or `none`.

When enabled:

- Account API registrations create pending accounts and send a six-digit code, valid for 10 minutes
  with five attempts and a 60-second resend interval.
- The legacy web form sends a 24-hour single-use verification link.
- Unverified accounts cannot sign in or use Yggdrasil authentication.
- Verification tokens are stored as hashes.

The first superadmin is created verified so the instance can be initialized before SMTP is
working.

## Turnstile and proof-of-work

```ini
CAPTCHA_MODE=turnstile
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

or:

```ini
CAPTCHA_MODE=pow
POW_DIFFICULTY=16
```

- **Turnstile** is usually invisible, but browsers must be able to reach Cloudflare. It may be
  unreliable on some networks. Tokens are browser-only and cannot be used by API clients.
- **Proof-of-work** is self-hosted. The browser solves a short SHA-256 challenge before
  registration. It works without third-party connectivity and is suitable for API clients.

The challenge is bound to the client address, expires after five minutes, and can be used once.

## Rate limits

| Variable | Default | Meaning |
|---|---|---|
| `REGISTER_LIMIT_PER_HOUR` | `3` | Registrations per IPv4 address or IPv6 `/64` per hour |
| `REGISTER_LIMIT_PER_DAY` | `10` | Registrations per address per day |
| `REGISTER_LIMIT_GLOBAL_PER_HOUR` | `100` | Global registration budget |
| `LOGIN_LIMIT_PER_MINUTE` | `10` | Sign-in and Yggdrasil authentication attempts |
| `POW_CHALLENGE_LIMIT_PER_MINUTE` | `30` | Proof-of-work challenge requests |
| `PROFILE_LOOKUP_LIMIT_PER_MINUTE` | `60` | Bulk profile lookups |
| `VERIFY_LIMIT_PER_MINUTE` | `10` | Email verification and resend requests |
| `REFRESH_LIMIT_PER_MINUTE` | `60` | Access-token refresh requests |
| `FORGOT_LIMIT_PER_MINUTE` | `5` | Password reset requests |

Limits are in-process and reset when the auth container restarts. For multiple replicas, add a
shared limiter or an edge proxy.

## HTTPS

The service refuses to start with an `http://` `PUBLIC_ORIGIN` unless:

```ini
ALLOW_INSECURE_HTTP=true
```

Use that only for local development. In production, Nginx terminates TLS, redirects HTTP to HTTPS,
sets HSTS, and keeps the auth container port private. After renewing a certificate, reload Nginx
from `services/auth/deploy`:

```sh
docker compose exec nginx nginx -s reload
```

Verify a deployment from a machine with DNS access:

```sh
AUTH_DOMAIN=auth.example.com ACCOUNT_DOMAIN=account.example.com ./scripts/check-deployment.sh
```

The script checks:

- HTTP-to-HTTPS redirect
- Trusted TLS certificate chain
- Certificate validity for at least seven more days
- HSTS on the auth host
- `/healthz` and the JSON service document at `/`
- Yggdrasil metadata content type
- JSON `404` for auth-host page routes
- Port 8080 is not directly reachable
- Account panel CSP, HSTS, login page, API proxy, and SPA deep-link fallback

## Account API v1

The service exposes a JSON account API under `/api/v1` for the Vue user center, launchers, and
administrative clients:

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

Admin endpoints under `/api/v1/admin/` cover user search, disable/enable, roles, manual email
verification, password reset, invite codes, audit search, the mail outbox, game server registration,
join history, and statistics. The canonical contract is [UMC Auth API v1](../reference/auth-v1).

Access tokens default to 15 minutes. Refresh tokens default to 30 days, rotate on use, and revoke
the whole session family when reused. Web clients receive the refresh token as an HttpOnly cookie;
other clients receive it in JSON.

## API surface

Metadata:

```text
GET /api/yggdrasil
```

Yggdrasil:

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

Website:

```text
GET  /register
GET  /login
GET  /dashboard
GET  /verify-email?token=...
GET  /admin
GET  /healthz
```

## Backup and restore

Accounts, the RSA signing key, and Minecraft profiles live in the `auth-db` PostgreSQL volume.
Uploaded skins and capes live in the `auth-uploads` volume. From `services/auth/deploy`:

```sh
docker compose stop auth-api
docker compose exec -T db pg_dump -U umc_auth -d umc_auth -Fc > umc-auth.dump
docker run --rm -v umc-auth_auth-uploads:/data -v "$PWD":/backup \
  alpine tar czf /backup/auth-uploads.tar.gz -C /data .
docker compose start auth-api
```

If your Compose project name differs, check `docker volume ls` for the volume name.

Restore while the auth service is stopped:

```sh
docker compose stop auth-api
docker compose exec -T db pg_restore -U umc_auth -d umc_auth --clean --if-exists < umc-auth.dump
docker compose start auth-api
```

Treat the database dump as sensitive: it contains password hashes, token hashes, and the private
signing key.

## Security notes

- Passwords use Argon2id; access tokens and web session tokens are stored only as SHA-256 hashes.
- Uploads are limited to 1 MB and validated as PNGs with skin/cape dimensions; texture URLs are
  content-hashed and immutable.
- Refresh cookies are HttpOnly and SameSite=Lax; access tokens are short-lived Bearer tokens. The
  auth host does not serve HTML forms.
- The auth container runs as a non-root user with a read-only root filesystem.
- Nginx ports 80 and 443 are the only public ports; the auth application and PostgreSQL ports stay
  internal.
- Public registration should normally use invites or a CAPTCHA/PoW mode plus rate limits.

## Current limitations

- No email change or self-service account deletion.
- Admin settings are environment variables and require a restart.
- No two-factor authentication for administrators.
- OAuth clients are planned. The game server registry and Yggdrasil join history are available in
  the admin panel.
- The UMC launcher's Microsoft sign-in route is separate; this service does not implement
  client-side third-party authentication.

## Development

Run checks:

```sh
cd services/auth
./scripts/check.sh
```

Run locally against PostgreSQL:

```sh
PUBLIC_ORIGIN=http://127.0.0.1:8080 \
ALLOW_INSECURE_HTTP=true \
COOKIE_SECURE=false \
BIND_ADDR=127.0.0.1:8080 \
DATABASE_URL="host=127.0.0.1 port=5432 user=umc_auth dbname=umc_auth sslmode=disable" \
PGPASSWORD=devpassword \
go run ./cmd/umc-auth
```
