<!-- app/components/BuyGiftModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth'
// 👇 1. 直接从 npm 包导入 DodoPayments 对象
import { DodoPayments } from 'dodopayments-checkout'

const { t } = useI18n()
const { $api } = useNuxtApp()
const me = useState<AuthUser | null>('auth:user', () => null)

const config = useRuntimeConfig()
const paddleClientToken = String(config.public.paddleClientToken || '')
const paymentProvider = String(config.public.paymentProvider || 'paddle')

// ============================================================
// 类型
// ============================================================
interface GiftPublic {
  id: number
  code: string
  name: string
  imageUrl: string
  price: number
  moodValue: number
  expireSeconds: number
}

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
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
const activeTab = ref<'purchase' | 'exchange'>('purchase')
const gifts = ref<GiftPublic[]>([])
const loading = ref(false)
const submitting = ref(false)

const quantities = ref<Record<string, number>>({})
const exchangeSelections = ref<Record<string, number>>({})

const MIN_PURCHASE_PRICE = 500
const EXCHANGE_COST = 1000
const ALLOWED_EXCHANGE_CODES = ['bone', 'carrot', 'corn', 'biscuit']

// 👇 2. 移除 window.DodoPaymentsCheckout 声明，仅保留 Paddle 的全局声明
declare global {
  interface Window {
    Paddle: any
    // DodoPaymentsCheckout 不再需要，已改为模块导入
  }
}

// ============================================================
// 计算属性
// ============================================================
const currentPoint = computed(() => me.value?.point ?? 0)

const totalDbPrice = computed(() => {
  if (activeTab.value !== 'purchase') return 0
  return Object.entries(quantities.value).reduce((sum, [code, qty]) => {
    const gift = gifts.value.find((g) => g.code === code)
    return sum + (gift ? gift.price * qty : 0)
  }, 0)
})

const totalDollarPrice = computed(() => (totalDbPrice.value / 100).toFixed(2))

const totalExchangePoints = computed(() => {
  if (activeTab.value !== 'exchange') return 0
  const count = Object.values(exchangeSelections.value).reduce((s, v) => s + v, 0)
  return count * EXCHANGE_COST
})

const isPurchaseValid = computed(() => totalDbPrice.value >= MIN_PURCHASE_PRICE)
const isExchangeValid = computed(() => currentPoint.value >= totalExchangePoints.value && totalExchangePoints.value > 0)

// ============================================================
// 工具方法：格式化过期时间
// ============================================================
function formatExpireTime(seconds: number) {
  if (!seconds) return ''
  const days = seconds / (24 * 60 * 60)
  
  if (days >= 36500) return '100年'
  if (days >= 90) return '3个月'
  if (days >= 30) return '1个月'
  if (days >= 1) return `${Math.floor(days)}天`
  return '较短时间'
}

// ============================================================
// 数据加载与初始化
// ============================================================
watch(visible, async (open) => {
  if (open) {
    activeTab.value = 'purchase'
    await loadGifts()
    initDefaultSelection()
    if (paymentProvider === 'paddle') {
      initPaddle()
    }
  }
})

async function loadGifts() {
  loading.value = true
  try {
    gifts.value = await $api<GiftPublic[]>('/api/gifts')
  } catch (err) {
    showToast('加载礼物列表失败')
  } finally {
    loading.value = false
  }
}

function initDefaultSelection() {
  quantities.value = {}
  exchangeSelections.value = {}
  
  const presetQuantities: Record<string, number> = {
    flower: 3,
    ball: 2
  }

  let currentTotal = 0

  gifts.value.forEach(gift => {
    const presetQty = presetQuantities[gift.code]
    if (presetQty) {
      quantities.value[gift.code] = presetQty
      currentTotal += gift.price * presetQty
    }
  })

  if (currentTotal < MIN_PURCHASE_PRICE) {
    const sortedGifts = [...gifts.value].sort((a, b) => b.price - a.price)
    for (const gift of sortedGifts) {
      if (currentTotal >= MIN_PURCHASE_PRICE) break
      if (!quantities.value[gift.code]) {
        const needed = Math.ceil((MIN_PURCHASE_PRICE - currentTotal) / gift.price)
        quantities.value[gift.code] = needed
        currentTotal += gift.price * needed
      }
    }
  }
}

