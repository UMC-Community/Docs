# Instances

An instance is an isolated Minecraft installation: its own configuration, game directory, logs, and
install record. Downloaded versions, libraries, assets, and Java runtimes are shared across
instances in the same data directory.

## Layout

```text
<data>/
  instances/
    <instance-id>/
      instance.json        # user-facing configuration
      install.json         # resolved launch context written by install
      game/                # game directory (saves, options, mods, screenshots)
      logs/
        umc-console.log    # game stdout and stderr
  versions/                # shared version metadata and client JARs
  libraries/               # shared libraries
  assets/                  # shared asset objects and indexes
  natives/                 # extracted native libraries per version
  runtimes/                # managed Java runtimes
```

The game directory is created when the instance is created. It is safe to place saves and other
game-owned files there; do not place files inside UMC's `versions/`, `libraries/`, or `assets/`
directories manually.

## Create an instance

```sh
umc version list
umc instance create Survival 1.21.1
```

The command prints the new `InstanceConfig`:

```json
{
  "schema_version": 1,
  "id": "instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204",
  "name": "Survival",
  "minecraft_version": "1.21.1",
  "java_runtime": "auto",
  "memory": { "minimum_mib": 1024, "maximum_mib": 4096 },
  "game_directory": "instances/instance-8f14d9c0e2b34d0f9c3a7e51d6b8a204/game"
}
```

| Field | Meaning |
|---|---|
| `id` | Generated UMC instance ID. Use it in all instance commands. |
| `name` | Display name, 1–128 characters. |
| `minecraft_version` | Official version ID; must exist in the Mojang manifest. |
| `loader` | Reserved for future loader support. The current CLI cannot set it, and the vanilla installer rejects instances that have it. |
| `java_runtime` | Reserved selection hint. In this release, launch chooses Java by version component and compatibility; see [Java runtimes](./java). |
| `memory` | `-Xms` / `-Xmx` in MiB. The default is 1024 / 4096. |
| `game_directory` | Relative to the data directory. |

The current CLI does not provide an `instance edit` command. Create a new instance if you need a
different Minecraft version. Memory and launch options can be overridden by the Rust SDK or the
JSON-RPC `launch.start` method without changing `instance.json`.

## List and inspect

```sh
umc instance list
umc instance get <instance-id>
```

`instance list` returns a JSON array. If one configuration cannot be recovered, the command reports
an error rather than silently hiding that directory. Use `instance repair` or inspect the
quarantine file as described below.

## Install the game files

```sh
umc instance install <instance-id>
```

The installer:

1. Reads the instance configuration and requires a vanilla instance.
2. Fetches the official version manifest.
3. Downloads and verifies the version metadata JSON.
4. Downloads and verifies the client JAR.
5. Resolves platform rules for libraries and downloads each required artifact.
6. Downloads native libraries and extracts them under `natives/<version>/`.
7. Downloads the asset index and every referenced asset object.
8. Downloads the logging configuration.
9. Writes `instances/<id>/install.json` with the resolved launch context.

Every file is checked by SHA-1 and, where available, size. Existing files that already match are
reused, which makes install safe to run again. Each download is attempted up to three times; partial
files are removed on failure or cancellation.

The installer rejects instances with a loader configured. Loader adapters currently provide version
discovery and preflight plans only.

### `install.json`

`install.json` is internal state. It contains the resolved main class, asset index, classpath, and
logging configuration. The classpath entries are absolute paths under the current data directory.
If you move the data directory to a different path, re-run `umc instance install <instance-id>` so
that `install.json` is rewritten for the new location.

## Repair configuration

If `instance.json` is corrupt or unreadable:

```sh
umc instance repair <instance-id>
```

Recovery order:

1. A valid primary configuration is returned unchanged.
2. A valid backup (`instance.json.bak`) is used.
3. The configuration is rebuilt from a validated `install.json` and the version metadata.
4. If neither source is valid, repair fails.

A corrupt primary file is renamed rather than deleted, using a name like
`instance.json.corrupt-<uuid>`, so it can be inspected later. Repair never deletes the game
directory or saves. It only restores the configuration.

Legacy schema version 0 configurations are migrated to schema version 1 on read, and the old bytes
are retained as `instance.json.bak`.

## Remove an instance

```sh
umc instance remove <instance-id>
```

This removes the instance configuration, install record, logs, and game directory. It refuses to run
if a game process for the instance is running, or if UMC cannot validate the saved process state.
Stop the process first:

```sh
umc process list
umc process stop <process-id>
umc instance remove <instance-id>
```

Removing an instance does not remove shared versions, libraries, assets, Java runtimes, or other
instances. Use `umc java remove` for managed runtimes.

## Shared downloads and disk usage

Multiple instances of the same Minecraft version reuse the same files under `versions/`,
`libraries/`, and `assets/`. Installing a second instance still verifies those files but avoids
downloading files that already match. There is no automatic asset/library garbage collector in this
release; removing an instance does not free shared downloads.

## Safety notes

- Back up the data directory before manually editing or deleting files.
- Do not edit `instance.json` or `install.json` while a game or install is running.
- Use `instance remove` instead of deleting an instance directory manually so process checks run.
- Game logs and records can contain player names and local paths. Review them before sharing.

## Limitations

- Loader instances cannot be installed or launched yet.
- The CLI cannot change an instance's Minecraft version in place.
- The CLI does not expose memory or resolution editing; use the SDK or JSON-RPC launch request for
  per-launch overrides.
