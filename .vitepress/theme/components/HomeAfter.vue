<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

const { page } = useData()
const isChinese = computed(() => page.value.relativePath.startsWith('zh/'))
const locale = computed(() => (isChinese.value ? 'zh' : 'en'))
const quickstartHref = computed(() => withBase(`/${locale.value}/guide/quickstart`))
const installHref = computed(() => withBase(`/${locale.value}/guide/install`))
const userGuideHref = computed(() => withBase(`/${locale.value}/guide/user-guide`))
const releaseHref = computed(() => withBase(`/${locale.value}/reference/releases/v0.1.0`))

const en = {
  surfaces: {
    eyebrow: 'One engine, three surfaces',
    title: 'Pick the integration that fits your app',
    lead: 'Every surface delegates to the same umc-core implementation, so behavior and state stay consistent whether you embed UMC or run it beside your process.',
    sdk: { title: 'Rust SDK', desc: 'Typed methods for versions, instances, tasks, Java, and processes — in your process.', code: 'umc-sdk' },
    daemon: { title: 'Local daemon', desc: 'Newline-delimited JSON-RPC over a Unix socket or Windows named pipe. No TCP listener.', code: 'umcd' },
    cli: { title: 'CLI', desc: 'Script installs, inspect tasks, and launch offline or online without writing code.', code: 'umc' },
  },
  quickstart: {
    eyebrow: 'Quickstart',
    title: 'From zero to a running client',
    lead: 'Create an isolated instance, verify every downloaded file, provision Java if needed, and launch the game — all from the terminal.',
    read: 'Read the quickstart',
    guide: 'User guide',
  },
  architecture: {
    eyebrow: 'Architecture',
    title: 'Headless by design',
    lead: 'UMC owns the launcher work. Your application owns the interface and product experience.',
    nodes: [
      { kicker: '01', title: 'Your application', desc: 'Desktop GUI, server tool, or automation script.', tags: ['UI', 'workflow'] },
      { kicker: '02', title: 'umc-core', desc: 'Install, verify, launch, supervise, persist.', tags: ['Rust', 'local-first', 'no telemetry'] },
      { kicker: '03', title: 'Minecraft', desc: 'Java Edition, installed into isolated instances.', tags: ['vanilla', 'online'] },
    ],
  },
  status: {
    nowPill: 'Available now',
    nowTitle: 'What is implemented',
    nowItems: [
      'Vanilla version discovery and verified downloads',
      'Isolated instances with config migration and repair',
      'Explicit offline launch with process supervision',
      'Microsoft account sign-in with silent session renewal',
      'Authenticated vanilla online launch',
      'Managed Mojang Java runtime provisioning',
      'Persistent install tasks with progress and cancellation',
      'JSON-RPC, local daemon, and Rust SDK parity',
    ],
    nextPill: 'In development',
    nextTitle: 'On the roadmap',
    nextItems: [
      'Fabric, Forge, and NeoForge install and launch',
      'Mod, modpack, and resource pack management',
      'Windows and macOS ports',
      'Live log and crash-report streaming',
    ],
    releaseLink: 'Read the release notes →',
  },
  cta: {
    eyebrow: 'Start building',
    title: 'Ship your launcher on UMC.',
    lead: 'Build the Linux target, follow the quickstart, or integrate the engine directly into your Rust application.',
    download: 'Install UMC',
    docs: 'Read the docs',
    github: 'GitHub',
    note: 'MIT licensed · Linux x86_64 · No telemetry',
  },
}

