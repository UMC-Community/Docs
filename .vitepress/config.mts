import { defineConfig } from 'vitepress'

const base = '/Docs/'
const repo = 'https://github.com/UMC-Community/UMC'

const landingRedirectScript = `(function () {
  var base = ${JSON.stringify(base)};
  var path = location.pathname;
  var en = base + 'en/';
  var zh = base + 'zh/';
  var landing = path === base || path === base.replace(/\\/$/, '') ||
    path === base + 'index.html' ||
    path === en || path === base + 'en' || path === en + 'index.html' ||
    path === zh || path === base + 'zh' || path === zh + 'index.html';
  if (landing) document.documentElement.classList.add('umc-landing');
})();`

const englishNav = [
  { text: 'Guide', link: '/en/guide/quickstart', activeMatch: '^/en/guide/' },
  { text: 'Development', link: '/en/development/', activeMatch: '^/en/development/' },
  { text: 'Reference', link: '/en/reference/rpc-v1', activeMatch: '^/en/reference/' },
  { text: 'Services', link: '/en/services/', activeMatch: '^/en/services/' },
  {
    text: 'About',
    link: '/en/about/',
    activeMatch: '^/en/about/',
  },
  { text: 'Install', link: '/en/guide/install' },
]

const chineseNav = [
  { text: '引导', link: '/zh/guide/quickstart', activeMatch: '^/zh/guide/' },
  { text: '开发文档', link: '/zh/development/', activeMatch: '^/zh/development/' },
  { text: '参考', link: '/zh/reference/rpc-v1', activeMatch: '^/zh/reference/' },
  { text: '服务', link: '/zh/services/', activeMatch: '^/zh/services/' },
  {
    text: '关于',
    link: '/zh/about/',
    activeMatch: '^/zh/about/',
  },
  { text: '安装', link: '/zh/guide/install' },
]

const englishSidebar = {
  '/en/guide/': [
    {
      text: 'Getting started',
      items: [
        { text: 'Quickstart', link: '/en/guide/quickstart' },
        { text: 'Installation', link: '/en/guide/install' },
        { text: 'User guide', link: '/en/guide/user-guide' },
      ],
    },
    {
      text: 'Using UMC',
      items: [
        { text: 'CLI reference', link: '/en/guide/cli' },
        { text: 'Instances', link: '/en/guide/instances' },
        { text: 'Java runtimes', link: '/en/guide/java' },
        { text: 'Launching and processes', link: '/en/guide/launching' },
        { text: 'Tasks and the local daemon', link: '/en/guide/tasks-and-daemon' },
        { text: 'Data, logs, and backups', link: '/en/guide/data-and-logs' },
        { text: 'Troubleshooting', link: '/en/guide/troubleshooting' },
      ],
    },
  ],
  '/en/development/': [
    {
      text: 'Development',
      items: [
        { text: 'Integration guide', link: '/en/development/' },
        { text: 'Rust SDK', link: '/en/development/sdk' },
        { text: 'Architecture', link: '/en/development/architecture' },
        { text: 'Loader adapters', link: '/en/development/loaders' },
        { text: 'JSON-RPC client guide', link: '/en/development/rpc-client' },
        { text: 'Testing and CI', link: '/en/development/testing' },
        { text: 'Contributing', link: '/en/development/contributing' },
      ],
    },
  ],
  '/en/services/': [
    {
      text: 'Services',
      items: [
        { text: 'Overview', link: '/en/services/' },
        { text: 'UMC Auth', link: '/en/services/auth' },
        { text: 'Auth deployment', link: '/en/services/auth-deployment' },
        { text: 'Java game server', link: '/en/services/java-server' },
        { text: 'Mirror', link: '/en/services/mirror' },
      ],
    },
  ],
  '/en/about/': [
    {
      text: 'About',
      items: [
        { text: 'About UMC', link: '/en/about/' },
        { text: 'Compatibility policy', link: '/en/about/compatibility' },
        { text: 'Privacy Policy', link: '/en/about/privacy' },
        { text: 'Terms of Service', link: '/en/about/terms' },
      ],
    },
  ],
  '/en/reference/': [
    {
      text: 'Reference',
      items: [
        { text: 'JSON-RPC v1', link: '/en/reference/rpc-v1' },
        { text: 'Auth API v1', link: '/en/reference/auth-v1' },
      ],
    },
    {
      text: 'Release notes',
      items: [
        { text: 'Release notes — v0.1.0', link: '/en/reference/releases/v0.1.0' },
      ],
    },
  ],
}

