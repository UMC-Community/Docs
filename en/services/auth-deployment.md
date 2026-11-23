# UMC Auth deployment environment

This page describes the Docker deployment environment for UMC Auth under
[`deploy`](https://github.com/UMC-Community/UMC-Auth/tree/main/deploy). Nginx is the
only public entrypoint; the Go auth API and PostgreSQL stay on internal networks; the account host is
reserved for the separate web panel; and an optional Stalwart mail profile is included without
changing the account core.

> **Status.** Phases 1–5 are implemented: the Docker environment, account API, self-hosted mail,
> Vue panel, Minecraft profiles with skins/capes and signed textures, and server/join
> administration. Email change and OAuth clients are planned.

## Deployment principles

This is the only supported UMC Auth deployment topology.

- Nginx publishes ports 80 and 443. The auth API and PostgreSQL are never published.
- `auth.example.com` serves JSON only: the account API, Yggdrasil, textures, health check, and a
  service metadata document at `/`. Other paths return a JSON `404`.
- `account.example.com` serves the Vue user center and admin panel, and proxies `/api/` to the auth
  service so browser cookies remain first-party.
- Mail is a separate service reached over SMTP. It is not part of the account core.
- The launcher's Microsoft sign-in route is separate and is not changed by this deployment.

## Target architecture

```text
Minecraft launcher / Minecraft server
                 │ HTTPS
                 ▼
          Nginx :80 / :443
          ├── auth.example.com    → auth-api:8080 → PostgreSQL
          ├── account.example.com → Vue panel + /api/ proxy → auth-api:8080
          └── mail.example.com    → Stalwart (optional mail profile)
                                          │
                                          └── SMTP / IMAP → Internet
```

- `edge` network: Nginx and the auth API.
- `internal` network: the auth API, PostgreSQL, and the optional mail container.
- Only Nginx publishes public ports in phase 1. PostgreSQL and the auth API stay private.
- The optional mail profile publishes 25, 465, 993, and 4190 when enabled, and keeps its management UI on loopback.

## Launcher and third-party server routes

The launcher's Microsoft authentication route does not change:

- `umc auth login` signs in with a Microsoft account.
- `umc launch --online` refreshes the Minecraft session and launches authenticated play.
- UMC Auth does not authenticate Microsoft accounts and does not verify Minecraft ownership.

A third-party server route uses Yggdrasil instead. The client must run with
[authlib-injector](https://github.com/yushijinhun/authlib-injector), or be a launcher that supports
external authentication. The Minecraft server runs with the same agent and keeps
`online-mode=true`:

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

This deployment prepares the server side of that route. Client-side integration in the UMC launcher
is tracked separately and is not provided by this environment.

## Domain plan

| Name | Purpose | Behavior |
|---|---|---|
| `auth.example.com` | Auth API, Yggdrasil, textures, health check | API-only; `/` is JSON and page paths return JSON 404 |
| `account.example.com` | Vue user center and admin panel | Serves the SPA and proxies `/api/` |
| `mail.example.com` | Optional self-hosted mail host | Stalwart profile when enabled |
| `example.com` | Community root site | Independent of this stack |

Use one TLS certificate that covers both `auth` and `account`, or a wildcard certificate. If you
only have one domain, remove the `account` server block from the Nginx template and the
`ACCOUNT_DOMAIN` environment entry from `compose.yaml`.

## Capability status

| Capability | Status |
|---|---|
| Registration, sign-in, Argon2id password hashing | Implemented |
| Stable 32-character Minecraft UUID per account | Implemented |
| Yggdrasil authenticate / refresh / validate / invalidate / signout | Implemented |
| Session `join` / `hasJoined` and profile lookups | Implemented |
| Invites, proof-of-work, Turnstile, per-IP and global rate limits | Implemented |
| Optional SMTP email verification link | Implemented |
| Admin invites, users, and audit log | Implemented |
| Registration responses that do not reveal whether a username or email exists | Implemented for `/api/v1`; the legacy web form still reports existing accounts |
| Password reset, login history, session revocation | Implemented for `/api/v1` |
| Short-lived access token plus revocable refresh token | Implemented for `/api/v1` |
| Account REST API v1 | Implemented |
| Separate Vue 3 user center and admin panel | Implemented |
| Six-digit email codes instead of verification links | Implemented for `/api/v1`; the web form still sends a link |
| Self-hosted mail server | Implemented as an optional Stalwart profile; external DNS/PTR pending |
| Skins, capes, signed profile properties | Implemented; textures stored in the `auth-uploads` volume |
| Game server registry and Yggdrasil join history | Implemented |
| `username_normalized` / `email_normalized` columns | Implemented with versioned migrations |
| `user`, `moderator`, `admin`, `superadmin` roles | Implemented |
| Email change | Planned |
| OAuth clients | Planned |

The account API and Yggdrasil endpoints are usable today. Planned items are listed so operators can
plan capacity and migrations.

## Repository and server layout

```text
UMC-Auth/
├── Dockerfile
├── cmd/umc-auth/             # Go service
├── web/                      # Vue 3 user center and admin panel
│   ├── src/
│   └── dist/                 # build output (not committed)
└── deploy/                   # deployment environment (this page)
    ├── compose.yaml
    ├── .env.example
    ├── nginx/
    │   ├── nginx.conf
    │   └── templates/default.conf.template
    ├── certs/                # fullchain.pem, privkey.pem
    ├── acme/                 # optional HTTP-01 webroot
    ├── mail/                 # provisioning output and admin credentials (not committed)
    └── scripts/
        ├── setup.sh
        ├── provision-mail.sh
        └── build-web.sh
```

The `auth-api` build context is the UMC-Auth repository root, because the image is built from the Go source. Keep
the repository checkout on the server, or build and publish the image separately and replace
`build:` with `image:`.

Recommended server layout:

```text
/opt/UMC-Auth/                    # repository checkout
  deploy/                         # run Compose here
/opt/umc-auth-backups/            # database dumps, off-volume backups
```

Do not copy only `deploy/` to the server unless you also change the build configuration.

## Phase 1: prepare the server

### 1. DNS and firewall

Create `A` (and optionally `AAAA`) records for both names, pointing at the server. Open TCP 80 and
443. Do not open 8080 or 5432.

If the host already runs a web server, either stop it before starting this stack, or reuse it as
described in [Reuse an existing Nginx](#reuse-an-existing-nginx).

### 2. Get the files and create `.env`

```sh
git clone https://github.com/UMC-Community/UMC-Auth.git /opt/UMC-Auth
cd /opt/UMC-Auth/deploy
./scripts/setup.sh
$EDITOR .env
```

`setup.sh` copies `.env.example` to `.env`, creates `certs/` and `acme/`, and warns when the
certificate is missing.

Required values:

| Variable | Meaning |
|---|---|
| `AUTH_DOMAIN` | Public auth hostname; also the `PUBLIC_ORIGIN` host |
| `ACCOUNT_DOMAIN` | Vue user center and admin panel hostname |
| `POSTGRES_PASSWORD` | Database password; also used by the auth service |
| `SERVER_NAME` | Name shown in the UI and Yggdrasil metadata |
| `BOOTSTRAP_TOKEN` | Token required for the first superadmin account |

The remaining settings control registration mode, CAPTCHA, email verification, SMTP, session
lifetime, token lifetime, and rate limits. They are the same variables as the service; see the
[UMC Auth page](./auth) for their meanings. The account API adds `ACCESS_TOKEN_MINUTES` (default
15), `REFRESH_TOKEN_DAYS` (default 30), `VERIFY_LIMIT_PER_MINUTE` (default 10),
`FORGOT_LIMIT_PER_MINUTE` (default 5), and `REFRESH_LIMIT_PER_MINUTE` (default 60).

### 3. Install TLS certificates

Place the certificate chain and private key here:

```text
certs/fullchain.pem
certs/privkey.pem
```

The certificate must cover `AUTH_DOMAIN` and `ACCOUNT_DOMAIN`. After renewing a certificate:

```sh
docker compose exec nginx nginx -s reload
```

The `acme/` directory is mounted at `/var/www/certbot` for an optional HTTP-01 challenge. Certbot
itself is not packaged; use the tool you already trust.

### 4. Build the Vue panel

```sh
./scripts/build-web.sh
```

The script uses `node:22-alpine` and writes `web/dist`, which Nginx mounts at
`/usr/share/nginx/html/account`. If you have Node 22+ on the host, `cd ../web && npm ci && npm run
build` is equivalent.

### 5. Start the stack

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f auth-api
```

### 6. Verify

```sh
curl -fsS https://auth.example.com/healthz
curl -fsS https://auth.example.com/
curl -fsSI https://auth.example.com/api/yggdrasil
curl -sSI https://auth.example.com/login | head -1
curl -fsSI https://account.example.com/ | head
```

Expected results:

- `/healthz` returns `ok`.
- `/` returns `{"service":"UMC Auth",...}` JSON.
- `/api/yggdrasil` returns JSON metadata.
- `/login` returns a JSON `404`; the auth host never serves an HTML page.
- `account.example.com` serves the Vue panel and proxies `/api/` to the auth service.
- HTTP redirects to HTTPS and HSTS is present.

The deployment check can also run against this environment:

```sh
AUTH_DOMAIN=auth.example.com ACCOUNT_DOMAIN=account.example.com ../scripts/check-deployment.sh
```

### 7. Bootstrap the first account

Open `https://account.example.com/register` and enter `BOOTSTRAP_TOKEN`. The first account becomes a
superadmin and bypasses invites, CAPTCHA, and email verification. Remove `BOOTSTRAP_TOKEN` from
`.env` and restart the API after setup:

```sh
docker compose up -d auth-api
```

## Nginx behavior

The bundled template provides:

- HTTP to HTTPS redirect, with an ACME challenge location.
- TLS 1.2 and 1.3, session caching, and HSTS.
- Proxy headers `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- Edge rate limits: 20 requests per minute for sign-in and registration, 60 per minute for token
  refresh, 30 requests per second for the API, and the Yggdrasil API limit.
- A public `/healthz` endpoint.
- On the auth host, `/` returns service metadata JSON; API, Yggdrasil, textures, and health check
  are proxied. Every other path returns a JSON `404` instead of an HTML page.
- Static SPA serving with history-mode fallback (`try_files ... /index.html`).
- Same-origin `/api/` proxying with the same proxy headers and edge rate limits.
- A 3 MB request-body limit, sized for 1 MB texture uploads plus multipart overhead.

The application still applies its own in-process limits. Edge limits are a second layer, not a
replacement.

### Reuse an existing Nginx

If the host already terminates TLS, remove the `nginx` service from `compose.yaml`, publish the API
on loopback only, and keep `TRUST_PROXY_HEADERS=true`:

```yaml
  auth-api:
    ports:
      - "127.0.0.1:8080:8080"
```

Copy the proxy rules from `nginx/templates/default.conf.template` into the host configuration. Never
publish `8080` on a public interface; the service refuses an insecure public origin, but a publicly
reachable container port is still unnecessary exposure.

## PostgreSQL and data model

PostgreSQL has no published port and lives on the `internal` network. The `auth-db` volume stores
accounts and metadata; `auth-uploads` stores skin and cape files.

The schema is managed by embedded versioned migrations in
`cmd/umc-auth/migrations`. `0001` is the original idempotent schema; `0002` adds the
account API columns and tables and backfills existing rows in place; `0003` enforces non-null
normalized identity columns. Applied versions are recorded in `schema_migrations`.

Uniqueness is enforced in the database:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS users_username_normalized ON users (username_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized
    ON users (email_normalized) WHERE email_normalized <> '';
```

The older `users_username_lower` and `users_email_lower` indexes remain for compatibility.

Current tables:

| Table | Purpose |
|---|---|
| `users` | Account, normalized username and email, password hash, role, status, timestamps |
| `access_tokens` | Yggdrasil access-token hashes |
| `web_sessions` | Legacy HTML session cookie hashes |
| `auth_sessions` | `/api/v1` access and refresh token hashes, family, device metadata, revocation |
| `email_verification_codes` | Six-digit code hash, purpose, expiry, attempts, send count |
| `password_reset_tokens` | One-time reset code hashes |
| `login_attempts` | Successful and failed sign-in records |
| `mail_outbox` | Queued mail, retry state, last error |
| `joins` | Yggdrasil session join records |
| `invites` | Invite-code hashes |
| `email_verifications` | Legacy 24-hour verification links |
| `pow_challenges` | Proof-of-work challenges |
| `audit_log` | Administrative and security actions |
| `settings` | Signing key, proof-of-work secret, and other server state |
| `minecraft_profiles` | Player name, UUID, skin/cape hashes and URLs, skin model, texture timestamp |
| `server_instances` | Registered Minecraft servers, address, status, creator |
| `server_join_records` | Long-term Yggdrasil join history with username, server id, and IP |

The account service keeps `BIGINT` internal primary keys and uses `users.uuid` as the external
player identifier. This avoids a destructive primary-key rewrite while preserving stable Minecraft
UUIDs.

Planned tables not created yet:

| Table | Purpose |
|---|---|
| `oauth_clients` | Launcher or application clients |

New schema changes must be added as a new numbered migration. Do not edit an applied migration.

## API surface

### Implemented today

| Group | Endpoints |
|---|---|
| Yggdrasil auth | `POST /api/yggdrasil/authserver/authenticate`, `refresh`, `validate`, `invalidate`, `signout` |
| Session | `POST /api/yggdrasil/sessionserver/session/minecraft/join`, `GET .../hasJoined` |
| Profiles | `GET /api/yggdrasil/sessionserver/session/minecraft/profile/{uuid}`, `POST /api/yggdrasil/api/profiles/minecraft` |
| Metadata | `GET /api/yggdrasil` |
| Web | `/register`, `/login`, `/dashboard`, `/verify-email`, `/admin` |

### Account API v1

The account API is implemented. The canonical contract is [UMC Auth API v1](../reference/auth-v1).

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/register` | Register an account |
| `POST /api/v1/auth/verify-email` | Verify an email code |
| `POST /api/v1/auth/verify-email/resend` | Resend the verification code |
| `POST /api/v1/auth/login` | Sign in and create a session |
| `POST /api/v1/auth/refresh` | Rotate the access and refresh tokens |
| `POST /api/v1/auth/logout` | Revoke the current session |
| `POST /api/v1/auth/password/forgot` | Request a password reset |
| `POST /api/v1/auth/password/reset` | Complete a password reset |
| `GET /api/v1/users/me` | Current account and session |
| `GET /api/v1/users/me/sessions` | Active sessions |
| `DELETE /api/v1/users/me/sessions/{id}` | Revoke a session |
| `GET /api/v1/users/me/minecraft` | Minecraft profile and texture URLs |
| `POST /api/v1/users/me/skin` | Upload a 64×64 or 64×32 skin, `classic` or `slim` |
| `DELETE /api/v1/users/me/skin` | Remove the current skin |
| `POST /api/v1/users/me/cape` | Upload a 64×32 or 64×64 cape |
| `DELETE /api/v1/users/me/cape` | Remove the current cape |
| `GET /api/v1/profiles/{uuid}` | Profile by UUID |
| `GET /api/v1/profiles/by-username/{name}` | Profile by player name |
| `GET /textures/{skin\|cape}/{uuid}/{sha256}` | Public immutable texture files |
| `/api/v1/admin/*` | User search, status, roles, manual verification, password reset, invite codes, audit search, mail, servers, join history, stats |

The Vue panel uses the same API through `account.example.com/api/v1`, which Nginx proxies to the auth
service.

## Self-hosted mail (Stalwart)

Phase 3 adds an optional Stalwart v1 container under the `mail` Compose profile. It provides SMTP,
TLS submission, IMAPS, ManageSieve, DKIM signing, and a loopback-only management UI. The account core
only needs SMTP and does not embed mail delivery.

Enable it:

```sh
# Set MAIL_* and SMTP_* in .env. Keep SMTP_PASSWORD equal to
# MAIL_NO_REPLY_PASSWORD, and make sure certs/ covers MAIL_HOSTNAME.
./scripts/provision-mail.sh
# Publish the records in mail/dns-records.txt, then:
#   EMAIL_VERIFICATION=required
docker compose --profile mail up -d
docker compose up -d auth-api
```

The provisioning script requires Python 3 and OpenSSL on the host. It starts Stalwart in bootstrap mode, completes the hostname and domain setup
with automatic DKIM keys, stores the generated administrator credentials in
`mail/admin-credentials.txt`, creates or updates the no-reply account, installs the certificate, and
writes the DNS zone to `mail/dns-records.txt`.

| Port | Purpose | Exposure |
|---|---|---|
| 25 | Inbound SMTP | Public |
| 465 | Submission with implicit TLS | Public |
| 993 | IMAPS | Public |
| 4190 | ManageSieve | Public; block if unused |
| 8080 | Setup/recovery HTTP | Loopback only |
| 8443 | Management UI HTTPS (container 443) | Loopback only |

Stalwart downloads its WebUI bundle from GitHub on first start. If the host cannot reach GitHub,
use the `mail-cli` service or allow outbound HTTPS.

Management UI:

```sh
# Normal administration:
ssh -L 8443:127.0.0.1:8443 <user>@<server>
# open https://127.0.0.1:8443/admin

# Setup or recovery:
ssh -L 8080:127.0.0.1:8080 <user>@<server>
# open http://127.0.0.1:8080/admin
```

### Auth service SMTP

```ini
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=use-a-dedicated-mail-password
SMTP_FROM=UMC Auth <no-reply@example.com>
SMTP_TLS=implicit
```

The mail container is attached to the `edge` network for outbound delivery and to `internal` with a
`${MAIL_HOSTNAME}` alias. The auth service connects to that alias, so certificate verification
matches the public certificate for `mail.example.com`.

### DNS and network requirements

Stalwart writes a zone file after setup. It includes MX, SPF, DKIM, DMARC, MTA-STS, SRV, and
autoconfig records. The essential records are:

| Record | Host | Example |
|---|---|---|
| `A` | `mail` | `1.2.3.4` |
| `MX` | `@` | `mail.example.com` |
| `TXT` (SPF) | `@` | `v=spf1 mx ip4:1.2.3.4 -all` |
| `TXT` (DKIM) | generated selector | Public key from the zone |
| `TXT` (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@example.com` |
| `PTR` | server IP | `mail.example.com` |

Self-hosting does not guarantee delivery to Gmail, Outlook, or QQ Mail. Delivery depends on the
public IP reputation, PTR, port 25, SPF, DKIM, and DMARC. Some VPS providers block outbound TCP 25.
Confirm that before committing to self-hosted mail.

The legacy web form sends a 24-hour single-use verification link. The account API uses a six-digit
code with attempt and resend limits. Both paths are supported during the transition.

Account API verification policy:

| Item | Value |
|---|---|
| Code | Six random digits |
| Validity | 10 minutes |
| Attempts | At most 5 |
| Resend interval | 60 seconds per email address |
| Storage | Hash, purpose, expiry, attempt count, send count |
| Reuse | Invalidated immediately after success |
| Delivery | Queued in `mail_outbox` and retried on SMTP failure |

Local SMTP submission, IMAP delivery, DKIM signing, and the auth service → Stalwart outbox path have
been tested. External delivery still requires real DNS and PTR records.

## Resource budget (2 cores / 2 GB)

| Component | Initial budget |
|---|---|
| Linux and Docker | 400–650 MB |
| PostgreSQL | 150–300 MB |
| Go auth API | 30–150 MB |
| Nginx | Small; mostly shared page cache |
| Stalwart mail (optional) | 200–500 MB depending on configuration |
| Buffer | Keep as much as possible |

Recommendations:

- No Redis, Elasticsearch, or ClamAV on this host.
- Limit PostgreSQL connections and set a modest shared buffer size.
- Keep one auth API replica; in-process rate limits are not shared.
- Add 1–2 GB of swap as a burst buffer, not as normal working memory.
- Do not run a Minecraft server on the same 2 GB host until memory use is measured. A game server
  plus mail plus the auth stack is tight.

## Security checklist

- Use Argon2id for passwords and store only hashes for access, refresh, session, invite, and
  verification tokens.
- The mail outbox contains a code in the message body while a message is pending. Delivery clears the
  body; protect pending rows and database backups as sensitive.
- Terminate HTTPS at Nginx and keep the auth API and database off the public network.
- Keep refresh cookies `Secure`, `HttpOnly`, and `SameSite=Lax`, and keep the auth host JSON-only.
- Keep public registration behind invites, proof-of-work, or Turnstile plus rate limits.
- Do not allow anonymous SMTP relay or open mail registration.
- Record administrative actions and security-relevant events in the audit log.
- Validate skin and cape uploads as PNGs with expected dimensions, keep the 1 MB per-file limit,
  and content-hash filenames.
- Back up both the database and the `auth-uploads` texture volume.
- Avoid exposing whether an email or username exists during registration.
- Back up the database and the mail store, encrypt backups, and test restoration.
- Treat the database dump and `privkey.pem` as secrets.

## Backup and restore

Database:

```sh
docker compose stop auth-api
docker compose exec -T db pg_dump -U umc_auth -d umc_auth -Fc > umc-auth-$(date +%F).dump
docker compose start auth-api
```

Skin and cape files:

```sh
docker run --rm -v umc-auth_auth-uploads:/data -v "$PWD":/backup \
  alpine tar czf /backup/auth-uploads-$(date +%F).tar.gz -C /data .
```

Check `docker volume ls` if the Compose project name is not `umc-auth`.

Restore while the API is stopped:

```sh
docker compose stop auth-api
docker compose exec -T db pg_restore -U umc_auth -d umc_auth --clean --if-exists < umc-auth.dump
docker compose start auth-api
```

With the mail profile enabled, back up the Stalwart volumes while the mail container is stopped:

```sh
docker compose --profile mail stop mail
docker run --rm -v umc-auth_stalwart-data:/data -v "$PWD":/backup \
  stalwartlabs/stalwart:v1 tar czf /backup/stalwart-data-$(date +%F).tar.gz -C /data .
docker run --rm -v umc-auth_stalwart-etc:/data -v "$PWD":/backup \
  stalwartlabs/stalwart:v1 tar czf /backup/stalwart-etc-$(date +%F).tar.gz -C /data .
docker compose --profile mail start mail
```

Keep at least seven daily and four weekly backups, copy them to another device, and restore one
periodically. A backup that has never been restored is only a guess.

## Implementation phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Docker base environment: Compose, Nginx, PostgreSQL, domain and HTTPS | Environment scaffold in `deploy/` |
| 2 | Account API and data model: REST v1, migrations, sessions, email codes, password reset | Implemented |
| 3 | Self-hosted mail: SMTP/IMAP, external delivery test, SPF/DKIM/DMARC/PTR | Implemented; external DNS/PTR pending |
| 4 | User center: Vue 3 panel, profile, sessions, email change | Implemented; email change pending |
| 5 | Minecraft profiles and administration: skins, capes, signed textures, server registry, join history, audit search | Implemented |
| 6 | Minecraft protocol: profiles, skins, session server, launcher/server integration | Yggdrasil endpoints implemented; launcher integration separate |
| 7 | Security and release: image build, rate-limit tests, delivery tests, restore drill | Planned |

### Phase 2 delivered

Phase 2 makes the Go service the account backend for the Vue panel and the mail system without
breaking the Yggdrasil endpoints.

1. **Contract.** [`protocols/auth-v1.md`](https://github.com/UMC-Community/UMC-Auth/blob/main/protocols/auth-v1.md)
   and [`protocols/auth-v1.yaml`](https://github.com/UMC-Community/UMC-Auth/blob/main/protocols/auth-v1.yaml)
   define `/api/v1`.
2. **Migrations.** Embedded versioned SQL migrations replace startup schema creation. `0002` adds
   normalized identity columns, roles, statuses, sessions, verification codes, reset tokens, login
   attempts, and the mail outbox. Existing rows are backfilled in place.
3. **Sessions.** Access tokens default to 15 minutes; refresh tokens default to 30 days and rotate.
   Reusing a rotated refresh token revokes the whole session family.
4. **Email codes.** Six-digit codes, 10-minute expiry, five attempts, 60-second resend interval, and
   an outbox that retries SMTP failures.
5. **Admin API.** User search, disable/enable, role changes, manual verification, password reset,
   audit, mail log, and statistics.
6. **Tests.** Store integration tests and HTTP-level tests cover registration, login, refresh,
   reuse detection, logout, admin actions, email codes, reset codes, and the mail outbox.

### Phase 3 delivered

Phase 3 adds the optional Stalwart mail profile:

- Stalwart v1 runs SMTP, submission, IMAPS, ManageSieve, DKIM, and a loopback management UI.
- `deploy/scripts/provision-mail.sh` completes the bootstrap, domain, DKIM, administrator, no-reply
  account, and TLS certificate setup.
- The auth service sends through `mail.example.com:465` with implicit TLS and the Docker network
  alias, so certificate verification uses the public hostname.
- The mail outbox, SMTP submission, IMAP delivery, and DKIM signing were tested end-to-end.
- Publish `mail/dns-records.txt` and configure PTR before expecting external delivery.

### Phase 4 delivered

Phase 4 adds the Vue 3 user center and admin panel:

- Source in `web` (Vue 3, Vue Router, Vite), built to `web/dist`.
- `deploy/scripts/build-web.sh` builds it with a pinned `node:22-alpine` image, so the host does not
  need Node installed.
- Nginx serves the SPA on `account.example.com` with history-mode fallback and proxies `/api/` to
  `auth-api:8080`, keeping refresh cookies first-party.
- Pages cover register, email verification, login, password recovery, dashboard, sessions, profile,
  admin overview, users, audit, and the mail outbox.
- The access token is kept in memory; the refresh token stays in an HttpOnly cookie. A non-sensitive
  hint cookie avoids a doomed refresh call on guest pages.
- Tested with headless Chrome: registration, login, reload/session restore, admin role/status/
  password actions, and mobile layouts without horizontal overflow.

### Phase 5 delivered

Phase 5 adds Minecraft identity and server administration:

- Migration `0005` creates `minecraft_profiles`, `server_instances`, and `server_join_records`, and
  backfills a profile for every existing account.
- The profile page uploads skins (64×64 or 64×32, classic or slim) and capes (64×32 or 64×64) with a
  1 MB per-file limit, and previews them pixelated.
- Texture files are hashed (SHA-256), stored under `UPLOAD_DIR` on the `auth-uploads` volume, and
  served immutably at `/textures/{kind}/{uuid}/{hash}`.
- Yggdrasil profiles now include a signed `textures` property. The service signs the base64 payload
  with its RSA key using PKCS#1 v1.5 and SHA-256; the public key remains available from
  `/api/yggdrasil` metadata.
- The Yggdrasil `join` endpoint records the username, server id, client IP, and timestamp.
- The admin panel gains a Servers page for registering servers, enabling/disabling them, deleting
  them, and filtering join history. Audit search matches actor, action, and detail.
- Go tests cover signature verification, upload/serve/delete, server CRUD, join history, and audit
  search.

The next implementation phase is launcher/server integration and release hardening.

## Related

- [UMC Auth](./auth) — account service overview and configuration
- [UMC Auth API v1](../reference/auth-v1) — canonical `/api/v1` contract
- [Java game server](./java-server) — running the server that uses this authentication
- [Services overview](./) — what each optional service does
