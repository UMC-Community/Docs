# Java runtimes

Minecraft versions declare the Java major version and, for modern versions, a Mojang runtime
component. UMC uses that metadata to decide which Java can launch an instance.

## Requirements come from the version metadata

After an instance is installed, UMC reads:

```text
versions/<minecraft-version>/<minecraft-version>.json
```

From that file it uses `javaVersion.majorVersion` (for example `21`) and, when present,
`javaVersion.component` (for example `java-runtime-delta`). The component identifies the managed
runtime family used by Mojang's launcher.

## Detection order at launch

For a launch, UMC selects Java in this order:

1. **Managed runtime** under `runtimes/` that:
   - is marked with a valid `umc-runtime.json`,
   - is compatible,
   - has a major version greater than or equal to the required major, and
   - matches the version's component, such as `java-runtime-delta@...`.
2. **System Java** found through `JAVA_HOME`, then each `PATH` entry.
3. If no compatible Java is found, launch fails with an error that states the required major
   version.

An installed but too-old Java is reported with `compatible: false` so you can see what was found.
The current release has no CLI option to pin a specific Java path per instance. The `java.detect`
RPC method accepts an explicit path, and `LaunchRequest.java_path` can override the launch Java for
SDK and JSON-RPC clients.

## Detect system Java

```sh
umc java detect
umc java detect 21
```

The argument is the minimum acceptable major version (default `8`). Detection checks:

- `$JAVA_HOME/bin/java` on Unix (or `java.exe` on Windows), then
- every `java` executable on `PATH`.

The result includes:

```json
{
  "path": "/usr/lib/jvm/java-21-openjdk/bin/java",
  "major_version": 21,
  "vendor_version": "21.0.5",
  "compatible": true,
  "required_major": 21,
  "runtime_id": null
}
```

UMC does not scan package-manager directories or the Windows registry for Java. If your Java is not
on `JAVA_HOME` or `PATH`, add it to `PATH` or provision a managed runtime.

## List managed runtimes

```sh
umc java runtimes
```

Only verified managed runtimes are listed. UMC checks the `umc-runtime.json` marker inside
`runtimes/<component>/<version>/` and re-runs the bundled `java -version` before reporting it.

Each result includes a `runtime_id` such as:

```text
java-runtime-delta@21.0.5
```

## Install a managed runtime

```sh
umc java install 1.21.1
```

The Minecraft version must already be installed, because UMC reads the version metadata to discover
the required component. The command then:

1. Fetches Mojang's Java runtime catalog.
2. Selects the catalog entry for the current platform and component.
3. Downloads the runtime manifest and verifies its SHA-1.
4. Downloads every file in the manifest, verifying SHA-1 and size.
5. Creates runtime links and marks executable files.
6. Runs the downloaded Java and verifies the major version.
7. Writes `runtimes/<component>/<version>/umc-runtime.json`.

The CLI waits for the task and prints the result. Like game installs, the download is resumable at
the file level by re-running the command: files that already match are reused.

Supported Mojang components in this release:

| Component | Typical use |
|---|---|
| `jre-legacy` | Very old Minecraft versions |
| `java-runtime-alpha` | Early modern versions |
| `java-runtime-beta` | Intermediate modern versions |
| `java-runtime-gamma` | Java 17-era versions |
| `java-runtime-delta` | Java 21-era versions |

If a version declares a component outside this list, UMC reports an unsupported component error.
Use a system Java that satisfies the version requirement instead.

Managed runtime downloads are published for common Linux, macOS, and Windows architectures. The
current UMC release itself targets Linux x86_64; Windows and macOS are not part of the validated
release target yet.

## Remove a managed runtime

```sh
umc java runtimes
umc java remove java-runtime-delta@21.0.5
```

Removal deletes `runtimes/<component>/<version>/`. Stop any game process using that runtime first.
The command does not remove system Java.

## Examples

Check the Java required by 1.21.1 and provision Mojang's runtime:

```sh
umc instance install <instance-id>
umc java detect 21
umc java install 1.21.1
umc java runtimes
```

If detection already reports a compatible system Java, the managed install is optional.

## Related

- [Launching and processes](./launching) — how the selected Java is used.
- [Troubleshooting](./troubleshooting) — missing, incompatible, or unsupported Java.
