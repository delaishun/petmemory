// app/plugins/api.ts
export default defineNuxtPlugin(() => {
  const token = useCookie('token')
  const userState = useState('auth:user', () => null)

  const api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase as string,
    
    // 请求拦截：自动注入 Token
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },

    // 新增：响应拦截：处理 401（登录失效）
    async onResponseError({ response }) {
      if (response.status === 401) {
        // 清理本地的登录态
        token.value = null
        userState.value = null

        // 可选：如果当前不在首页，或者需要用户重新登录，可以给个提示或跳转
        // 注意：这里不要直接强制跳转，避免在用户刚进首页还没调 /me 时就弹窗
        // 通常在调用业务接口 401 时，用户自然能感受到，或者依靠 auth-init 处理
      }
    }
  })

  return {
    provide: {
      api,
    },
  }
})