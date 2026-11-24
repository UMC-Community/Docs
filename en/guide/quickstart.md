# Quickstart

Go from a fresh Linux machine to a running vanilla Minecraft: Java Edition client in a few
commands. UMC installs the game into an isolated instance and can launch it offline or with a
Microsoft account.

::: tip Before you start

- **Platform:** Linux x86_64 is the current release target. Ubuntu 22.04 LTS is the recommended and
  verified build environment.
- **Network:** version lookup, game files, and Java runtimes are downloaded over HTTPS.
- **Build tools:** Rust 1.89 or newer via [rustup](https://rustup.rs/), plus GCC, `pkg-config`,
  `git`, and `curl`.
- **Release:** No prebuilt release is currently published, so build from source using the first tab
  below.

:::

On a fresh Ubuntu 22.04 system, install the build dependencies first (see
[Installation requirements](/en/guide/install#requirements)):

```sh
sudo apt update
sudo apt install -y build-essential pkg-config git curl
```

## 1. Install UMC

Build from source, or use a published release when one is available.

::: code-group

```sh [From source]
git clone https://github.com/UMC-Community/UMC.git
cd UMC
cargo build --workspace --locked --release
```

```sh [Prebuilt release (when published)]
VERSION=<latest-version>
curl -LO "https://github.com/UMC-Community/UMC/releases/download/v${VERSION}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
curl -LO "https://github.com/UMC-Community/UMC/releases/download/v${VERSION}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
sha256sum -c "umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
tar -xzf "umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
```

:::

Put `umc` and `umcd` on your `PATH`, or call them from the build directory. The rest of this page
uses `umc` directly.

## 2. Create an instance

List official versions, then create an isolated instance for the version you want:

```sh
umc version list
umc instance create Survival 1.21.1
```

The command prints an instance ID that starts with `instance-`. Use that ID in the next steps:

```json
{
  "id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "name": "Survival",
  "minecraft_version": "1.21.1"
}
```

## 3. Install the game files

```sh
umc instance install instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204
```

The CLI waits for the install task and prints progress on stderr. Client JARs, libraries, assets,
and logging configuration are checked against upstream SHA-1 and size metadata where provided before
they are accepted. Re-running the
command repairs missing or corrupt files.

If you use the daemon in the background, follow progress with the returned task ID instead:

```sh
umc task get <task-id>
umc task events <task-id>
```

## 4. Provision Java

Minecraft 1.21.1 requires Java 21. UMC checks for a compatible managed runtime first, then system
Java. If neither is available, install Mojang's runtime:

```sh
umc java install 1.21.1
```

Inspect what UMC found:

```sh
umc java detect 21
umc java runtimes
```

## 5. Sign in and launch online

```sh
umc auth login
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --online
```

`umc auth login` opens Microsoft's sign-in page once and stores a refresh token. Later online
launches renew the session silently. The CLI waits for the game to exit and writes stdout and stderr
to `instances/<instance-id>/logs/umc-console.log`.

## 6. Launch offline for testing

```sh
umc launch instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204 --offline Steve
```

Replace `Steve` with a 1–16 character offline username.

::: warning Offline mode

Offline mode does not verify account ownership and cannot join servers that require a Microsoft
account. Use `--online` for authenticated play.

:::

## 7. Next steps

- [User guide](/en/guide/user-guide) — overview of the CLI, data model, and workflow.
- [CLI reference](/en/guide/cli) — every command, argument, and output convention.
- [Instances](/en/guide/instances) — create, install, repair, and remove instances.
- [Java runtimes](/en/guide/java) — detection, provisioning, and runtime selection.
- [Launching and processes](/en/guide/launching) — launch behavior, logs, and process control.
- [Troubleshooting](/en/guide/troubleshooting) — common errors and recovery steps.
- [Rust SDK](/en/development/sdk) — embed UMC Core in a Rust application.
- [Integration guide](/en/development/) — choose between the SDK, CLI, and JSON-RPC.
- [JSON-RPC v1](/en/reference/rpc-v1) — full method and task semantics.
- [Compatibility policy](/en/about/compatibility) — platform support and compatibility promises.