const zh = {
  surfaces: {
    eyebrow: '一个引擎，三种接入方式',
    title: '选择适合你的应用的集成方式',
    lead: '所有接入方式都委托给同一个 umc-core 实现，因此无论嵌入 UMC 还是与进程并行运行，行为和状态都保持一致。',
    sdk: { title: 'Rust SDK', desc: '在当前进程内提供版本、实例、任务、Java 和进程的类型化方法。', code: 'umc-sdk' },
    daemon: { title: '本地守护进程', desc: '通过 Unix Socket 或 Windows 命名管道提供换行分隔 JSON-RPC。没有 TCP 监听。', code: 'umcd' },
    cli: { title: 'CLI', desc: '不用写代码即可脚本化安装、查看任务并离线或在线启动客户端。', code: 'umc' },
  },
  quickstart: {
    eyebrow: '快速开始',
    title: '从零到运行客户端',
    lead: '创建独立实例，校验每个下载文件，按需准备 Java，然后从终端启动游戏。',
    read: '阅读快速开始',
    guide: '用户指南',
  },
  architecture: {
    eyebrow: '架构',
    title: '无界面设计',
    lead: 'UMC 负责启动器工作。你的应用负责界面和产品体验。',
    nodes: [
      { kicker: '01', title: '你的应用', desc: '桌面 GUI、服务器工具或自动化脚本。', tags: ['界面', '工作流'] },
      { kicker: '02', title: 'umc-core', desc: '安装、校验、启动、监管、持久化。', tags: ['Rust', '本地优先', '无遥测'] },
      { kicker: '03', title: 'Minecraft', desc: 'Java Edition，安装到独立实例中。', tags: ['原版', '在线'] },
    ],
  },
  status: {
    nowPill: '当前可用',
    nowTitle: '当前已实现',
    nowItems: [
      '原版版本发现与已验证下载',
      '带配置迁移和修复的独立实例',
      '带进程监管的显式离线启动',
      'Microsoft 账号登录与静默会话续期',
      '原版在线认证启动',
      'Mojang 托管 Java 运行时安装',
      '带进度和取消的持久化安装任务',
      'JSON-RPC、本地守护进程与 Rust SDK 能力一致',
    ],
    nextPill: '开发中',
    nextTitle: '路线图',
    nextItems: [
      'Fabric、Forge 和 NeoForge 安装与启动',
      '模组、整合包和资源包管理',
      'Windows 和 macOS 移植',
      '实时日志与崩溃报告流',
    ],
    releaseLink: '阅读发布说明 →',
  },
  cta: {
    eyebrow: '开始构建',
    title: '用 UMC 构建你的启动器。',
    lead: '构建 Linux 目标、阅读快速开始，或把引擎直接集成到你的 Rust 应用中。',
    download: '安装 UMC',
    docs: '阅读文档',
    github: 'GitHub',
    note: 'MIT 许可证 · Linux x86_64 · 无遥测',
  },
}

const t = computed(() => (isChinese.value ? zh : en))
</script>

<template>
  <div class="umc-home-extra">
    <section class="umc-section umc-surfaces">
      <div class="umc-section-head">
        <p class="umc-eyebrow">{{ t.surfaces.eyebrow }}</p>
        <h2>{{ t.surfaces.title }}</h2>
        <p class="umc-lead">{{ t.surfaces.lead }}</p>
      </div>
      <div class="umc-surface-grid">
        <article class="umc-surface-card">
          <div class="umc-surface-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M7 8 3 12l4 4M17 8l4 4-4 4M14 5l-4 14" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h3>{{ t.surfaces.sdk.title }}</h3>
          <p>{{ t.surfaces.sdk.desc }}</p>
          <code>{{ t.surfaces.sdk.code }}</code>
        </article>
        <article class="umc-surface-card">
          <div class="umc-surface-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5S14.4 18.1 12 20.5C9.6 18.1 8.5 15.2 8.5 12S9.6 5.9 12 3.5Z" />
            </svg>
          </div>
          <h3>{{ t.surfaces.daemon.title }}</h3>
          <p>{{ t.surfaces.daemon.desc }}</p>
          <code>{{ t.surfaces.daemon.code }}</code>
        </article>
        <article class="umc-surface-card">
          <div class="umc-surface-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="m7 9 3 3-3 3M12.5 15H17" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h3>{{ t.surfaces.cli.title }}</h3>
          <p>{{ t.surfaces.cli.desc }}</p>
          <code>{{ t.surfaces.cli.code }}</code>
        </article>
      </div>
    </section>

    <section class="umc-section umc-quickstart">
      <div class="umc-quickstart-copy">
        <p class="umc-eyebrow">{{ t.quickstart.eyebrow }}</p>
        <h2>{{ t.quickstart.title }}</h2>
        <p class="umc-lead">{{ t.quickstart.lead }}</p>
        <div class="umc-inline-links">
          <a class="umc-inline-link" :href="quickstartHref">
            {{ t.quickstart.read }}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 10h12M11 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <a class="umc-inline-link" :href="userGuideHref">{{ t.quickstart.guide }}</a>
        </div>
      </div>
      <div class="umc-code-card">
        <div class="umc-code-card__bar">
          <span class="umc-code-dot umc-code-dot--red"></span>
          <span class="umc-code-dot umc-code-dot--yellow"></span>
          <span class="umc-code-dot umc-code-dot--green"></span>
          <span>bash</span>
          <span class="umc-code-card__tag">Linux x86_64</span>
        </div>
        <pre><code><span class="umc-c-prompt">$</span> umc version list
