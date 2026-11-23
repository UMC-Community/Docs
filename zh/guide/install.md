---
source: en/guide/install.md
---

# 安装

UMC 以 Linux x86_64 GNU 压缩包发布，包含两个可执行文件：

- `umc` —— CLI 和 stdio JSON-RPC 适配器。
- `umcd` —— 基于私有 Unix Socket 的本地 JSON-RPC 守护进程。

::: tip 当前可用性

当前没有已发布的预编译版本。请先按下面的“从源码构建”安装；发布新版本后，再使用预编译发布包。

:::

## 从源码构建

使用 [rustup](https://rustup.rs/) 安装 Rust 1.89 或更新版本，然后构建工作区：

```sh
git clone https://github.com/UMC-Community/UMC.git
cd UMC
cargo build --workspace --locked --release
```

可执行文件位于 `target/release/umc` 和 `target/release/umcd`。如需安装到当前 Rust 用户的二进制目录：

```sh
cargo install --path crates/umc-cli --locked
```

确认二进制可以运行：

```sh
umc help
```

## 预编译发布包（发布后可用）

有可用发布版本时，从 [GitHub Releases](https://github.com/UMC-Community/UMC/releases) 下载压缩包和
SHA-256 校验和，然后校验并解压：

```sh
VERSION=<最新版本>
BASE="https://github.com/UMC-Community/UMC/releases/download/v${VERSION}"
curl -LO "${BASE}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
curl -LO "${BASE}/umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
sha256sum -c "umc-v${VERSION}-linux-x86_64-gnu.tar.gz.sha256"
tar -xzf "umc-v${VERSION}-linux-x86_64-gnu.tar.gz"
install -m 755 "umc-v${VERSION}-linux-x86_64-gnu/umc" ~/.local/bin/umc
install -m 755 "umc-v${VERSION}-linux-x86_64-gnu/umcd" ~/.local/bin/umcd
```

::: warning 发布包尚未签名

解压或运行发布包之前，请先校验发布的 SHA-256 校验和。当前版本尚未进行代码签名。

:::

## 数据目录

UMC 把所有实例、下载内容、托管 Java 运行时、任务状态、进程状态和日志放在一个数据目录下。通过 `UMC_DATA_DIR` 选择目录：

```sh
export UMC_DATA_DIR="$HOME/.local/share/umc"
umc version list
```

如果没有设置 `UMC_DATA_DIR`，开发构建会使用相对于当前工作目录的 `./umc-data`。请保持该目录私有：其中包含守护进程 Socket 和本地进程状态。

## 卸载

删除二进制文件；如果不再需要托管数据，再删除数据目录：

```sh
rm -f ~/.local/bin/umc ~/.local/bin/umcd
rm -rf "${UMC_DATA_DIR:-./umc-data}"
```

删除数据目录会删除本地实例、下载内容、运行时、日志和任务历史。它不会删除 Microsoft 或 Minecraft 账号。

## 下一步

- [快速开始](/zh/guide/quickstart) —— 创建并启动第一个实例。
- [用户指南](/zh/guide/user-guide) —— CLI、数据模型和工作流总览。
- [CLI 参考](/zh/guide/cli) —— 完整命令参考。
- [故障排查](/zh/guide/troubleshooting) —— 常见安装和启动错误。
