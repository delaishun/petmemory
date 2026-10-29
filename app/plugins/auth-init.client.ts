// app/plugins/auth-init.client.ts
import type { AuthUser, MeResponse } from '~/types/auth'

export default defineNuxtPlugin(() => {
  const user = useState<AuthUser | null>('auth:user', () => null)
  
  // 👇 统一带上 30 天的配置
  const token = useCookie<string | null>('token', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
    secure: import.meta.env.PROD,
  })

  // 没有 token 就没必要请求
  if (!token.value) return

  // 已经恢复过（比如 SSR 阶段已经注入），不重复请求
  if (user.value) return

  const { $api } = useNuxtApp()

  // 不 await，让请求在后台跑，不阻塞页面渲染
  $api<MeResponse>('/api/auth/me')
    .then((res) => {
      if (res?.user) {
        user.value = res.user
      } else {
        // 后端返回 user: null → token 已失效
        token.value = null
      }
    })
    .catch((err: any) => {
      // 401 或网络错误
      if (err?.response?.status === 401) {
        token.value = null
      }
    })
})