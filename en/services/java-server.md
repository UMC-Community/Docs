# Java Edition server

The UMC Java Edition server is a planned optional service for running a Minecraft: Java Edition
server from a Docker image. Its repository is [UMC-Java-Server](https://github.com/UMC-Community/UMC-Java-Server).

It is a **server**, not a launcher: it hosts worlds for players to join. The UMC launcher engine and
the auth service remain separate.

## Status

Not implemented yet. This page describes the intended scope.

Until this service exists, operators can run Paper, Vanilla, Fabric, Forge, or NeoForge servers
directly and point authlib-injector at [UMC Auth](./auth).

## Planned capabilities

- Select a Minecraft Java Edition version and server implementation
- Accept the Minecraft EULA explicitly during setup
- Configure memory, port, view distance, difficulty, and other `server.properties` values
- Persist worlds, plugins, mods, and configuration in Docker volumes
- Run the server as a non-root user with a read-only application layer
- Optional authlib-injector integration with UMC Auth
- Console output, logs, graceful stop, and restart policy
- Backup and restore helpers for world data
- Optional RCON, bound to localhost only by default

## Intended Compose shape

```yaml
services:
  server:
    image: ghcr.io/umc-community/umc-java-server:latest
    environment:
      MINECRAFT_VERSION: "1.21.1"
      SERVER_TYPE: paper
      MEMORY: 4G
      EULA: "true"
    ports:
      - "25565:25565"
    volumes:
      - server-data:/data
```

This is a design sketch, not a published image.

## Authentication

A Java Edition server can use UMC Auth through authlib-injector:

```sh
java -javaagent:authlib-injector.jar=https://auth.example.com/api/yggdrasil \
  -jar server.jar nogui
```

Keep `online-mode=true` when using external authentication. Do not expose the server directly to the
internet without a firewall, backups, and an operator policy for account providers.

## What it will not include

- A launcher UI
- Microsoft account ownership checks
- Modpack distribution
- A public server list
- Automatic plugin marketplace

## Relationship to other services

- [UMC Auth](./auth) provides accounts and Yggdrasil authentication.
- [Mirror](./mirror) can cache game files for launchers; it is independent from the server.
- The UMC launcher engine remains responsible for installing and launching the client.
