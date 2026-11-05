// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vant/nuxt', '@nuxtjs/sitemap'],
  css: [
    'vant/lib/index.css',
    '~/assets/css/common.less',
  ],
  vant: {
    importStyle: false,
  },

  app: {
    head: {
      // ---------- 1. 全局 HTML 基础 ----------
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',

      // ---------- 2. 全局 Title 模板 ----------
      titleTemplate: (title?: string) => {
        if (!title || title === 'PetMemory') {
          return 'PetMemory - Pet Memorial | Virtual Pet Sanctuary'
        }
        return `${title} - Pet Memorial | PetMemory`
      },
      title: 'PetMemory',

      // ---------- 3. Meta 标签 ----------
      meta: [
        // 基础 SEO
        {
          name: 'description',
          content:
            'A peaceful virtual sanctuary honoring beloved pets. Create a memorial page, share photos, leave messages, and keep their memory alive.',
        },
        {
          name: 'keywords',
          content:
            'pet memorial, virtual pet memorial, pet loss support, rainbow bridge, pet tribute, remember my pet',
        },
        { name: 'author', content: 'PetMemory' },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { name: 'theme-color', content: '#fff7ed' },

        // Open Graph 兜底
        { property: 'og:site_name', content: 'PetMemory' },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:title',
          content: 'PetMemory - Pet Memorial | Virtual Pet Sanctuary',
        },
        {
          property: 'og:description',
          content:
            'A peaceful virtual sanctuary honoring beloved pets. Create a memorial page, share photos, leave messages, and keep their memory alive.',
        },
        { property: 'og:image', content: 'https://music.petmemory.me/og-cover.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '600' },
        { property: 'og:image:alt', content: 'PetMemory - Pet Memorial' },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'zh_CN' },

        // Twitter / X
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:title',
          content: 'PetMemory - Pet Memorial | Virtual Pet Sanctuary',
        },
        {
          name: 'twitter:description',
          content:
            'A peaceful virtual sanctuary honoring beloved pets. Create a memorial page, share photos, leave messages, and keep their memory alive.',
        },
        { name: 'twitter:image', content: 'https://music.petmemory.me/og-cover.jpg' },
      ],

      // ---------- 4. Link 标签（包含全套图标） ----------
      link: [
        // 基础 favicon
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        
        // Apple iOS 图标
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        
        // Android / PWA 清单文件
        { rel: 'manifest', href: '/site.webmanifest' },

        // 关键第三方域名预连接，加速首屏
        { rel: 'preconnect', href: 'https://api.petmemory.me', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://api.petmemory.me' },
        {
          rel: 'preconnect',
          href: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com',
          crossorigin: '',
        },
        { rel: 'dns-prefetch', href: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com' },
        { rel: 'preconnect', href: 'https://accounts.google.com' },
      ],

      // ---------- 5. 第三方脚本 ----------
      script: [
        {
          src: 'https://accounts.google.com/gsi/client',
          async: true,
          defer: true,
        },
        {
          src: 'https://cdn.paddle.com/paddle/v2/paddle.js',
          async: true,
          defer: true,
        },
      ],
    },
  },

  // ============================================================
  // ISR 与路由缓存规则 (针对 Vercel 环境优化)
  // ============================================================
  routeRules: {
    // 1. 首页：访问频率最高，内容相对固定，设置 60 秒的 ISR 缓存
    '/': { isr: 60 },

    // 2. 纯静态页面（政策、关于、价格）：极少变动，缓存 1 小时（3600秒）
    '/about': { isr: 3600 },
    '/privacy': { isr: 3600 },
    '/terms': { isr: 3600 },
    '/refund': { isr: 3600 },
    '/pricing': { isr: 3600 }, // 👈 新增 Pricing 页面缓存

    // 3. 宠物模块
    // 👇 精确匹配 /pets 列表页，缓存 30 分钟 (1800秒)
    '/pets': { isr: 1800 }, 
    // 👇 匹配 /pets/xxx 详情页，取消 ISR 缓存，保证送礼、留言实时生效
    '/pets/**': { isr: false }, 

    // 4. 文章模块
    '/articles': { isr: 3600 },
    '/articles/**': { isr: 3600 },

    // 5. 用户私有页面与管理后台：禁用 ISR 缓存，防止数据泄露或串号
    '/users/**': { isr: false },
    '/petadm/**': { isr: false },
  },

  // ============================================================
  // 👇 Sitemap 配置
  // ============================================================
  sitemap: {
    // 排除不需要被搜索引擎抓取的页面（后台、私有页面）
    exclude: [
      '/petadm',
      '/petadm/**',
      '/users',
      '/users/**'
    ],
    // 注册动态数据源（获取宠物和文章详情页）
    sources: ['/api/__sitemap__/urls'], 
  },

  runtimeConfig: {
    public: {
      apiBase: 'https://api.petmemory.me',
      siteUrl: 'https://www.petmemory.me', // 确保与你的生产域名一致
      ossBaseUrl: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com',
      googleClientId:
        '120679372597-3gu57t735ah595vap1489hm975vq4uqe.apps.googleusercontent.com',
      // 注意：保留了你当前使用的 live 生产环境 token
      paddleClientToken: 'test_d2ede7ad3346bc1c22aa2268739',   //sandbox
      // paddleClientToken: 'live_a13155a4f9309f40374ce0dc163',  //product
    },
  },
})