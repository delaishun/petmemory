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

  // 新增：在 head 中引入 Google 官方登录 SDK
  app: {
    head: {
      script: [
        { 
          src: 'https://accounts.google.com/gsi/client', 
          async: true, 
          defer: true 
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      // 指向你的后端 HTTPS API 地址
      apiBase: 'https://api.petmemory.me',
      ossBaseUrl: 'https://cc-ukbucket.oss-eu-west-1.aliyuncs.com',
      
      // 新增：Google Client ID
      // 优先读取环境变量 NUXT_PUBLIC_GOOGLE_CLIENT_ID，如果没有则使用后面的默认测试值
      googleClientId: '120679372597-3gu57t735ah595vap1489hm975vq4uqe.apps.googleusercontent.com',
    },
  },
})