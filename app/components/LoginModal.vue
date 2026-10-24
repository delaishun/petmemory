<!-- app/components/LoginModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import type { AuthUser, AuthResponse } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

interface Props {
  modelValue: boolean
  initialMode?: 'login' | 'register' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  initialMode: 'login',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', user: AuthUser): void
}>()

// ---------- v-model ----------
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ---------- 表单状态 ----------
type Mode = 'login' | 'register' | 'reset'
const mode = ref<Mode>(props.initialMode)

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: '',
})

const errors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: '',
  global: '',
})

const loading = ref(false)
const emailInputRef = ref<HTMLInputElement | null>(null)

// ---------- 验证码发送状态 ----------
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// ---------- 顶层 cookie / state ----------
const token = useCookie<string | null>('token', {
  maxAge: 60 * 60 * 24 * 7,
  sameSite: 'lax',
  path: '/',
  secure: import.meta.env.PROD,
})
const userState = useState<AuthUser | null>('auth:user', () => null)

// ---------- Google SDK 环境配置 ----------
const config = useRuntimeConfig()
const googleClientId = config.public.googleClientId
// 声明 window.google 类型，防止 TS 报错
declare global {
  interface Window {
    google: any
  }
}

// ---------- 校验规则 ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => EMAIL_RE.test(form.email.trim()))
const isPasswordValid = computed(() => form.password.length >= 6)
const isPasswordConfirmed = computed(
  () => !!form.confirmPassword && form.password === form.confirmPassword,
)
const isCodeValid = computed(() => /^\d{6}$/.test(form.code.trim()))

const canForgotPassword = computed(() => {
  if (loading.value) return false
  return isEmailValid.value
})

const canSendCode = computed(() => {
  if (sendingCode.value) return false
  if (countdown.value > 0) return false
  if (!isEmailValid.value) return false

  if (mode.value === 'register') {
    if (!isPasswordValid.value) return false
    if (!isPasswordConfirmed.value) return false
  }
  return true
})

const sendCodeText = computed(() => {
  if (sendingCode.value) return t('auth_sending_code')
  if (countdown.value > 0) return t('auth_resend_code', { n: countdown.value })
  return t('auth_send_code')
})

const submitText = computed(() => {
  if (loading.value) return t('auth_btn_processing')
  if (mode.value === 'login') return t('auth_btn_login')
  if (mode.value === 'register') return t('auth_btn_register')
  return t('auth_btn_reset')
})

const titleText = computed(() => {
  if (mode.value === 'login') return t('auth_title_login')
  if (mode.value === 'register') return t('auth_title_register')
  return t('auth_title_reset')
})

const subtitleText = computed(() => {
  if (mode.value === 'login') return t('auth_subtitle_login')
  if (mode.value === 'register') return t('auth_subtitle_register')
  return t('auth_subtitle_reset')
})

// ---------- 工具方法 ----------
function resetErrors() {
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.code = ''
  errors.global = ''
}

function resetForm() {
  form.email = ''
  form.password = ''
  form.confirmPassword = ''
  form.code = ''
  resetErrors()
  stopCountdown()
  countdown.value = 0
}

function switchMode(m: Mode) {
  if (mode.value === m) return
  const oldMode = mode.value
  mode.value = m

  form.confirmPassword = ''
  form.code = ''

  if (oldMode === 'reset' || m === 'reset') {
    form.password = ''
  }

  resetErrors()
  stopCountdown()
  countdown.value = 0

  nextTick(() => emailInputRef.value?.focus())
}

