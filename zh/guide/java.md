---
source: en/guide/java.md
---

# Java 运行时

Minecraft 版本会声明所需的 Java 主版本，现代版本还会声明 Mojang 运行时组件。UMC 根据这些元数据决定哪个 Java 可以启动实例。

## 需求来自版本元数据

实例安装完成后，UMC 会读取：

```text
versions/<minecraft-version>/<minecraft-version>.json
```

它使用其中的 `javaVersion.majorVersion`（例如 `21`），以及存在时的 `javaVersion.component`（例如 `java-runtime-delta`）。组件标识 Mojang 启动器使用的托管运行时系列。

## 启动时的选择顺序

启动时，UMC 按以下顺序选择 Java：

1. `runtimes/` 下的**托管运行时**，满足：
   - 带有有效的 `umc-runtime.json` 标记；
   - 兼容；
   - 主版本大于或等于所需主版本；
   - 匹配版本组件，例如 `java-runtime-delta@...`。
2. 通过 `JAVA_HOME`，再通过每个 `PATH` 条目找到的**系统 Java**。
3. 如果找不到兼容 Java，启动会失败，并在错误中说明所需的主版本。

如果找到的 Java 已安装但版本过旧，会以 `compatible: false` 返回，便于查看发现了什么。当前版本没有为每个实例固定特定 Java 路径的 CLI 选项。`java.detect` RPC 方法可以传入显式路径，SDK 和 JSON-RPC 客户端还可以通过 `LaunchRequest.java_path` 覆盖启动 Java。

## 检测系统 Java

```sh
umc java detect
umc java detect 21
```

参数是允许的最低主版本（默认 `8`）。检测顺序：

- Unix 上的 `$JAVA_HOME/bin/java`（Windows 上为 `java.exe`），然后
- `PATH` 上的每个 `java` 可执行文件。

结果包括：

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

UMC 不会扫描包管理器目录或 Windows 注册表。如果你的 Java 不在 `JAVA_HOME` 或 `PATH` 中，请将其加入 `PATH`，或安装托管运行时。

## 列出托管运行时

```sh
umc java runtimes
```

只列出已验证的托管运行时。UMC 会检查 `runtimes/<component>/<version>/` 中的 `umc-runtime.json` 标记，并在报告前重新运行捆绑的 `java -version`。

每个结果都包含 `runtime_id`，例如：

```text
java-runtime-delta@21.0.5
```

## 安装托管运行时

```sh
umc java install 1.21.1
```

Minecraft 版本必须已经安装，因为 UMC 需要读取版本元数据来确定所需组件。命令随后会：

1. 获取 Mojang Java 运行时目录。
2. 选择当前平台和组件对应的目录条目。
3. 下载运行时清单并校验 SHA-1。
4. 下载清单中的每个文件，并校验 SHA-1 和大小。
5. 创建运行时链接，并标记可执行文件。
6. 运行下载的 Java，并校验主版本。
7. 写入 `runtimes/<component>/<version>/umc-runtime.json`。

CLI 会等待任务完成并输出结果。与游戏安装一样，重复执行命令可按文件复用已完成下载：已经匹配的文件不会重新下载。

当前版本支持的 Mojang 组件：

| 组件 | 典型用途 |
|---|---|
| `jre-legacy` | 非常旧的 Minecraft 版本 |
| `java-runtime-alpha` | 早期现代版本 |
| `java-runtime-beta` | 中间阶段的现代版本 |
| `java-runtime-gamma` | Java 17 时代版本 |
| `java-runtime-delta` | Java 21 时代版本 |

如果版本声明了此列表之外的组件，UMC 会报告不支持的组件错误。此时请使用满足版本要求的系统 Java。

托管运行时下载支持常见的 Linux、macOS 和 Windows 架构。当前 UMC 版本本身以 Linux x86_64 为发布目标；Windows 和 macOS 尚未纳入验证范围。

## 删除托管运行时

```sh
umc java runtimes
umc java remove java-runtime-delta@21.0.5
```

删除操作会移除 `runtimes/<component>/<version>/`。请先停止使用该运行时的游戏进程。该命令不会删除系统 Java。

## 示例

检查 1.21.1 所需的 Java，并安装 Mojang 运行时：

```sh
umc instance install <instance-id>
umc java detect 21
umc java install 1.21.1
umc java runtimes
```

如果检测已经报告兼容的系统 Java，则托管安装是可选的。

## 相关

- [启动与进程](./launching) —— 选择的 Java 如何被使用。
- [故障排查](./troubleshooting) —— Java 缺失、不兼容或不支持组件。
