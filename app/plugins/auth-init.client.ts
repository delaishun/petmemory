// app/plugins/auth-init.client.ts
//
// 页面刚打开时，用本地 cookie 里的 token 换回用户信息。
// 只跑在客户端（.client 后缀），避免 SSR 阶段每个请求都打一次 /me。
//
// 注意：SSR 页面如果需要登录态（比如首页要显示头像），
// 需要在服务端也恢复一次，这个文件不负责。
// 具体做法见文件末尾的说明。

import type { AuthUser, MeResponse } from '~/types/auth'

export default defineNuxtPlugin(() => {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const token = useCookie<string | null>('token')

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
      // 401 说明 token 有效但用户被禁用/删除，同样清掉
      if (err?.response?.status === 401) {
        token.value = null
      }
      // 网络错误（后端没起来）不清 token，用户下次刷新还能重试
    })
})