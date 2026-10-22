// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 移除 devServer 配置（Vercel 会自动处理端口）

  modules: ['@vant/nuxt'],
  css: [
    'vant/lib/index.css',
    '~/assets/css/common.less',
  ],
  vant: {
    importStyle: false,
  },

  runtimeConfig: {
    public: {
      // 指向你的后端 HTTPS API 地址
      apiBase: 'https://api.petmemory.me',
      ossBaseUrl: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com',
    },
  },
})