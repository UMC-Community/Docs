---
source: en/guide/accounts.md
---

# 账号

## Microsoft 账号

### 登录

```sh
umc auth login
umc auth login --no-browser
umc auth login --redirect-uri http://localhost
```

UMC 会在浏览器中打开 Microsoft 授权页面，并在临时回环端口监听回调。授权码通过 PKCE 和随机 `state` 值绑定到本次请求。UMC 永远不会收到你的 Microsoft 密码。

Microsoft 登录完成后，UMC 会用授权码换取 Microsoft Token，依次通过 Xbox Live、XSTS 和 Minecraft 服务登录，并获取 Minecraft 档案。只有刷新 Token 会被保存。

### 查看已保存账号

```sh
umc auth status
umc auth accounts
```

`auth status` 会报告是否已登录、默认账号、凭据后端（`keyring` 或 `file`）以及存储警告。账号 ID 是 Minecraft UUID。

### 无需浏览器续期

在线启动会自动续期：

```sh
umc launch <instance-id> --online
```

也可以显式续期：

```sh
umc auth refresh
umc auth refresh --account <account-id>
```

续期使用已保存的刷新 Token 获取新的 Microsoft、Xbox、XSTS 和 Minecraft Token，不会打开浏览器。如果 Microsoft 拒绝刷新 Token（例如修改密码或长期未使用），已保存的凭据会被删除，需要重新运行 `umc auth login`。

### 多账号

第一个账号会成为默认账号。保存了多个账号时，通过账号 ID 选择：

```sh
umc launch <instance-id> --online --account <account-id>
```

### 退出登录

```sh
umc auth logout
umc auth logout --account <account-id>
```

退出登录会从本机删除已保存的刷新 Token 和账号元数据，不会更改你的 Microsoft 账号或 Minecraft 档案。

### 凭据存储位置

- **操作系统钥匙串** —— Linux 的 GNOME Keyring/KWallet、macOS Keychain 或 Windows Credential Manager。
- **文件后备** —— 没有可用钥匙串时，使用 `UMC_DATA_DIR/credentials/<account-id>.json`，权限为 `0600`。

设置 `UMC_CREDENTIAL_STORE=file` 可显式使用文件后端。未设置时，UMC 优先使用操作系统钥匙串，不可用时自动回退。Microsoft 访问 Token、Xbox/XSTS Token 和 Minecraft 访问 Token 永远不会写入磁盘。
