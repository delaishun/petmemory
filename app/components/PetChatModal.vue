<!-- app/components/PetChatModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth' // 👈 引入用户类型

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatHistoryResponse {
  messages: ChatMessage[]
  remaining: number
  limit: number
}

interface SendChatResponse {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  remaining: number
}

interface Props {
  modelValue: boolean
  /** 宠物 slug，用于调接口 */
  slug: string
  /** 宠物名字 */
  petName?: string
  /** 宠物头像 */
  petAvatarUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  petName: '',
  petAvatarUrl: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// ============================================================
// v-model 代理
// ============================================================

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { $api } = useNuxtApp()

// ============================================================
// 全局状态 & 弹窗控制
// ============================================================

// 获取全局用户状态，用于判断是否为 VIP
const user = useState<AuthUser | null>('auth:user', () => null)
// 控制 VIP 升级弹窗
const upgradeVipModalVisible = ref(false)

// ============================================================
// 状态
// ============================================================

const messages = ref<ChatMessage[]>([])
const inputContent = ref('')

const loadingHistory = ref(false)
const sending = ref(false)
const errorMsg = ref('')

// 这里的初始值不重要，打开弹窗后会立即从后端获取覆盖
const remaining = ref(0)
const limit = ref(3)

// DOM 引用，用于自动滚动
const scrollRef = ref<HTMLDivElement | null>(null)

// ============================================================
// 计算属性
// ============================================================

const canSend = computed(() => {
  if (sending.value) return false
  if (loadingHistory.value) return false
  if (remaining.value <= 0) return false
  return inputContent.value.trim().length > 0
})

const limitReached = computed(() => remaining.value <= 0)

// 👇 新增：判断是否是非 VIP 且额度已用完
const isFreeLimitReached = computed(() => {
  return limitReached.value && !user.value?.isVip
})

const remainingText = computed(() => {
  if (limitReached.value) return t('pet_chat_limit_reached')
  return t('pet_chat_remaining', { n: remaining.value })
})

// ============================================================
// 弹窗样式
// ============================================================

const popupStyle = {
  maxHeight: '88vh',
  width: 'min(560px, 100%)',
  left: '50%',
  right: 'auto',
  translate: '-50% 0',
} as const

// ============================================================
// 兜底头像
// ============================================================

const defaultPetAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
       <rect width="120" height="120" fill="#F5EEE4"/>
       <circle cx="60" cy="52" r="22" fill="#DCD0BF"/>
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/>
     </svg>`
  )

// ============================================================
// 滚动到底部
// ============================================================

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

// ============================================================
// 拉历史
// ============================================================

async function loadHistory() {
  if (!props.slug) return

  loadingHistory.value = true
  errorMsg.value = ''

  try {
    const res = await $api<ChatHistoryResponse>(
      `/api/pets/${props.slug}/chat`,
    )
    messages.value = res.messages
    remaining.value = res.remaining
    limit.value = res.limit
    scrollToBottom()
  } catch (err: any) {
    errorMsg.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('pet_chat_load_failed')
  } finally {
    loadingHistory.value = false
  }
}

// ============================================================
// 发送消息
// ============================================================

async function handleSend() {
  if (!canSend.value) return

  const content = inputContent.value.trim()
  if (!content) return

  // 乐观更新：先把用户消息塞进去
  const tempUserMsg: ChatMessage = {
    id: -Date.now(),          // 负数 id 表示"临时"
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
  messages.value = [...messages.value, tempUserMsg]
  inputContent.value = ''
  sending.value = true
  errorMsg.value = ''
  scrollToBottom()

  try {
    // 获取本地时间并带在 body 里
    const now = new Date()
    const clientTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const clientHour = now.getHours()

    const res = await $api<SendChatResponse>(
      `/api/pets/${props.slug}/chat`,
      {
        method: 'POST',
        body: { 
          content,
          clientTime,
          clientHour
        },
      },
    )

    // 用服务端返回的真实消息替换临时消息
    messages.value = [
      ...messages.value.filter((m) => m.id !== tempUserMsg.id),
      res.userMessage,
      res.assistantMessage,
    ]
    remaining.value = res.remaining
    scrollToBottom()
  } catch (err: any) {
    // 失败时移除临时消息，把内容还给输入框
    messages.value = messages.value.filter((m) => m.id !== tempUserMsg.id)
    inputContent.value = content
    errorMsg.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('pet_chat_send_failed')
      
    // 👇 如果是 429（额度用完），强制刷新一下 remaining 状态，让 UI 显示升级提示
    if (err?.status === 429) {
      remaining.value = 0
    }
    
    showToast({ type: 'fail', message: errorMsg.value })
  } finally {
    sending.value = false
  }
}

// ============================================================
// 键盘：Enter 发送（Shift+Enter 换行）
// ============================================================

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// ============================================================
// 打开时加载 / 关闭时清理
// ============================================================

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      loadHistory()
    } else {
      // 关闭时清空，下次打开重新拉
      messages.value = []
      inputContent.value = ''
      errorMsg.value = ''
      // 👇 不再写死 10，重置为默认占位即可，重新打开时会被接口覆盖
      remaining.value = 0
      limit.value = 3
    }
  },
)

// ============================================================
// 时间格式化
// ============================================================

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')

  if (sameDay) return `${hh}:${mm}`

  const M = String(d.getMonth() + 1).padStart(2, '0')
  const DD = String(d.getDate()).padStart(2, '0')
  return `${M}-${DD} ${hh}:${mm}`
}

// ============================================================
// 标题
// ============================================================

const title = computed(() =>
  props.petName
    ? t('pet_chat_modal_title', { petName: props.petName })
    : t('pet_chat_modal_title_no_name'),
)
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="popupStyle"
    :close-on-click-overlay="!sending"
    teleport="body"
  >
    <div class="pet-chat">
      <!-- 头部 -->
      <header class="pet-chat__header">
        <div class="pet-chat__title">{{ title }}</div>
        <div class="pet-chat__remaining" :class="{ 'is-empty': limitReached }">
          {{ remainingText }}
        </div>
      </header>

      <!-- 消息区 -->
      <div ref="scrollRef" class="pet-chat__body">
        <!-- 加载中 -->
        <div v-if="loadingHistory" class="pet-chat__loading">
          <van-loading type="spinner" size="20" />
          <span>{{ t('pet_chat_loading') }}</span>
        </div>

        <!-- 首次对话的空状态 -->
        <div
          v-else-if="messages.length === 0 && !errorMsg"
          class="pet-chat__empty"
        >
          <img
            class="pet-chat__empty-avatar"
            :src="petAvatarUrl || defaultPetAvatar"
            :alt="petName"
          />
          <p class="pet-chat__empty-text">
            {{ petName ? t('pet_chat_empty_with_name', { petName }) : t('pet_chat_empty') }}
          </p>
        </div>

        <!-- 消息列表 -->
        <div v-else class="pet-chat__list">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="chat-msg"
            :class="`chat-msg--${msg.role}`"
          >
            <!-- 宠物头像 -->
            <img
              v-if="msg.role === 'assistant'"
              class="chat-msg__avatar"
              :src="petAvatarUrl || defaultPetAvatar"
              :alt="petName"
            />

            <div class="chat-msg__bubble">
              <p class="chat-msg__text">{{ msg.content }}</p>
              <time class="chat-msg__time">{{ formatTime(msg.createdAt) }}</time>
            </div>
          </div>

          <!-- 宠物正在打字 -->
          <div
            v-if="sending"
            class="chat-msg chat-msg--assistant"
          >
            <img
              class="chat-msg__avatar"
              :src="petAvatarUrl || defaultPetAvatar"
              :alt="petName"
            />
            <div class="chat-msg__bubble chat-msg__bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <p v-if="errorMsg && !sending" class="pet-chat__error">
          {{ errorMsg }}
        </p>
      </div>

      <!-- 👇 新增：非 VIP 额度用完时的升级引导 Banner -->
      <div v-if="isFreeLimitReached" class="pet-chat__upgrade-banner">
        <div class="upgrade-banner__content">
          <van-icon name="gem-o" class="upgrade-banner__icon" />
          <span>{{ t('pet_chat_free_limit_reached') }}</span>
        </div>
        <button 
          class="btn btn--primary btn--sm upgrade-banner__btn"
          @click="upgradeVipModalVisible = true"
        >
          {{ t('user_upgrade_vip') }}
        </button>
      </div>

      <!-- 输入区 -->
      <div class="pet-chat__footer">
        <textarea
          v-model="inputContent"
          class="pet-chat__input"
          :placeholder="
            limitReached
              ? t('pet_chat_placeholder_limit')
              : t('pet_chat_placeholder')
          "
          :disabled="sending || loadingHistory || limitReached"
          rows="1"
          maxlength="300"
          @keydown="handleKeydown"
        />
        <button
          type="button"
          class="btn btn--primary pet-chat__send"
          :disabled="!canSend"
          @click="handleSend"
        >
          <van-icon name="guide-o" size="16" />
        </button>
      </div>
    </div>

    <!-- 👇 挂载 VIP 购买弹窗 -->
    <UpgradeVipModal 
      v-if="upgradeVipModalVisible" 
      v-model="upgradeVipModalVisible" 
    />
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

/* 样式与原版保持一致，增加了升级 Banner 的样式 */

.pet-chat {
  display: flex;
  flex-direction: column;
  height: 88vh;
  max-height: 720px;
  background: @surface;

  @media (max-width: @bp-sm) {
    height: 92vh;
    max-height: none;
  }

  &__header {
    flex-shrink: 0;
    padding: @sp-4 @sp-5 @sp-3;
    text-align: center;
    border-bottom: 1px solid @border;
    background: @surface;
  }

  &__title {
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    line-height: 1.3;
  }

  &__remaining {
    margin-top: @sp-1;
    font-size: @fs-xs;
    color: @ink-3;
    font-family: @font-mono;

    &.is-empty {
      color: @danger;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: @sp-4 @sp-5;
    background: @paper;
    scroll-behavior: smooth;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-2;
    padding: @sp-7 0;
    color: @ink-3;
    font-size: @fs-sm;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-4;
    padding: @sp-8 @sp-4;
  }

  &__empty-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    box-shadow:
      0 0 0 4px @surface,
      0 0 0 5px @accent-soft,
      0 8px 20px rgba(93, 71, 55, .12);
  }

  &__empty-text {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: @sp-3;
  }

  &__error {
    margin: @sp-3 0 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-xs;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
    text-align: center;
  }

  // 👇 升级引导 Banner 样式
  &__upgrade-banner {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: @sp-3 @sp-4;
    background: @gold-soft;
    border-top: 1px dashed @gold;
    gap: @sp-3;

    .upgrade-banner__content {
      display: flex;
      align-items: center;
      gap: @sp-2;
      font-size: @fs-xs;
      color: darken(@gold, 20%);
      font-weight: 500;
      line-height: 1.4;
    }

    .upgrade-banner__icon {
      font-size: 18px;
      color: darken(@gold, 10%);
      flex-shrink: 0;
    }

    .upgrade-banner__btn {
      flex-shrink: 0;
      background: linear-gradient(135deg, #f1c40f 0%, #e5b769 100%);
      border: none;
      color: @ink-1;
      font-weight: 600;
    }
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    align-items: flex-end;
    gap: @sp-2;
    padding: @sp-3 @sp-4;
    border-top: 1px solid @border;
    background: @surface;
  }

  &__input {
    flex: 1;
    min-height: 40px;
    max-height: 100px;
    padding: 10px 12px;
    font-family: @font-sans;
    font-size: @fs-base;
    line-height: 1.4;
    color: @ink-1;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: @radius;
    resize: none;
    outline: none;
    transition: border-color @dur-fast ease, box-shadow @dur-fast ease;

    &::placeholder {
      color: @ink-3;
    }

    &:focus {
      border-color: @accent;
      background: @surface;
      box-shadow: 0 0 0 3px @accent-soft;
    }

    &:disabled {
      background: @surface-2;
      color: @ink-3;
      cursor: not-allowed;
    }
  }

  &__send {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;

    :deep(.van-icon) {
      line-height: 1;
    }
  }
}

.chat-msg {
  display: flex;
  align-items: flex-end;
  gap: @sp-2;
  max-width: 100%;

  &--assistant {
    flex-direction: row;
    justify-content: flex-start;

    .chat-msg__bubble {
      background: @blue-soft;
      color: @ink-1;
      border-radius: @radius-lg @radius-lg @radius-lg @radius-sm;
    }
  }

  &--user {
    flex-direction: row-reverse;
    justify-content: flex-start;

    .chat-msg__bubble {
      background: @accent-soft;
      color: @ink-1;
      border-radius: @radius-lg @radius-lg @radius-sm @radius-lg;
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    border: 1px solid @border;
  }

  &__bubble {
    position: relative;
    max-width: 78%;
    padding: 8px 12px 4px;
    box-shadow: @shadow-1;
    word-break: break-word;
  }

  &__text {
    margin: 0;
    font-size: @fs-base;
    line-height: @lh-base;
    white-space: pre-wrap;
  }

  &__time {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    color: @ink-3;
    text-align: right;
    font-family: @font-mono;
    user-select: none;
  }

  &__bubble--typing {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 12px 14px;
    background: @blue-soft !important;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: @ink-3;
      animation: chat-typing 1.2s infinite;

      &:nth-child(2) {
        animation-delay: 0.15s;
      }

      &:nth-child(3) {
        animation-delay: 0.3s;
      }
    }
  }
}

@keyframes chat-typing {
  0%,
  60%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>