function startCountdown(seconds: number) {
  stopCountdown()
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      stopCountdown()
      countdown.value = 0
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// ---------- 表单校验 ----------
function validate(): boolean {
  resetErrors()
  let ok = true

  if (!form.email) {
    errors.email = t('auth_err_email_required')
    ok = false
  } else if (!EMAIL_RE.test(form.email)) {
    errors.email = t('auth_err_email_invalid')
    ok = false
  }

  if (!form.password) {
    errors.password = mode.value === 'reset' ? t('auth_err_new_password_required') : t('auth_err_password_required')
    ok = false
  } else if (form.password.length < 6) {
    errors.password = t('auth_err_password_min')
    ok = false
  }

  if (mode.value === 'register') {
    if (!form.confirmPassword) {
      errors.confirmPassword = t('auth_err_confirm_required')
      ok = false
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = t('auth_err_confirm_mismatch')
      ok = false
    }
  }

  if (mode.value === 'register' || mode.value === 'reset') {
    if (!form.code) {
      errors.code = t('auth_err_code_required')
      ok = false
    } else if (!isCodeValid.value) {
      errors.code = t('auth_err_code_invalid')
      ok = false
    }
  }

  return ok
}

// ---------- 忘记密码 ----------
function handleForgotPassword() {
  if (!canForgotPassword.value) return
  switchMode('reset')
}

// ---------- 发送验证码 ----------
async function handleSendCode() {
  if (!canSendCode.value) return
  sendingCode.value = true
  errors.global = ''

  try {
    const { $api } = useNuxtApp()
    if (mode.value === 'reset') {
      await $api('/api/auth/send-reset-code', {
        method: 'POST',
        body: { email: form.email.trim().toLowerCase() },
      })
    } else {
      await $api('/api/auth/send-code', {
        method: 'POST',
        body: { email: form.email.trim().toLowerCase(), password: form.password },
      })
    }
    showToast({ type: 'success', message: t('auth_msg_code_sent') })
    startCountdown(60)
    nextTick(() => { document.getElementById('auth-code')?.focus() })
  } catch (err: any) {
    errors.global = err?.data?.error || err?.data?.message || err?.message || t('auth_err_send_failed')
  } finally {
    sendingCode.value = false
  }
}

// ---------- 登录 / 注册成功后统一处理 ----------
function applyAuthResult(res: AuthResponse) {
  token.value = res.token
  userState.value = res.user
  emit('success', res.user)
  visible.value = false
}

// ---------- 提交表单 ----------
async function handleSubmit() {
  if (loading.value) return
  if (!validate()) return

  loading.value = true
  errors.global = ''

  try {
    const { $api } = useNuxtApp()
    if (mode.value === 'login') {
      const res = await $api<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email: form.email.trim().toLowerCase(), password: form.password },
      })
      applyAuthResult(res)
    } else if (mode.value === 'register') {
      const res = await $api<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: { email: form.email.trim().toLowerCase(), password: form.password, code: form.code.trim() },
      })
      applyAuthResult(res)
    } else {
      await $api('/api/auth/reset-password', {
        method: 'POST',
        body: { email: form.email.trim().toLowerCase(), newPassword: form.password, code: form.code.trim() },
      })
      showToast({ type: 'success', message: t('auth_msg_reset_success') })
      mode.value = 'login'
      form.password = ''
      form.confirmPassword = ''
      form.code = ''
      resetErrors()
      stopCountdown()
      countdown.value = 0
    }
  } catch (err: any) {
    errors.global = err?.data?.error || err?.data?.message || err?.message || t('auth_err_operation_failed')
  } finally {
    loading.value = false
  }
}

// ============================================================
// Google 登录逻辑
// ============================================================
let googleInitialized = false

// 初始化 Google SDK
function initGoogleSDK() {
  if (!window.google || googleInitialized) return
  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCallback,
    cancel_on_tap_outside: true,
  })
  googleInitialized = true
}

// 点击自定义按钮时触发 Google 弹窗
function handleGoogleLogin() {
  if (loading.value) return
  initGoogleSDK()
  
  if (window.google) {
    // 使用官方 API 弹出账号选择器
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // 如果浏览器拦截了弹窗（或者没有登录任何 Google 账号），给出提示
        showToast('无法弹出 Google 登录，请检查浏览器设置')
      }
    })
  } else {
    showToast('Google 登录组件加载中，请稍后再试')
  }
}

