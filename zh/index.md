---
layout: home

hero:
  text: 一个核心，驱动所有启动器
  tagline: "用 Rust 编写的无界面 Minecraft: Java Edition 启动引擎。安装、校验、启动并托管游戏进程，可通过 Rust SDK、本地 JSON-RPC 守护进程或 CLI 接入。"
  actions:
    - theme: brand
      text: 安装 UMC
      link: /zh/guide/install
    - theme: alt
      text: 阅读文档
      link: /zh/guide/quickstart
    - theme: alt
      text: GitHub
      link: https://github.com/UMC-Community/UMC

features:
  - icon:
      src: /icons/core.svg
      alt: 核心
    title: Rust 原生核心
    details: 同一个 umc-core 为 SDK、CLI 和守护进程提供能力。类型化契约、结构化错误，没有重复的启动逻辑。
  - icon:
      src: /icons/shield.svg
      alt: 完整性
    title: 完整性校验
    details: 下载的客户端、库、资源、日志配置和运行时文件会在上游提供相应元数据时按 SHA-1 与大小校验；失败的文件会重试。
  - icon:
      src: /icons/tasks.svg
      alt: 任务
    title: 持久化任务
    details: 安装以持久化任务运行，支持带序号的进度事件、取消、重试、超时，以及守护进程重启后的恢复。
  - icon:
      src: /icons/lock.svg
      alt: 本地优先
    title: 本地优先
    details: 守护进程通过私有 Unix Socket 或命名管道提供 JSON-RPC。启动器 Core 不监听 TCP、不提供托管账号服务或遥测；可选的 Yggdrasil UMC Auth 由社区独立部署和运营。
  - icon:
      src: /icons/java.svg
      alt: Java
    title: 托管 Java
    details: 在启动前检测兼容的系统 Java，或按需下载 Mojang 运行时，并对每个 Minecraft 版本做兼容性检查。
  - icon:
      src: /icons/puzzle.svg
      alt: 加载器
    title: 加载器适配器
    details: Fabric、Forge 和 NeoForge 适配器可以查询版本并生成安装预检计划；加载器实现已在此阶段暂停。
---
