# UMC Mirror

UMC Mirror is an optional Go service that fetches immutable Minecraft artifacts from configured
upstream providers, verifies each object against an expected SHA-1, and caches only verified bytes.
It has a Docker Compose deployment. Its source and deployment files are in the
[UMC-Mirror repository](https://github.com/UMC-Community/UMC-Mirror). UMC Core does not use it
automatically yet.

## Status and integrity model

The first implementation serves content-addressed objects only. Each request must include the
expected SHA-1 obtained by the launcher from Mojang metadata over HTTPS. The mirror downloads the
object, hashes the full response, and stores or serves it only when the digest matches. Cache hits
are re-hashed before serving. Objects without an expected SHA-1 are not served by this API.

This verifies the bytes against the expected digest. The launcher is responsible for obtaining the
expected digest from Mojang's HTTPS metadata. SHA-1 is used because it is the integrity field in the
Minecraft metadata format; it is not a modern signature or proof of publisher identity.

## HTTPS and upstream restrictions

- Every configured provider origin must use HTTPS. Startup rejects HTTP, URL credentials, queries,
  and fragments.
- Redirects must remain HTTPS and target a host present in the configured provider list.
- The public URL must use HTTPS. The Compose deployment runs Caddy for automatic TLS. Do not expose
  the service's internal port `8080` directly to the Internet.
- The HTTP client does not honor proxy environment variables and rejects upstream DNS results that
  resolve only to private, loopback, or link-local addresses.
- Clients cannot supply an arbitrary upstream hostname; they select a configured provider ID.

## API

```text
GET /v1/objects/{provider}/{sha1}/{upstream-path}
HEAD /v1/objects/{provider}/{sha1}/{upstream-path}
GET /healthz
```

For example, an object whose Mojang metadata provides a SHA-1 can be requested as:

```text
https://mirror.example.org/v1/objects/mojang-data/<sha1>/v1/objects/<sha1>/client.jar
```

The `provider` and `sha1` path components select an allowlisted HTTPS origin and the expected
digest. The remaining path is appended to that provider's base URL. Responses include an ETag and
immutable cache headers. A digest mismatch returns `502` and leaves no cached object.

Configured providers are listed in the repository-root `providers.json`. Add redirect destination hosts
as provider entries before enabling upstreams that redirect to a CDN.

## Docker Compose

```sh
cp .env.example .env
# Edit MIRROR_DOMAIN in .env and point its DNS record to this host.
docker compose up -d --build
```

Ports 80 and 443 must be reachable so Caddy can provision a certificate and serve HTTPS. Objects
are stored in the `mirror-cache` volume. `MAX_OBJECT_BYTES` limits one object and `CACHE_MAX_BYTES`
limits total cache size. When the cache is full, the oldest objects are evicted.
`MAX_CONCURRENT_DOWNLOADS` bounds simultaneous upstream transfers.

## Scope

- No uploads, account system, mod hosting, or file rewriting.
- No metadata proxy for documents that do not have an expected SHA-1.
- No metrics or automatic Core integration yet.
- The current image targets Linux containers. Other host platforms have not been validated.

The mirror is independent from [UMC Auth](./auth). It does not authenticate players or verify
Minecraft ownership.