// Google 认证成功后的回调
async function handleGoogleCallback(response: any) {
  if (!response.credential) return
  loading.value = true
  errors.global = ''

  try {
    const { $api } = useNuxtApp()
    // 调用后端新增的 /api/auth/google 接口
    const res = await $api<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: { credential: response.credential },
    })
    
    showToast({ type: 'success', message: t('auth_title_login') }) // 或者 '登录成功'
    applyAuthResult(res)
  } catch (err: any) {
    errors.global = err?.data?.error || err?.data?.message || err?.message || 'Google 登录失败'
  } finally {
    loading.value = false
  }
}

// ---------- 副作用 ----------
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      mode.value = props.initialMode
      nextTick(() => {
        emailInputRef.value?.focus()
        // 弹窗打开时顺便初始化一下 Google SDK
        initGoogleSDK()
      })
    } else {
      resetForm()
      mode.value = 'login'
    }
  },
)

watch(
  () => props.initialMode,
  (m) => {
    if (props.modelValue && m !== mode.value) {
      switchMode(m)
    }
  },
)

watch(
  () => form.email,
  () => {
    if (countdown.value > 0) {
      stopCountdown()
      countdown.value = 0
    }
  },
)

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue && !loading.value) {
    visible.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
  // 提前尝试初始化
  initGoogleSDK()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEsc)
  stopCountdown()
})
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="{ width: '92%', maxWidth: '420px' }"
    :close-on-click-overlay="!loading && !sendingCode"
    teleport="body"
  >
    <div class="auth">
      <header class="auth__header">
        <h2 class="auth__title">{{ titleText }}</h2>
        <p class="auth__subtitle">{{ subtitleText }}</p>
      </header>

      <form class="auth__form" novalidate @submit.prevent="handleSubmit">
        <!-- 邮箱 -->
        <div class="field">
          <label class="field__label" for="auth-email">{{ t('auth_email') }}</label>
          <input
            id="auth-email"
            ref="emailInputRef"
            v-model.trim="form.email"
            type="email"
            class="input"
            :placeholder="t('auth_placeholder_email')"
            autocomplete="email"
            :disabled="loading"
          />
          <span v-if="errors.email" class="field__error">{{ errors.email }}</span>
        </div>

        <!-- 密码 -->
        <div class="field">
          <label class="field__label" for="auth-password">
            {{ mode === 'reset' ? t('auth_new_password') : t('auth_password') }}
          </label>
          <input
            id="auth-password"
            v-model="form.password"
            type="password"
            class="input"
            :placeholder="t('auth_placeholder_password')"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :disabled="loading"
          />
          <span v-if="errors.password" class="field__error">{{ errors.password }}</span>
        </div>

        <!-- 确认密码 -->
        <div v-if="mode === 'register'" class="field">
          <label class="field__label" for="auth-confirm">{{ t('auth_confirm_password') }}</label>
          <input
            id="auth-confirm"
            v-model="form.confirmPassword"
            type="password"
            class="input"
            :placeholder="t('auth_placeholder_confirm')"
            autocomplete="new-password"
            :disabled="loading"
          />
          <span v-if="errors.confirmPassword" class="field__error">{{ errors.confirmPassword }}</span>
        </div>

        <!-- 验证码 -->
        <div v-if="mode === 'register' || mode === 'reset'" class="field">
          <label class="field__label" for="auth-code">{{ t('auth_code') }}</label>
          <input
            id="auth-code"
            v-model.trim="form.code"
            type="text"
            inputmode="numeric"
            class="input"
            :placeholder="t('auth_placeholder_code')"
            maxlength="6"
            autocomplete="one-time-code"
            :disabled="loading"
          />
          <span v-if="errors.code" class="field__error">{{ errors.code }}</span>
        </div>

        <p v-if="errors.global" class="auth__error">{{ errors.global }}</p>

        <!-- 按钮区 -->
        <div class="auth__actions">
          <button
            v-if="mode === 'register' || mode === 'reset'"
            type="button"
            class="btn btn--lg auth__ghost"
            :disabled="!canSendCode"
            @click="handleSendCode"
          >
            {{ sendCodeText }}
          </button>

          <button
            type="submit"
            class="btn btn--primary btn--lg auth__submit"
            :disabled="loading"
          >
            {{ submitText }}
          </button>

          <button
            v-if="mode === 'login'"
            type="button"
            class="btn btn--lg auth__ghost"
            :disabled="!canForgotPassword"
            @click="handleForgotPassword"
          >
            {{ t('auth_forgot_password') }}
          </button>
        </div>
      </form>

      <!-- 分割线 + Google 按钮 -->
      <template v-if="mode !== 'reset'">
        <div class="auth__divider">
          <span>{{ t('auth_or') }}</span>
        </div>

        <button
          type="button"
          class="auth__google"
          :disabled="loading"
          @click="handleGoogleLogin"
        >
          <svg class="auth__google-icon" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>{{ t('auth_google_login') }}</span>
        </button>
      </template>

      <footer class="auth__footer">
        <template v-if="mode === 'login'">
          <span>{{ t('auth_no_account') }}</span>
          <a href="javascript:;" @click.prevent="switchMode('register')">{{ t('auth_go_register') }}</a>
        </template>
        <template v-else-if="mode === 'register'">
          <span>{{ t('auth_has_account') }}</span>
          <a href="javascript:;" @click.prevent="switchMode('login')">{{ t('auth_go_login') }}</a>
        </template>
        <template v-else>
          <span>{{ t('auth_remembered') }}</span>
          <a href="javascript:;" @click.prevent="switchMode('login')">{{ t('auth_go_login') }}</a>
        </template>
      </footer>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

