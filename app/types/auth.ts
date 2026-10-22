// app/types/auth.ts

// ============================================================
// 核心实体
// ============================================================

/**
 * 登录用户。
 * 字段与数据库 `users` 表对齐，`email` 来自 `user_identities`。
 * 后端在 `/api/auth/login`、`/api/auth/register`、`/api/auth/me`
 * 三处都应该返回同样结构，前端只处理这一种。
 */
export interface AuthUser {
  /** users.id */
  id: number
  /** users.nickname，允许为空字符串，前端展示时兜底 */
  nickname: string
  /** users.avatar_url，未设置时为 null */
  avatarUrl: string | null
  avatarUpdatedAt: string | null 
  /** 来自 user_identities.provider_user_id（provider='email'） */
  email: string
  /** users.vip_expires_at，ISO 8601 字符串或 null */
  vipExpiresAt: string | null
  /** 后端根据 vip_expires_at > NOW() 计算后返回，前端直接用 */
  isVip: boolean
  point?: number
  /** users.created_at，ISO 8601 字符串 */
  createdAt: string
}

// ============================================================
// 登录 / 注册模式
// ============================================================

/** 弹窗的两种模式 */
export type AuthMode = 'login' | 'register'

/** 登录方式，与 user_identities.provider 枚举对应 */
export type AuthProvider = 'email' | 'google'

// ============================================================
// 请求 / 响应结构
// ============================================================

/** 邮箱 + 密码登录 / 注册的请求体 */
export interface EmailAuthPayload {
  email: string
  password: string
}

/** 登录 / 注册接口返回结构 */
export interface AuthResponse {
  token: string
  user: AuthUser
}

/** /api/auth/me 返回结构（未登录时 user 为 null） */
export interface MeResponse {
  user: AuthUser | null
}

// ============================================================
// 错误响应
// ============================================================

/**
 * 后端错误返回结构。
 * Fastify 默认抛的 `Error` 会序列化成 `{ statusCode, error, message }`，
 * 业务层主动 `reply.code(4xx).send({ error: '...' })` 时是 `{ error: '...' }`。
 * 前端 catch 分支两种都尝试读一下。
 */
export interface ApiErrorBody {
  error?: string
  message?: string
  statusCode?: number
}