const chineseSidebar = {
  '/zh/guide/': [
    {
      text: '开始',
      items: [
        { text: '快速开始', link: '/zh/guide/quickstart' },
        { text: '安装', link: '/zh/guide/install' },
        { text: '用户指南', link: '/zh/guide/user-guide' },
      ],
    },
    {
      text: '使用 UMC',
      items: [
        { text: 'CLI 参考', link: '/zh/guide/cli' },
        { text: '实例', link: '/zh/guide/instances' },
        { text: 'Java 运行时', link: '/zh/guide/java' },
        { text: '启动与进程', link: '/zh/guide/launching' },
        { text: '任务与守护进程', link: '/zh/guide/tasks-and-daemon' },
        { text: '数据、日志与备份', link: '/zh/guide/data-and-logs' },
        { text: '故障排查', link: '/zh/guide/troubleshooting' },
      ],
    },
  ],
  '/zh/development/': [
    {
      text: '开发',
      items: [
        { text: '集成指南', link: '/zh/development/' },
        { text: 'Rust SDK', link: '/zh/development/sdk' },
        { text: '架构', link: '/zh/development/architecture' },
        { text: '加载器适配器', link: '/zh/development/loaders' },
        { text: 'JSON-RPC 客户端指南', link: '/zh/development/rpc-client' },
        { text: '测试与 CI', link: '/zh/development/testing' },
        { text: '贡献指南', link: '/zh/development/contributing' },
      ],
    },
  ],
  '/zh/services/': [
    {
      text: '服务',
      items: [
        { text: '概览', link: '/zh/services/' },
        { text: 'UMC Auth', link: '/zh/services/auth' },
        { text: '认证部署环境', link: '/zh/services/auth-deployment' },
        { text: 'Java 版服务器', link: '/zh/services/java-server' },
        { text: '镜像站', link: '/zh/services/mirror' },
      ],
    },
  ],
  '/zh/about/': [
    {
      text: '关于',
      items: [
        { text: '关于 UMC', link: '/zh/about/' },
        { text: '兼容性策略', link: '/zh/about/compatibility' },
        { text: '隐私政策', link: '/zh/about/privacy' },
        { text: '服务条款', link: '/zh/about/terms' },
      ],
    },
  ],
  '/zh/reference/': [
    {
      text: '参考',
      items: [
        { text: 'JSON-RPC v1', link: '/zh/reference/rpc-v1' },
        { text: 'Auth API v1', link: '/zh/reference/auth-v1' },
      ],
    },
    {
      text: '发布说明',
      items: [
        { text: '发布说明 — v0.1.0', link: '/zh/reference/releases/v0.1.0' },
      ],
    },
  ],
}

const chineseFooter = {
  message:
    'UMC 是独立社区项目，不是官方 Minecraft 产品，也与 Mojang 或 Microsoft 没有关联。',
  copyright: '基于 MIT License 发布 · © 2026 UMC 贡献者',
}

export default defineConfig({
  lang: 'en-US',
  title: 'Universal Minecraft Core',
  titleTemplate: ':title',
  srcExclude: ['umc-source/**'],
  description:
    'UMC is a headless Minecraft: Java Edition launcher engine written in Rust. Install, launch, and supervise the game from your own application.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['script', {}, landingRedirectScript],
    ['link', { rel: 'icon', type: 'image/png', href: '/Docs/appicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/Docs/appicon-180.png' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
    ],
    ['meta', { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' }],
    ['meta', { name: 'theme-color', content: '#0b0d12', media: '(prefers-color-scheme: dark)' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'UMC — Universal Minecraft Core' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'One Core. Every Launcher. A headless Minecraft: Java Edition launcher engine written in Rust.',
      },
    ],
    ['meta', { property: 'og:site_name', content: 'Universal Minecraft Core' }],
    ['meta', { property: 'og:image', content: 'https://umc-community.github.io/Docs/appicon.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://umc-community.github.io/Docs/appicon.png' }],
  ],
  markdown: {
    theme: { light: 'github-dark', dark: 'github-dark' },
  },
  vite: {
    plugins: [
      {
        name: 'umc-dev-root-redirect',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url?.split('?')[0]
            if (pathname === '/' || pathname === '/Docs/' || pathname === '/Docs/index.html') {
              res.statusCode = 302
              res.setHeader('Location', `${base}zh/`)
              res.end()
              return
            }
            next()
          })
        },
      },
    ],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Universal Minecraft Core',
      description:
        'UMC is a headless Minecraft: Java Edition launcher engine written in Rust.',
      themeConfig: {
        nav: englishNav,
        sidebar: englishSidebar,
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'Universal Minecraft Core',
      description: '用 Rust 编写的无界面 Minecraft: Java Edition 启动引擎。',
      themeConfig: {
        nav: chineseNav,
        sidebar: chineseSidebar,
        // Because the root theme config below applies to English, override
        // the shared labels for Chinese pages here.
        editLink: {
          pattern: 'https://github.com/UMC-Community/Docs/edit/main/:path',
          text: '在 GitHub 上编辑此页',
        },
        outline: {
          level: [2, 3],
          label: '本页目录',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        lastUpdated: {
          text: '更新时间',
          formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
        },
        footer: chineseFooter,
      },
    },
  },
  themeConfig: {
    logo: '/appicon.png',
    siteTitle: 'Universal Minecraft Core',
    nav: [],
    sidebar: {},
    socialLinks: [
      { icon: 'github', link: repo },
      {
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.946 2.418-2.157 2.418z"/></svg>',
        },
        link: 'https://discord.gg/d5qKvMp9Wc',
        ariaLabel: 'Discord',
      },
    ],
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/UMC-Community/Docs/edit/main/:path',
      text: 'Edit this page on GitHub',
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Back to top',
    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
    },
    footer: {
      message:
        'UMC is an independent project. It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.',
      copyright: 'Released under the MIT License · © 2026 UMC contributors',
    },
  },
})