/* 样式完全没有变，原样保留 */
.auth {
  padding: @sp-6 @sp-5 @sp-5;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4 @sp-4;
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-5;
  }

  &__title {
    margin: 0 0 @sp-1;
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
    letter-spacing: -.01em;
  }

  &__subtitle {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
    line-height: @lh-base;
  }

  &__form {
    margin-top: @sp-1;

    .field:last-of-type {
      margin-bottom: @sp-3;
    }
  }

  &__error {
    margin: 0 0 @sp-3;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    gap: @sp-2;
    margin-top: @sp-1;

    .btn {
      flex: 1;
      height: 42px;
    }
  }

  &__ghost {
    letter-spacing: .02em;
    font-size: @fs-sm;

    &:disabled {
      color: @ink-3;
      background: @surface-2;
      border-color: @border;
    }
  }

  &__submit {
    letter-spacing: .1em;
  }

  &__divider {
    position: relative;
    margin: @sp-5 0 @sp-4;
    text-align: center;

    &::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: @border;
    }

    span {
      position: relative;
      display: inline-block;
      padding: 0 @sp-3;
      font-size: @fs-xs;
      color: @ink-3;
      background: @surface;
    }
  }

  &__google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: @sp-2;
    width: 100%;
    height: 42px;
    padding: 0 @sp-4;
    font-family: @font-sans;
    font-size: @fs-sm;
    font-weight: 500;
    color: @ink-1;
    background: @surface;
    border: 1px solid @border-strong;
    border-radius: @radius;
    cursor: pointer;
    transition: all @dur-fast ease;

    &:hover:not(:disabled) {
      border-color: @accent;
      background: @surface-2;
    }

    &:active:not(:disabled) {
      transform: translateY(1px);
    }

    &:disabled {
      opacity: .6;
      cursor: not-allowed;
    }
  }

  &__google-icon {
    flex-shrink: 0;
  }

  &__footer {
    margin-top: @sp-5;
    padding-top: @sp-4;
    border-top: 1px solid @border;
    text-align: center;
    font-size: @fs-sm;
    color: @ink-3;

    a {
      margin-left: 6px;
      color: @accent;
      font-weight: 500;
      text-decoration: none;
      transition: color @dur-fast ease;

      &:hover {
        color: @accent-hover;
        text-decoration: underline;
      }
    }
  }
}
</style>