// ============================================================
// 交互逻辑
// ============================================================
function inc(code: string) {
  const cur = quantities.value[code] || 0
  quantities.value[code] = cur + 1
}

function dec(code: string) {
  const cur = quantities.value[code] || 0
  if (cur > 0) quantities.value[code] = cur - 1
}

function toggleExchange(code: string) {
  if (exchangeSelections.value[code]) {
    delete exchangeSelections.value[code]
  } else {
    exchangeSelections.value[code] = 1
  }
}

// ============================================================
// 通用 SDK 加载等待（仅用于 Paddle）
// ============================================================
function waitForSDK(sdkName: 'Paddle'): Promise<any> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 50

    const check = () => {
      if (window[sdkName]) {
        resolve(window[sdkName])
      } else if (attempts >= maxAttempts) {
        reject(new Error(`${sdkName} SDK load timeout`))
      } else {
        attempts++
        setTimeout(check, 100)
      }
    }
    check()
  })
}

// ============================================================
// Paddle 支付逻辑
// ============================================================
let paddleInitialized = false
async function initPaddle() {
  if (paddleInitialized || !paddleClientToken) return
  try {
    const paddle = await waitForSDK('Paddle')
    if (paddleClientToken.startsWith('test_')) {
      paddle.Environment.set('sandbox')
    }
    
    paddle.Initialize({
      token: paddleClientToken,
      eventCallback: (event: any) => {
        if (event.name === 'checkout.completed') {
          handleSuccess('支付成功！礼物已发放到仓库')
        }
      }
    })
    paddleInitialized = true
  } catch (err) {
    console.error('Paddle Init Failed:', err)
  }
}

async function handlePaddlePurchase() {
  const paddle = await waitForSDK('Paddle')
  
  const itemsToBuy = Object.entries(quantities.value)
    .filter(([_, qty]) => qty > 0)
    .map(([code, qty]) => {
      const gift = gifts.value.find(g => g.code === code)!
      return { giftId: gift.id, quantity: qty }
    })

  const res = await $api<{ paddleItems: any[]; items: any[] }>('/api/paddle/checkout', {
    method: 'POST',
    body: { items: itemsToBuy }
  })

  paddle.Checkout.open({
    items: res.paddleItems,
    customData: {
      userId: me.value?.id,
      items: res.items
    }
  })
}

// ============================================================
// 👇 3. 核心修改：Dodo Payments 支付逻辑
// ============================================================
async function handleDodoPurchase() {
  const itemsToBuy = Object.entries(quantities.value)
    .filter(([_, qty]) => qty > 0)
    .map(([code, qty]) => {
      const gift = gifts.value.find(g => g.code === code)!
      return { giftId: gift.id, quantity: qty, code }
    })

  const res = await $api<{ checkout_url: string }>('/api/dodo/create-checkout', {
    method: 'POST',
    body: {
      type: 'gift',
      payload: {
        totalAmount: totalDbPrice.value / 100,
        giftDetails: itemsToBuy
      }
    }
  })

  if (!res.checkout_url) throw new Error('Failed to get checkout URL')

  // 👈 直接使用导入的 DodoPayments 对象，不再依赖 window 和 waitForSDK
  // 保留一次 Initialize 作为兜底（如果 app.vue 中未初始化）
  DodoPayments.Initialize({
    mode: 'test',          // 上线时请改为 'live'
    displayType: 'overlay',
    onEvent: (event: any) => {
      if (event.event_type === 'checkout.closed') {
        submitting.value = false
      }
      if (event.event_type === 'checkout.error') {
        showToast(event.data?.message || '支付发生错误')
        submitting.value = false
      }
    }
  })

  // 👈 打开收银台
  await DodoPayments.Checkout.open({
    checkoutUrl: res.checkout_url,
  })
}

// ============================================================
// 统一成功处理与支付入口
// ============================================================
function handleSuccess(msg: string) {
  showToast({ type: 'success', message: msg })
  if (paymentProvider === 'paddle' && window.Paddle) {
    window.Paddle.Checkout.close()
  }
  visible.value = false
  submitting.value = false
  emit('success')
}