<span class="umc-c-prompt">$</span> umc instance create Survival 1.21.1
<span class="umc-c-out">→ instance-8f14d9 created</span>
<span class="umc-c-prompt">$</span> umc instance install instance-8f14d9
<span class="umc-c-prompt">$</span> umc java install 1.21.1
<span class="umc-c-prompt">$</span> umc auth login
<span class="umc-c-prompt">$</span> umc launch instance-8f14d9 --online
<span class="umc-c-out">→ Minecraft 1.21.1 running</span></code></pre>
      </div>
    </section>

    <section class="umc-section umc-architecture">
      <div class="umc-section-head umc-section-head--center">
        <p class="umc-eyebrow">{{ t.architecture.eyebrow }}</p>
        <h2>{{ t.architecture.title }}</h2>
        <p class="umc-lead">{{ t.architecture.lead }}</p>
      </div>
      <div class="umc-flow">
        <template v-for="(node, i) in t.architecture.nodes" :key="node.kicker">
          <div class="umc-flow-node" :class="{ 'umc-flow-node--core': i === 1 }">
            <span class="umc-flow-kicker">{{ node.kicker }}</span>
            <strong>{{ node.title }}</strong>
            <p>{{ node.desc }}</p>
            <div class="umc-flow-tags">
              <span v-for="tag in node.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <div v-if="i < t.architecture.nodes.length - 1" class="umc-flow-arrow" aria-hidden="true">
            <svg viewBox="0 0 40 16" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M2 8h34M30 3l6 5-6 5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </template>
      </div>
    </section>

    <section class="umc-section umc-status">
      <div class="umc-status-card umc-status-card--now">
        <div class="umc-status-head">
          <span class="umc-status-pill umc-status-pill--live"><span></span>{{ t.status.nowPill }}</span>
          <h2>{{ t.status.nowTitle }}</h2>
        </div>
        <ul class="umc-checklist">
          <li v-for="item in t.status.nowItems" :key="item">{{ item }}</li>
        </ul>
      </div>
      <div class="umc-status-card umc-status-card--next">
        <div class="umc-status-head">
          <span class="umc-status-pill umc-status-pill--next"><span></span>{{ t.status.nextPill }}</span>
          <h2>{{ t.status.nextTitle }}</h2>
        </div>
        <ul class="umc-roadmap">
          <li v-for="item in t.status.nextItems" :key="item"><span class="umc-roadmap-dot"></span>{{ item }}</li>
        </ul>
        <a class="umc-status-link" :href="releaseHref">{{ t.status.releaseLink }}</a>
      </div>
    </section>

    <section class="umc-cta">
      <div class="umc-cta-glow"></div>
      <div class="umc-cta-inner">
        <p class="umc-eyebrow">{{ t.cta.eyebrow }}</p>
        <h2>{{ t.cta.title }}</h2>
        <p>{{ t.cta.lead }}</p>
        <div class="umc-cta-actions">
          <a
            class="umc-button umc-button--primary"
            :href="installHref"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M10 3v10M6 9l4 4 4-4M4 16h12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ t.cta.download }}
          </a>
          <a class="umc-button" :href="quickstartHref">
            {{ t.cta.docs }}
          </a>
          <a class="umc-button umc-button--ghost" href="https://github.com/UMC-Community/UMC">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.14 1.18a10.9 10.9 0 0 1 5.72 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
            {{ t.cta.github }}
          </a>
        </div>
        <p class="umc-cta-note">{{ t.cta.note }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.umc-home-extra {
  width: 100%;
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 96px;
}

.umc-section {
  padding: 72px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.umc-section-head {
  max-width: 660px;
  margin-bottom: 36px;
}
.umc-section-head--center {
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.umc-eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
}

.umc-section h2,
.umc-cta h2 {
  margin: 0 0 12px;
  font-size: clamp(26px, 3.4vw, 36px);
  line-height: 1.18;
  letter-spacing: -0.02em;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.umc-lead {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.umc-surface-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.umc-surface-card {
  position: relative;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
}
.umc-surface-card:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 20px 40px -28px rgba(52, 81, 178, 0.5);
}
.umc-surface-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 16px;
  border-radius: 12px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 18%, transparent);
}
.umc-surface-icon svg { width: 22px; height: 22px; }
.umc-surface-card h3 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 650;
  color: var(--vp-c-text-1);
}
.umc-surface-card p {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.umc-surface-card code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  padding: 3px 8px;
}

.umc-quickstart {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 40px;
  align-items: center;
}
.umc-inline-links {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 24px;
}
.umc-inline-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.umc-inline-link svg { width: 16px; height: 16px; transition: transform 0.2s; }
.umc-inline-link:hover svg { transform: translateX(3px); }

