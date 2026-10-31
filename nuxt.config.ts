// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@vant/nuxt'],
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
      // lang 默认 en；若想跟随用户语言，可在 app.vue 里用 useHead({ htmlAttrs: { lang } }) 动态覆盖
      htmlAttrs: { lang: 'en' },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',

      // ---------- 2. 全局 Title 模板 ----------
      // 首页（无 title 或 title=PetMemory）→ 完整品牌 slogan
      // 子页面（title="Pipi's Story"）→ "Pipi's Story - Pet Memorial | PetMemory"
      // 这样每个页面只要在 useSeoMeta({ title: 'xxx' }) 设置，就会自动带上品牌后缀
      titleTemplate: (title?: string) => {
        if (!title || title === 'PetMemory') {
          return 'PetMemory - Pet Memorial | Virtual Pet Sanctuary'
        }
        return `${title} - Pet Memorial | PetMemory`
      },
      title: 'PetMemory',

      // ---------- 3. Meta 标签 ----------
      meta: [
        // 基础 SEO（子页面用 useSeoMeta 覆盖即可，未覆盖时用这里的兜底）
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
        // 浏览器地址栏 / 移动端状态栏主题色（与暖色系设计对齐）
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

      // ---------- 4. Link 标签 ----------
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },

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

      // ---------- 5. 第三方脚本（保留原有） ----------
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

  runtimeConfig: {
    public: {
      apiBase: 'https://api.petmemory.me',
      ossBaseUrl: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com',
      googleClientId:
        '120679372597-3gu57t735ah595vap1489hm975vq4uqe.apps.googleusercontent.com',
      paddleClientToken: 'live_a13155a4f9309f40374ce0dc163',
    },
  },
})