// app/plugins/api.ts
import type { AuthUser } from '~/types/auth'

export default defineNuxtPlugin(() => {
  // app/plugins/api.ts
  const token = useCookie('token', {
    maxAge: 60 * 60 * 24 * 30, // 👈 加上这行，与后端 30d 和 LoginModal 保持绝对一致
    sameSite: 'lax',
    path: '/',
  })
  // 👈 补充泛型，确保 TS 知道这是个用户对象或 null
  const userState = useState<AuthUser | null>('auth:user', () => null)

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

    // 响应拦截：处理 401（登录失效）
    async onResponseError({ response, request }) {
      if (response.status === 401) {
        // 判断是否是因为密码错误导致的 401 (登录接口)
        // 如果是登录失败，不清空全局状态，把错误留给登录组件去处理
        const url = request.toString()
        if (url.includes('/api/auth/login') || url.includes('/api/auth/register')) {
          return
        }

        // 其他接口报 401，说明 Token 过期或失效，清理本地状态
        token.value = null
        userState.value = null

        // 可选：如果当前不在首页，强制跳回首页（由首页的 Layout 展示未登录状态）
        // const route = useRoute()
        // if (route.path !== '/') {
        //   navigateTo('/')
        // }
      }
    }
  })

  return {
    provide: {
      api,
    },
  }
})