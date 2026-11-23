# Accounts

## Microsoft account

### Sign in

```sh
umc auth login
umc auth login --no-browser
umc auth login --redirect-uri http://localhost
```

UMC opens Microsoft's authorization page in your browser and listens on a temporary loopback port
for the callback. The authorization code is bound to the request with PKCE and a random `state`
value. UMC never receives your Microsoft password.

After Microsoft sign-in, UMC exchanges the code for Microsoft tokens, authenticates with Xbox Live
and XSTS, logs in to Minecraft services, and fetches the Minecraft profile. Only the refresh token
is saved.

### Inspect saved accounts

```sh
umc auth status
umc auth accounts
```

`auth status` reports whether an account is signed in, the default account, the credential backend
(`keyring` or `file`), and any storage warning. Account IDs are Minecraft UUIDs.

### Renew without a browser

Online launch renews the session automatically:

```sh
umc launch <instance-id> --online
```

You can also renew explicitly:

```sh
umc auth refresh
umc auth refresh --account <account-id>
```

A refresh uses the stored refresh token to obtain new Microsoft, Xbox, XSTS, and Minecraft tokens.
No browser is opened. If Microsoft rejects the refresh token (for example after a password change
or long inactivity), the saved credential is removed and you must run `umc auth login` again.

### Multiple accounts

The first account becomes the default. With more than one saved account, pass the account ID:

```sh
umc launch <instance-id> --online --account <account-id>
```

### Sign out

```sh
umc auth logout
umc auth logout --account <account-id>
```

Sign-out deletes the stored refresh token and account metadata from this machine. It does not
change your Microsoft account or Minecraft profile.

### Where credentials are stored

- **OS keyring** — GNOME Keyring/KWallet (Linux), macOS Keychain, or Windows Credential Manager.
- **File fallback** — `UMC_DATA_DIR/credentials/<account-id>.json` with `0600` permissions when no
  keyring is available.

Set `UMC_CREDENTIAL_STORE=file` to use the file backend explicitly. When the variable is unset, UMC
prefers the OS keyring and falls back automatically if it is unavailable. Microsoft access tokens,
Xbox/XSTS tokens, and Minecraft access tokens are never written to disk.
