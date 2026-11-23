# Privacy Policy

_Last updated: November 21, 2026_

This Privacy Policy explains what UMC (Universal Minecraft Core) collects, sends, and stores. It applies to the UMC Core library, command-line tools, daemon, SDK, loader adapters, documentation, and official builds. It does not cover the separately deployed UMC Auth service or third-party services such as Microsoft, Xbox, Minecraft, mod platforms, or the servers you join; those operators have their own policies.

## Summary

- The launcher Core does not operate a hosted player account service, telemetry endpoint, analytics pipeline, advertising system, crash-reporting service, cloud sync, or remote management service. UMC Auth is a separate, optional, community-operated Yggdrasil-compatible account service; its operator controls its data handling and privacy policy.
- UMC stores game files, instances, runtimes, task state, and logs locally on your device.
- Microsoft sign-in happens on Microsoft's pages. UMC never receives your Microsoft password.
- The current version stores only the Microsoft refresh token, plus non-secret account metadata. Microsoft, Xbox, XSTS, and Minecraft access tokens are held in process memory and are not persisted.
- Online launch uses the stored refresh token to obtain fresh tokens without opening a browser.
- Version lookup, installation, and loader metadata requests go directly to the relevant upstream services, which may receive ordinary connection metadata such as your IP address.

## Data stored on your device

UMC keeps its data under `UMC_DATA_DIR` (or `./umc-data` when developing). This can include:

| Data | Purpose |
|---|---|
| Instance configuration and metadata | Records the name, Minecraft version, memory settings, loader selection, and installation state of each instance. |
| Game files, assets, libraries, and Java runtimes | Downloaded from Mojang and other upstream sources so the game can run locally. |
| Task and process records | Lets the daemon report progress, recover interrupted work, and track running games. |
| Logs | Captures installation progress, launch output, and errors for troubleshooting. |
| Version and metadata cache | Avoids repeated upstream requests. |
| Account metadata under `accounts/` | Minecraft username, UUID, last sign-in time, default-account marker, and credential backend. Contains no tokens. |
| Refresh token | Stored in the OS keyring when available, otherwise in `credentials/<account-id>.json` with `0600` permissions. |

UMC does not store your Microsoft password. Microsoft, Xbox, XSTS, and Minecraft access tokens are not written to disk.

## Microsoft account sign-in

When you run `umc auth login`, the following happens:

1. UMC starts a temporary HTTP listener on the loopback interface and opens Microsoft's authorization page in your browser. With `--no-browser`, UMC prints the URL instead.
2. You sign in on Microsoft's site, including any consent, account-selection, or multi-factor prompts. UMC never sees your credentials.
3. Microsoft redirects your browser to the loopback address with a one-time authorization code. UMC checks the `state` value and uses PKCE (S256) to bind the request to this sign-in attempt.
4. UMC exchanges the authorization code for Microsoft tokens at Microsoft's token endpoint.
5. UMC sends the Microsoft access token to Xbox Live user authentication, XSTS authorization, and Minecraft services login, and receives Xbox and XSTS tokens plus a Minecraft access token.
6. UMC requests the Minecraft profile (username, UUID, skins, and capes) to confirm the account.

The requested scope is `XboxLive.signin offline_access`. `offline_access` allows Microsoft to return a refresh token, which UMC stores so later online launches do not require a browser.

Account data handled during sign-in:

| Data | Current handling |
|---|---|
| Microsoft password | Never seen or stored by UMC. Entered only on Microsoft's pages. |
| Microsoft access token | Kept in memory for the duration of the command; not written to disk. |
| Microsoft refresh token | Stored in the OS keyring, or in a `0600` file when no keyring is available. Used for silent renewal. |
| Xbox Live and XSTS tokens | Kept in memory during the login chain; not written to disk. |
| Minecraft access token | Kept in memory and passed to the game process; not written to disk. |
| Minecraft profile (name, UUID, skins, capes) | Stored as non-secret account metadata (name and UUID). Skins and capes are not persisted. |

Deleting the stored credential with `umc auth logout` removes the refresh token and account metadata from this machine. It does not change your Microsoft account.

## Network requests

UMC makes HTTPS requests directly from your device to upstream services. It does not route them through a UMC-operated proxy.

| Purpose | Typical destination |
|---|---|
| Minecraft version manifest and game metadata | `piston-meta.mojang.com`, `launchermeta.mojang.com` |
| Game files, assets, and libraries | Mojang and related CDN hosts |
| Java runtime downloads | Mojang runtime metadata and download hosts |
| Loader metadata and installer downloads | Fabric, Forge, and NeoForge endpoints |
| Microsoft sign-in and token exchange | `login.microsoftonline.com` |
| Xbox Live and XSTS authorization | `user.auth.xboxlive.com`, `xsts.auth.xboxlive.com` |
| Minecraft services login and profile | `api.minecraftservices.com` |

These services may receive ordinary connection metadata, including your IP address, request time, requested URL, user agent, and any token or account information required by that request. Their own privacy policies apply.

## Local daemon and IPC

The UMC daemon listens only on local IPC endpoints (a Unix socket or a Windows named pipe) and does not expose a network port. Any local process that can connect to that endpoint can control UMC, so protect the data directory and its permissions. UMC does not authenticate local clients beyond operating-system access control.

## Logs and diagnostics

Logs may contain:

- player names, Minecraft UUIDs, and account names;
- local file paths and instance names;
- game, Java, and mod output, including server addresses or chat printed by the game;
- error messages returned by upstream services.

Tokens are not written to logs. The token types used by UMC redact their contents when formatted for debugging and are not serialized to JSON. Review logs before sharing them publicly, and remove anything private.

## What UMC does not do

- No telemetry, analytics, usage statistics, or advertising identifiers.
- No crash reporting or automatic upload of logs.
- No cloud sync, remote backup, or hosted account service operated by the launcher Core. UMC Auth is a separate optional service deployed and operated by communities.
- No selling or sharing of personal data.
- No background requests beyond the installation, version, loader, Java, and sign-in operations you initiate.

## Retention and deletion

Local data remains until you delete it:

- Delete an instance in UMC or remove its directory to delete that instance's files, settings, and logs.
- Delete `UMC_DATA_DIR` to remove all UMC-managed data.
- Run `umc auth logout` to remove the stored refresh token and account metadata. Deleting `UMC_DATA_DIR` also removes the file fallback; remove keyring entries with `auth logout` so the OS credential store is cleaned too.
- Uninstalling UMC does not necessarily delete `UMC_DATA_DIR`; remove it yourself if you want a clean removal.

Data sent to Microsoft, Mojang, or other third parties is retained by those services under their own policies.

## Third-party services

Microsoft, Xbox, Minecraft, Mojang, Fabric, Forge, NeoForge, mod platforms, and multiplayer servers are independent services. Their terms and privacy policies govern the data they collect. UMC cannot delete data held by them or change their account settings for you.

## Changes to this policy

This policy will be updated when UMC adds telemetry, hosted services, crash reporting, mod distribution, or other material data flows. The date at the top shows the last change, and material changes will be noted in the release notes.

## Contact

Privacy questions can be raised in the project's [GitHub issue tracker](https://github.com/UMC-Community/UMC/issues).