async function handlePurchase() {
  if (!isPurchaseValid.value) {
    showToast(`最低支付金额为 $5.00，当前仅 $${totalDollarPrice.value}`)
    return
  }
  
  submitting.value = true
  try {
    if (paymentProvider === 'dodo') {
      await handleDodoPurchase()
    } else {
      await handlePaddlePurchase()
    }
  } catch (err: any) {
    showToast(err?.data?.error || err.message || '发起支付失败，请重试')
    submitting.value = false
  } finally {
    if (paymentProvider === 'paddle') {
      submitting.value = false
    }
  }
}

async function handleExchange() {
  if (!isExchangeValid.value) return
  
  submitting.value = true
  try {
    const code = Object.keys(exchangeSelections.value)[0]
    
    await $api('/api/gifts/exchange', {
      method: 'POST',
      body: { giftCode: code }
    })

    showToast({ type: 'success', message: '兑换成功！' })
    if (me.value) {
      me.value.point = (me.value.point || 0) - EXCHANGE_COST
    }
    
    visible.value = false
    emit('success')
  } catch (err: any) {
    showToast(err?.data?.error || '兑换失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- 模板部分完全不变，保持原样 -->
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '90vh', width: 'min(500px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="!submitting"
  >
    <div class="buy-gift">
      <header class="buy-gift__header">
        <h2 class="buy-gift__title">{{ t('gift_buy_title') }}</h2>
        <div class="buy-gift__points" v-if="me">
          <van-icon name="gold-coin-o" />
          <span>{{ t('user_points') }}: {{ currentPoint }}</span>
        </div>
      </header>

      <div class="buy-gift__tabs">
        <div 
          class="buy-gift__tab" 
          :class="{ 'is-active': activeTab === 'purchase' }" 
          @click="activeTab = 'purchase'"
        >
          {{ t('gift_purchase_tab') }}
        </div>
        <div 
          class="buy-gift__tab" 
          :class="{ 'is-active': activeTab === 'exchange' }" 
          @click="activeTab = 'exchange'"
        >
          {{ t('gift_exchange_tab') }}
        </div>
      </div>

      <div class="buy-gift__list" v-if="!loading">
        <template v-if="activeTab === 'purchase'">
          <div v-for="gift in gifts" :key="gift.code" class="gift-row">
            <img :src="gift.imageUrl" :alt="gift.name" class="gift-row__img" />
            <div class="gift-row__info">
              <span class="gift-row__name">{{ gift.name }}</span>
              <div class="gift-row__meta">
                <span class="gift-row__price">${{ (gift.price / 100).toFixed(2) }}</span>
                <span class="gift-row__mood">+{{ gift.moodValue }} 心情</span>
                <span class="gift-row__expire" v-if="gift.expireSeconds">
                  有效期: {{ formatExpireTime(gift.expireSeconds) }}
                </span>
              </div>
            </div>
            <div class="stepper">
              <button type="button" class="stepper-btn" :disabled="(quantities[gift.code] || 0) <= 0 || submitting" @click="dec(gift.code)">−</button>
              <span class="stepper-value">{{ quantities[gift.code] || 0 }}</span>
              <button type="button" class="stepper-btn" :disabled="submitting" @click="inc(gift.code)">+</button>
            </div>
          </div>
        </template>

        <template v-else>
          <div 
            v-for="gift in gifts.filter(g => ALLOWED_EXCHANGE_CODES.includes(g.code))" 
            :key="gift.code" 
            class="gift-row gift-row--exchange"
            :class="{ 'is-selected': exchangeSelections[gift.code] }"
            @click="toggleExchange(gift.code)"
          >
            <img :src="gift.imageUrl" :alt="gift.name" class="gift-row__img" />
            <div class="gift-row__info">
              <span class="gift-row__name">{{ gift.name }}</span>
              <div class="gift-row__meta">
                <span class="gift-row__price">{{ EXCHANGE_COST }} 积分</span>
                <span class="gift-row__mood">+{{ gift.moodValue }} 心情</span>
                <span class="gift-row__expire" v-if="gift.expireSeconds">
                  有效期: {{ formatExpireTime(gift.expireSeconds) }}
                </span>
              </div>
            </div>
            <van-icon 
              :name="exchangeSelections[gift.code] ? 'checked' : 'circle'" 
              :color="exchangeSelections[gift.code] ? '#E8A87C' : '#ccc'"
              size="24"
            />
          </div>
        </template>
      </div>
      <div v-else class="buy-gift__loading">加载中...</div>

      <div class="buy-gift__footer">
        <template v-if="activeTab === 'purchase'">
          <div class="buy-gift__total">
            <span>{{ t('gift_total') }}</span>
            <strong class="price">${{ totalDollarPrice }}</strong>
            <div v-if="totalDbPrice < MIN_PURCHASE_PRICE" class="buy-gift__tip">
              {{ t('gift_min_purchase_tip') }} ($5.00)
            </div>
          </div>
          <button 
            class="btn btn--primary btn--lg buy-gift__btn" 
            :disabled="!isPurchaseValid || submitting"
            @click="handlePurchase"
          >
            {{ submitting ? t('gift_btn_sending') : t('gift_btn_pay') }}
          </button>
        </template>

        <template v-else>
          <div class="buy-gift__total">
            <span>{{ t('gift_exchange_total') }}</span>
            <strong class="price">{{ totalExchangePoints }}</strong>
            <div v-if="!isExchangeValid && totalExchangePoints > 0" class="buy-gift__tip">
              积分不足
            </div>
          </div>
          <button 
            class="btn btn--primary btn--lg buy-gift__btn" 
            :disabled="!isExchangeValid || submitting"
            @click="handleExchange"
          >
            {{ submitting ? t('gift_btn_sending') : t('gift_btn_exchange') }}
          </button>
        </template>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
/* 样式部分完全不变 */
@import "~/assets/css/common.less";

.buy-gift {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  padding: @sp-5 @sp-5 @sp-4;

  @media (max-width: @bp-sm) {
    padding: @sp-4 @sp-4 @sp-3;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: @sp-4;
  }

  &__title {
    margin: 0;
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__points {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: @fs-sm;
    font-weight: 600;
    color: @accent;
    background: @accent-soft;
    padding: 4px 10px;
    border-radius: @radius-pill;
  }

  &__tabs {
    display: flex;
    background: @surface-2;
    border-radius: @radius-lg;
    padding: 4px;
    margin-bottom: @sp-4;
  }

  &__tab {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    font-size: @fs-sm;
    font-weight: 500;
    color: @ink-2;
    border-radius: @radius;
    cursor: pointer;
    transition: all @dur-fast ease;

    &.is-active {
      background: @surface;
      color: @ink-1;
      font-weight: 600;
      box-shadow: @shadow-1;
    }
  }

  &__list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: @sp-2;
    padding-bottom: @sp-4;
    min-height: 200px;
  }

  &__loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: @ink-3;
    padding: @sp-8 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: @sp-4;
    border-top: 1px solid @border;
    margin-top: auto;
  }

  &__total {
    display: flex;
    flex-direction: column;
    .price {
      font-size: @fs-xl;
      font-family: @font-mono;
      color: @accent;
      font-weight: 700;
    }
  }

  &__tip {
    font-size: @fs-xs;
    color: @danger;
    margin-top: 2px;
  }

  &__btn {
    min-width: 120px;
  }
}

.gift-row {
  display: flex;
  align-items: center;
  gap: @sp-3;
  padding: @sp-2 @sp-3;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  transition: border-color @dur-fast ease, background @dur-fast ease;

  &__img {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }

  &__info {
    flex: 1;
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
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: @sp-2;
    font-size: @fs-xs;
  }

  &__price {
    color: @accent;
    font-weight: 600;
    font-family: @font-mono;
  }

  &__mood {
    color: @ink-3;
  }

  &__expire {
    color: @ink-3;
    background: @surface-2;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }

  &--exchange {
    cursor: pointer;
    &.is-selected {
      border-color: @accent;
      background: @accent-soft;
    }
  }
}

.stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 16px;
  color: @ink-1;
  background: @surface-2;
  border: 1px solid @border-strong;
  border-radius: 50%;
  cursor: pointer;
  transition: all @dur-fast ease;

  &:hover:not(:disabled) {
    border-color: @accent;
    color: @accent;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.stepper-value {
  width: 24px;
  text-align: center;
  font-family: @font-mono;
  font-weight: 600;
  font-size: @fs-sm;
}
</style>