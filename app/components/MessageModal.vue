<!-- app/components/MessageModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

/** 与后端 GET/POST /api/pets/:slug/messages 返回的 MessagePublic 对齐 */
export interface MessagePublic {
  id: number
  content: string
  createdAt: string
  author: {
    id: number | null
    nickname: string
    avatarUrl: string | null
    isOwner: boolean
  }
}

interface Props {
  modelValue: boolean
  /** 宠物 slug，用于调接口 */
  slug: string
  /** 宠物名字，用于副标题提示 */
  petName?: string
}

const props = withDefaults(defineProps<Props>(), {
  petName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: MessagePublic): void
}>()

// ============================================================
// v-model 代理
// ============================================================

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ============================================================
// 状态
// ============================================================

const MAX_LEN = 300

const content = ref('')
const loading = ref(false)
const error = ref('')

const canSubmit = computed(
  () => content.value.trim().length > 0 && !loading.value,
)

const { $api } = useNuxtApp()

// ============================================================
// 弹窗样式：最大 500px，居中
// ============================================================

const popupStyle = {
  maxHeight: '92vh',
  width: 'min(500px, 100%)',
  left: '50%',
  right: 'auto',
  translate: '-50% 0',
} as const

// ============================================================
// 操作
// ============================================================

function reset() {
  content.value = ''
  error.value = ''
  loading.value = false
}

function handleCancel() {
  if (loading.value) return
  visible.value = false
}

async function handleSubmit() {
  if (!canSubmit.value) return
  if (!props.slug) {
    error.value = t('msg_missing_slug')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const message = await $api<MessagePublic>(
      `/api/pets/${props.slug}/messages`,
      {
        method: 'POST',
        body: {
          content: content.value.trim(),
        },
      },
    )

    showToast({ type: 'success', message: t('message_submit_success') })
    emit('success', message)
    visible.value = false
  } catch (err: any) {
    error.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('message_submit_failed')
  } finally {
    loading.value = false
  }
}

// 关闭时重置
watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset()
  },
)
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="popupStyle"
    :close-on-click-overlay="!loading"
    teleport="body"
  >
    <div class="message-modal">
      <header class="message-modal__header">
        <h2 class="message-modal__title">{{ t('message_modal_title') }}</h2>
        <p class="message-modal__subtitle">
          {{ petName ? t('message_modal_subtitle_with_pet', { petName }) : t('message_modal_subtitle') }}
        </p>
      </header>

      <div class="message-modal__body">
        <van-field
          v-model="content"
          type="textarea"
          :maxlength="MAX_LEN"
          show-word-limit
          rows="6"
          autosize
          :placeholder="t('message_placeholder')"
          class="message-modal__field"
          :disabled="loading"
        />
      </div>

      <!-- 错误提示 -->
      <p v-if="error" class="message-modal__error">{{ error }}</p>

      <div class="message-modal__actions">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ t('btn_cancel') }}
        </button>
        <button
          type="button"
          class="btn btn--primary btn--lg"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ loading ? t('message_btn_sending') : t('btn_confirm') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 弹窗主体
// ============================================================
.message-modal {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
  padding: @sp-5 @sp-5 @sp-4;

  @media (max-width: @bp-sm) {
    padding: @sp-4 @sp-4 @sp-3;
  }

  &__header {
    text-align: center;
  }

  &__title {
    margin: 0 0 @sp-1;
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__subtitle {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
  }

  &__body {
    // 容器，实际样式在 :deep 里改 van-field
  }

  // 让 van-field 的外观和 common.less 的 .input / .textarea 一致
  &__field {
    :deep(.van-cell) {
      padding: 10px 12px;
      border: 1px solid @border-strong;
      border-radius: @radius;
      background: @surface;
      font-size: @fs-base;
      line-height: @lh-base;
      box-shadow: none;
      transition: border-color @dur-fast ease, box-shadow @dur-fast ease;

      // 去掉 van-cell 默认的底部分割线
      &::after {
        display: none;
      }

      &:focus-within {
        border-color: @accent;
        box-shadow: 0 0 0 3px @accent-soft;
      }
    }

    :deep(.van-field__control) {
      color: @ink-1;
      line-height: @lh-base;

      &::placeholder {
        color: @ink-3;
      }
    }

    :deep(.van-field__word-limit) {
      margin-top: @sp-2;
      font-size: @fs-xs;
      color: @ink-3;
    }
  }

  &__error {
    margin: 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
  }

  &__actions {
    display: flex;
    gap: @sp-3;
    padding-top: @sp-3;
    border-top: 1px solid @border;

    .btn {
      flex: 1;
    }
  }
}
</style>