.umc-code-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(155deg, #141824, #0b0e14 70%);
  box-shadow: 0 32px 64px -36px rgba(3, 6, 18, 0.7);
  overflow: hidden;
}
.umc-code-card__bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #8b93a7;
}
.umc-code-dot { width: 9px; height: 9px; border-radius: 50%; }
.umc-code-dot--red { background: #ff5f57; }
.umc-code-dot--yellow { background: #febc2e; }
.umc-code-dot--green { background: #28c840; }
.umc-code-card__tag {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(124, 140, 255, 0.22);
  background: rgba(124, 140, 255, 0.1);
  color: #a8b1ff;
  font-size: 10px;
}
.umc-code-card pre {
  margin: 0;
  padding: 20px 22px 24px;
  overflow-x: auto;
}
.umc-code-card code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 2;
  color: #dfe3ee;
}
.umc-c-prompt { color: #22c997; margin-right: 6px; }
.umc-c-out { color: #7c869b; }

.umc-flow {
  display: grid;
  grid-template-columns: 1fr 40px 1fr 40px 1fr;
  align-items: stretch;
  gap: 0;
}
.umc-flow-node {
  padding: 22px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.umc-flow-node--core {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 38%, var(--vp-c-divider));
  background: linear-gradient(160deg, var(--vp-c-brand-soft), var(--vp-c-bg-soft) 70%);
}
.umc-flow-kicker {
  display: block;
  margin-bottom: 34px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.umc-flow-node strong {
  display: block;
  margin-bottom: 6px;
  font-size: 16px;
  color: var(--vp-c-text-1);
}
.umc-flow-node p {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
.umc-flow-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.umc-flow-tags span {
  font-size: 10.5px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
  border-radius: 999px;
  padding: 2px 8px;
}
.umc-flow-arrow {
  display: grid;
  place-items: center;
  color: var(--vp-c-text-3);
}
.umc-flow-arrow svg { width: 30px; }

.umc-status {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.umc-status-card {
  padding: 28px;
  border-radius: 18px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.umc-status-card--next {
  background:
    linear-gradient(160deg, rgba(34, 201, 151, 0.06), transparent 55%),
    var(--vp-c-bg-soft);
}
.umc-status-head h2 {
  margin: 14px 0 20px;
  font-size: 22px;
  letter-spacing: -0.01em;
}
.umc-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 5px 10px;
}
.umc-status-pill span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.umc-status-pill--live {
  color: #18794e;
  background: rgba(16, 185, 129, 0.14);
}
.umc-status-pill--live span { background: #30a46c; }
.umc-status-pill--next {
  color: #915930;
  background: rgba(234, 179, 8, 0.13);
}
.umc-status-pill--next span { background: #da8b17; }
.dark .umc-status-pill--live { color: #3dd68c; }
.dark .umc-status-pill--next { color: #f9b44e; }

.umc-checklist,
.umc-roadmap {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.umc-checklist li {
  position: relative;
  padding-left: 27px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
.umc-checklist li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.16);
}
.umc-checklist li::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 7px;
  width: 5px;
  height: 3px;
  border-left: 1.6px solid #30a46c;
  border-bottom: 1.6px solid #30a46c;
  transform: rotate(-45deg);
}
.umc-roadmap li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
.umc-roadmap-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #da8b17;
  flex: none;
}
.umc-status-link {
  display: inline-block;
  margin-top: 22px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.umc-cta {
  position: relative;
  margin-top: 24px;
  padding: 64px 32px;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 26%, var(--vp-c-divider));
  background:
    radial-gradient(circle at 20% 0%, rgba(94, 112, 255, 0.16), transparent 45%),
    radial-gradient(circle at 85% 100%, rgba(34, 201, 151, 0.14), transparent 45%),
    var(--vp-c-bg-soft);
  overflow: hidden;
  text-align: center;
}
.umc-cta-glow {
  position: absolute;
  inset: -40% 30% auto;
  height: 260px;
  background: radial-gradient(circle, rgba(94, 112, 255, 0.22), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
}
.umc-cta-inner { position: relative; }
.umc-cta p {
  max-width: 560px;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.umc-cta-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 28px 0 18px;
}
.umc-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s, background 0.2s;
}
.umc-button:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
}
.umc-button svg { width: 17px; height: 17px; }
.umc-button--primary {
  border-color: transparent;
  background: #4f63e8;
  color: #fff;
  box-shadow: 0 10px 24px -10px rgba(79, 99, 232, 0.7);
}
.umc-button--primary:hover {
  background: #4356d6;
  border-color: transparent;
}
.umc-button--ghost {
  background: transparent;
}
.umc-cta-note {
  font-size: 12.5px !important;
  color: var(--vp-c-text-3) !important;
  font-family: var(--vp-font-family-mono);
}

@media (max-width: 960px) {
  .umc-surface-grid { grid-template-columns: 1fr; }
  .umc-quickstart { grid-template-columns: 1fr; gap: 28px; }
  .umc-flow { grid-template-columns: 1fr; gap: 12px; }
  .umc-flow-arrow { transform: rotate(90deg); padding: 2px 0; }
  .umc-status { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .umc-home-extra { padding: 0 18px 64px; }
  .umc-section { padding: 52px 0; }
  .umc-cta { padding: 48px 20px; }
  .umc-cta-actions { flex-direction: column; align-items: stretch; }
  .umc-button { justify-content: center; }
}
</style>
