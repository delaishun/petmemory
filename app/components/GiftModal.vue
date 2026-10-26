<!-- app/components/GiftModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================
export interface GiftPublic {
  id: number
  code: string
  name: string
  imageUrl: string
  price: number
  moodValue?: number
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
  slug: string
  petName?: string
}

const props = withDefaults(defineProps<Props>(), {
  petName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', summary: PetGiftSummary[]): void
  // 新增：点击去购买
  (e: 'go-buy'): void 
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
const { $api } = useNuxtApp()
const me = useState<AuthUser | null>('auth:user', () => null)

const gifts = ref<GiftPublic[]>([])
const inventory = ref<Record<string, number>>({}) // 用户礼物库存 { [code]: quantity }
const selectedCode = ref<string>('') // 当前选中的礼物
const loading = ref(false)
const submitting = ref(false)
const error = ref('')

// ============================================================
// 弹窗样式
// ============================================================
const popupStyle = {
  maxHeight: '92vh',
  width: 'min(500px, 100%)',
  left: '50%',
  right: 'auto',
  translate: '-50% 0',
} as const

// ============================================================
// 数据加载
// ============================================================
async function loadData() {
  loading.value = true
  error.value = ''
  
  try {
    // 1. 加载礼物字典
    const [giftList, userInv] = await Promise.all([
      $api<GiftPublic[]>('/api/gifts'),
      // 假设后端提供了一个拉取仓库的接口 (需要去 routes/api/users 补充)
      $api<{ giftId: number; code: string; quantity: number }[]>('/api/users/me/inventory').catch(() => [])
    ])
    
    gifts.value = giftList
    
    // 构建映射：code -> quantity
    // 注意：后端可能返回 giftId，我们需要把它映射成 code，或者后端直接返回 code
    inventory.value = {}
    userInv.forEach(item => {
      // 兼容后端可能返回 code 或 giftId
      const code = (item as any).code || giftList.find(g => g.id === item.giftId)?.code
      if (code) inventory.value[code] = item.quantity
    })

  } catch (err: any) {
    error.value = err?.data?.error || err?.message || t('gift_load_failed')
  } finally {
    loading.value = false
  }
}

// ============================================================
// 交互逻辑
// ============================================================
function handleSelect(gift: GiftPublic) {
  const stock = inventory.value[gift.code] || 0
  
  if (stock <= 0) {
    // 没库存，提示并触发购买事件
    showToast({ message: t('gift_no_stock') || '您的仓库中暂无该礼物，请先购买' })
    visible.value = false
    emit('go-buy')
    return
  }

  // 有库存，选中（取消再点击则取消选中）
  if (selectedCode.value === gift.code) {
    selectedCode.value = ''
  } else {
    selectedCode.value = gift.code
  }
}

// ============================================================
// 提交
// ============================================================
async function handleSubmit() {
  if (!selectedCode.value || submitting.value) return
  
  submitting.value = true
  error.value = ''

  try {
    // 因为每次只送 1 个，所以传 giftCode 即可，不需要传数量
    const summary = await $api<PetGiftSummary[]>(
      `/api/pets/${props.slug}/gifts`,
      {
        method: 'POST',
        body: { items: [{ giftCode: selectedCode.value }] },
      },
    )

    showToast({ type: 'success', message: t('gift_send_success') })
    emit('success', summary)
    visible.value = false
  } catch (err: any) {
    error.value = err?.data?.error || err?.message || t('gift_send_failed')
  } finally {
    submitting.value = false
  }
}

// ============================================================
// 副作用
// ============================================================
watch(visible, async (open) => {
  if (!open) {
    selectedCode.value = ''
    return
  }
  await loadData()
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
      <div v-if="loading" class="gift-modal__status">{{ t('gift_loading') }}</div>

      <!-- 加载失败 / 无礼物 -->
      <div v-else-if="gifts.length === 0" class="gift-modal__status">
        {{ error || t('gift_none_available') }}
      </div>

      <!-- 礼物列表 -->
      <ul v-else class="gift-list">
        <li
          v-for="gift in gifts"
          :key="gift.code"
          class="gift-row"
          :class="{ 
            'has-stock': (inventory[gift.code] || 0) > 0,
            'is-selected': selectedCode === gift.code,
            'no-stock': (inventory[gift.code] || 0) === 0
          }"
          @click="handleSelect(gift)"
        >
          <!-- 礼物图片 -->
          <img
            class="gift-row__img"
            :src="gift.imageUrl"
            :alt="gift.name"
            loading="lazy"
          />
          
          <!-- 礼物信息 -->
          <div class="gift-row__info">
            <span class="gift-row__name">{{ gift.name }}</span>
            <!-- 显示库存数量与心情值 -->
            <span class="gift-row__meta">
              {{ t('gift_stock_count', { n: inventory[gift.code] || 0 }) }}
              <template v-if="gift.moodValue"> · +{{ gift.moodValue }} 心情</template>
            </span>
          </div>

          <!-- 选中图标 -->
          <div class="gift-row__check" v-if="selectedCode === gift.code">
            <van-icon name="checked" color="#5D8A66" size="20" />
          </div>
        </li>
      </ul>

      <!-- 错误提示 -->
      <p v-if="error && gifts.length > 0" class="gift-modal__error">
        {{ error }}
      </p>

      <!-- 操作按钮 -->
      <div class="gift-modal__actions">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="submitting"
          @click="visible = false"
        >
          {{ t('btn_cancel') }}
        </button>
        <button
          type="button"
          class="btn btn--primary btn--lg"
          :disabled="!selectedCode || submitting"
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

.gift-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: @sp-2;
  overflow-y: auto;
  max-height: 52vh;
}

.gift-row {
  display: flex;
  align-items: center;
  gap: @sp-3;
  padding: @sp-2 @sp-3;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius;
  transition: all @dur-fast ease;
  cursor: pointer;

  // 有库存：浅绿色背景
  &.has-stock {
    background: #f0f9f4; // 极浅的绿色
    border-color: #c8e6c9;
  }

  // 选中的状态
  &.is-selected {
    border-color: #5D8A66;
    box-shadow: 0 0 0 2px rgba(93, 138, 102, 0.2);
    background: #e8f5e9; // 稍深一点的浅绿
  }

  // 无库存：稍微置灰
  &.no-stock {
    opacity: 0.7;
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: @fs-base;
    font-weight: 500;
    color: @ink-1;
  }

  &__meta {
    font-size: @fs-xs;
    color: @ink-3;
  }

  &__check {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: @sp-2;
  }
}
</style>