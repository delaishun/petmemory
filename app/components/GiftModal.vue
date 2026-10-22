<!-- app/components/GiftModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型（导出给父组件用）
// ============================================================

export interface GiftPublic {
  id: number
  code: string
  name: string
  imageUrl: string
  price: number
}

export interface PetGiftSummary {
  giftId: number
  code: string
  name: string
  imageUrl: string
  price: number
  count: number
}

// ============================================================
// Props / Emits
// ============================================================

interface Props {
  modelValue: boolean
  /** 宠物 slug，用于 POST /api/pets/:slug/gifts */
  slug: string
  /** 宠物名字，用于副标题 */
  petName?: string
}

const props = withDefaults(defineProps<Props>(), {
  petName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', summary: PetGiftSummary[]): void
}>()

// ============================================================
// v-model 代理
// ============================================================

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ============================================================
// 常量
// ============================================================

/** 单件礼物一次最多送多少 */
const MAX_PER_GIFT = 20

// ============================================================
// 状态
// ============================================================

const { $api } = useNuxtApp()

const gifts = ref<GiftPublic[]>([])
const quantities = ref<Record<string, number>>({})
const loadingGifts = ref(false)
const submitting = ref(false)
const error = ref('')

// ============================================================
// 计算属性
// ============================================================

const totalCount = computed(() =>
  Object.values(quantities.value).reduce((s, n) => s + n, 0),
)

const canSubmit = computed(
  () => totalCount.value > 0 && !submitting.value && !loadingGifts.value,
)

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
// 加载礼物字典
// ============================================================

async function loadGifts() {
  loadingGifts.value = true
  error.value = ''
  try {
    gifts.value = await $api<GiftPublic[]>('/api/gifts')
  } catch (err: any) {
    error.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('gift_load_failed')
  } finally {
    loadingGifts.value = false
  }
}

// ============================================================
// 数量加减
// ============================================================

function inc(code: string) {
  const cur = quantities.value[code] ?? 0
  if (cur >= MAX_PER_GIFT) return
  quantities.value = { ...quantities.value, [code]: cur + 1 }
}

function dec(code: string) {
  const cur = quantities.value[code] ?? 0
  if (cur <= 0) return
  quantities.value = { ...quantities.value, [code]: cur - 1 }
}

// ============================================================
// 重置
// ============================================================

function reset() {
  quantities.value = {}
  error.value = ''
}

// ============================================================
// 提交
// ============================================================

async function handleSubmit() {
  if (!canSubmit.value) return
  if (!props.slug) {
    error.value = t('gift_missing_slug')
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const items = Object.entries(quantities.value)
      .filter(([, q]) => q > 0)
      .map(([code, q]) => ({ giftCode: code, quantity: q }))

    const summary = await $api<PetGiftSummary[]>(
      `/api/pets/${props.slug}/gifts`,
      {
        method: 'POST',
        body: { items },
      },
    )

    showToast({ type: 'success', message: t('gift_send_success') })
    emit('success', summary)
    visible.value = false
  } catch (err: any) {
    error.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('gift_send_failed')
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  if (submitting.value) return
  visible.value = false
}

// ============================================================
// 打开时加载 / 重置
// ============================================================

watch(visible, async (open) => {
  if (!open) return
  reset()
  if (gifts.value.length === 0) {
    await loadGifts()
  }
})
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="popupStyle"
    :close-on-click-overlay="!submitting"
    teleport="body"
  >
    <div class="gift-modal">
      <header class="gift-modal__header">
        <h2 class="gift-modal__title">{{ t('gift_modal_title') }}</h2>
        <p class="gift-modal__subtitle">
          {{ petName ? t('gift_modal_subtitle_with_pet', { petName }) : t('gift_modal_subtitle') }}
        </p>
      </header>

      <!-- 加载中 -->
      <div v-if="loadingGifts" class="gift-modal__status">{{ t('gift_loading') }}</div>

      <!-- 加载失败 / 无礼物 -->
      <div
        v-else-if="gifts.length === 0"
        class="gift-modal__status"
      >
        {{ error || t('gift_none_available') }}
      </div>

      <!-- 礼物列表 -->
      <ul v-else class="gift-list">
        <li
          v-for="gift in gifts"
          :key="gift.code"
          class="gift-row"
          :class="{ 'is-selected': (quantities[gift.code] ?? 0) > 0 }"
        >
          <img
            class="gift-row__img"
            :src="gift.imageUrl"
            :alt="gift.name"
            loading="lazy"
          />
          <div class="gift-row__info">
            <span class="gift-row__name">{{ gift.name }}</span>
          </div>
          <div class="gift-row__stepper">
            <button
              type="button"
              class="stepper-btn"
              :disabled="!quantities[gift.code] || submitting"
              :aria-label="t('aria_decrease')"
              @click="dec(gift.code)"
            >
              −
            </button>
            <span class="stepper-value">
              {{ quantities[gift.code] ?? 0 }}
            </span>
            <button
              type="button"
              class="stepper-btn"
              :disabled="(quantities[gift.code] ?? 0) >= MAX_PER_GIFT || submitting"
              :aria-label="t('aria_increase')"
              @click="inc(gift.code)"
            >
              +
            </button>
          </div>
        </li>
      </ul>

      <!-- 全局错误（礼物字典加载失败之外的提交错误） -->
      <p
        v-if="error && gifts.length > 0"
        class="gift-modal__error"
      >
        {{ error }}
      </p>

      <!-- 汇总 -->
      <div v-if="totalCount > 0" class="gift-modal__summary">
        {{ t('gift_selected_count', { n: totalCount }) }}
      </div>

      <!-- 操作 -->
      <div class="gift-modal__actions">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="submitting"
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
          {{ submitting ? t('gift_btn_sending') : t('gift_btn_send') }}
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
.gift-modal {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  padding: @sp-5 @sp-5 @sp-4;

  @media (max-width: @bp-sm) {
    padding: @sp-4 @sp-4 @sp-3;
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-4;
    flex-shrink: 0;
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

  &__status {
    padding: @sp-7 @sp-4;
    text-align: center;
    font-size: @fs-sm;
    color: @ink-3;
  }

  &__error {
    margin: @sp-3 0 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
  }

  &__summary {
    margin-top: @sp-3;
    padding: @sp-2 @sp-3;
    text-align: center;
    font-size: @fs-sm;
    color: @ink-2;
    background: @accent-soft;
    border-radius: @radius-sm;

    strong {
      color: @accent;
      font-weight: 700;
      margin: 0 2px;
    }
  }

  &__actions {
    display: flex;
    gap: @sp-3;
    margin-top: @sp-4;
    padding-top: @sp-3;
    border-top: 1px solid @border;
    flex-shrink: 0;

    .btn {
      flex: 1;
    }
  }
}

// ============================================================
// 礼物列表
// ============================================================
.gift-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: @sp-2;
  overflow-y: auto;
  // 给下方汇总 / 按钮留出空间
  max-height: 52vh;
}

.gift-row {
  display: flex;
  align-items: center;
  gap: @sp-3;
  padding: @sp-2 @sp-3;
  background: @surface-2;
  border: 1px solid @border;
  border-radius: @radius;
  transition: border-color @dur-fast ease, background @dur-fast ease;

  &.is-selected {
    border-color: @accent;
    background: @accent-soft;
  }

  &__img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: @fs-base;
    font-weight: 500;
    color: @ink-1;
  }

  &__stepper {
    display: inline-flex;
    align-items: center;
    gap: @sp-2;
    flex-shrink: 0;
  }
}

// ============================================================
// 数量步进器
// ============================================================
.stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-family: @font-sans;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  color: @ink-1;
  background: @surface;
  border: 1px solid @border-strong;
  border-radius: 50%;
  cursor: pointer;
  transition: all @dur-fast ease;
  user-select: none;

  &:hover:not(:disabled) {
    border-color: @accent;
    color: @accent;
    background: @accent-soft;
  }

  &:active:not(:disabled) {
    transform: scale(.92);
  }

  &:disabled {
    color: @ink-3;
    background: @surface-2;
    border-color: @border;
    cursor: not-allowed;
  }
}

.stepper-value {
  min-width: 24px;
  font-size: @fs-base;
  font-weight: 600;
  font-family: @font-mono;
  color: @ink-1;
  text-align: center;
}
</style>