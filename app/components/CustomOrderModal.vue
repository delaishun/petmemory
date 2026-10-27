<!-- app/components/CustomOrderModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import { processPhoto } from '~/utils/image-process'
import { uploadToOss, buildFilename } from '~/utils/upload'
import type { AuthUser } from '~/types/auth'

const { t } = useI18n()
const { $api } = useNuxtApp()
const me = useState<AuthUser | null>('auth:user', () => null)

const config = useRuntimeConfig()
const paddleClientToken = String(config.public.paddleClientToken || '')

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// 表单状态
const images = ref<string[]>([])
const requirements = ref('')
const shippingAddress = ref('')
const uploading = ref(false)
const submitting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Paddle SDK 声明与加载
declare global {
  interface Window {
    Paddle: any
  }
}

function waitForPaddle(): Promise<any> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      if (window.Paddle) resolve(window.Paddle)
      else if (attempts >= 50) reject(new Error('Paddle timeout'))
      else { attempts++; setTimeout(check, 100) }
    }
    check()
  })
}

let paddleInitialized = false
async function initPaddle() {
  if (paddleInitialized || !paddleClientToken) return
  try {
    const paddle = await waitForPaddle()
    if (paddleClientToken.startsWith('test_')) paddle.Environment.set('sandbox')
    
    paddle.Initialize({
      token: paddleClientToken,
      eventCallback: (event: any) => {
        if (event.name === 'checkout.completed') {
          if (window.Paddle) window.Paddle.Checkout.close()
          showToast({ type: 'success', message: t('custom_order_success') })
          visible.value = false
          emit('success')
        }
      }
    })
    paddleInitialized = true
  } catch (err) {
    console.error(err)
  }
}

watch(visible, (open) => {
  if (open) {
    initPaddle()
    images.value = []
    requirements.value = ''
    shippingAddress.value = ''
  }
})

// 图片上传逻辑（复用相册逻辑）
async function triggerFileInput() {
  if (uploading.value) return
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return

  uploading.value = true
  try {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      // 预处理：限制大小/等比缩放/WebP
      const processed = await processPhoto(file)
      const filename = buildFilename(processed.ext)
      // 上传到 OSS 的 pet_orders 目录
      const { url } = await uploadToOss(processed.blob, filename, { fdir: 'pet_orders' })
      images.value.push(url)
    }
  } catch (err: any) {
    showToast(err?.message || '图片上传失败')
  } finally {
    uploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

// 发起支付
async function handleOrder(planType: 'digital' | 'physical') {
  if (!images.value.length) {
    showToast('请至少上传一张参考照片')
    return
  }
  if (planType === 'physical' && !shippingAddress.value.trim()) {
    showToast(t('custom_order_err_address'))
    return
  }

  submitting.value = true
  try {
    const paddle = await waitForPaddle()
    
    // 获取后端参数
    const res = await $api<{ priceId: string; userId: number; customData: any }>('/api/paddle/checkout-order', {
      method: 'POST',
      body: {
        planType,
        images: images.value,
        requirements: requirements.value.trim(),
        shippingAddress: planType === 'physical' ? shippingAddress.value.trim() : '',
      }
    })

    paddle.Checkout.open({
      items: [{ priceId: res.priceId, quantity: 1 }],
      customData: res.customData
    })
  } catch (err: any) {
    showToast(err?.data?.error || '发起支付失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '92vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="!submitting"
  >
    <div class="custom-order">
      <header class="custom-order__header">
        <h2 class="custom-order__title">{{ t('custom_order_title') }}</h2>
        <p class="custom-order__subtitle">100% Hand-drawn</p>
      </header>

      <div class="custom-order__form">
        <!-- 照片上传 -->
        <div class="field">
          <label class="field__label">{{ t('custom_order_upload') }}</label>
          <div class="uploader">
            <div v-for="(img, i) in images" :key="i" class="uploader__item">
              <img :src="img" />
            </div>
            <div class="uploader__add" @click="triggerFileInput">
              <van-icon v-if="!uploading" name="plus" size="20" color="#9A8C80" />
              <van-loading v-else type="spinner" size="20" />
            </div>
            <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="onFileChange" />
          </div>
        </div>

        <!-- 绘画要求 -->
        <div class="field">
          <label class="field__label">{{ t('custom_order_requirements') }}</label>
          <textarea v-model="requirements" class="textarea" placeholder="Tell us what you want..." maxlength="1000" />
        </div>

        <!-- 邮寄地址 (选填，但如果点实物版购买会校验) -->
        <div class="field">
          <label class="field__label">{{ t('custom_order_address') }}</label>
          <input v-model="shippingAddress" type="text" class="input" :placeholder="t('custom_order_address_placeholder')" />
        </div>

        <!-- 购买选项卡片 -->
        <div class="plan-cards">
          <!-- 电子版 -->
          <div class="plan-card">
            <h3 class="plan-card__title">{{ t('custom_order_plan_digital_title') }}</h3>
            <p class="plan-card__desc">{{ t('custom_order_plan_digital_desc') }}</p>
            <button class="btn btn--primary btn--block plan-card__btn" :disabled="submitting" @click="handleOrder('digital')">
              {{ t('custom_order_plan_digital_btn') }}
            </button>
          </div>

          <!-- 实物版 -->
          <div class="plan-card plan-card--highlight">
            <h3 class="plan-card__title">{{ t('custom_order_plan_physical_title') }}</h3>
            <p class="plan-card__desc">{{ t('custom_order_plan_physical_desc') }}</p>
            <button class="btn btn--primary btn--block plan-card__btn" :disabled="submitting" @click="handleOrder('physical')">
              {{ t('custom_order_plan_physical_btn') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.custom-order {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  padding: @sp-5 @sp-5 @sp-4;
  background: @paper;

  @media (max-width: @bp-sm) {
    padding: @sp-4 @sp-4 @sp-3;
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-4;
  }

  &__title {
    margin: 0;
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: @fs-xs;
    color: @accent;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  &__form {
    overflow-y: auto;
  }
}

.uploader {
  display: flex;
  flex-wrap: wrap;
  gap: @sp-2;

  &__item {
    width: 64px;
    height: 64px;
    border-radius: @radius-sm;
    overflow: hidden;
    border: 1px solid @border;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__add {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: @surface;
    border: 1px dashed @border-strong;
    border-radius: @radius-sm;
    cursor: pointer;

    &:hover {
      border-color: @accent;
    }
  }
}

.plan-cards {
  display: flex;
  gap: @sp-3;
  margin-top: @sp-4;

  @media (max-width: @bp-sm) {
    flex-direction: column;
  }
}

.plan-card {
  flex: 1;
  padding: @sp-4;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  display: flex;
  flex-direction: column;

  &--highlight {
    border-color: @accent;
    box-shadow: 0 4px 12px rgba(232, 168, 124, 0.15);
  }

  &__title {
    margin: 0 0 @sp-2;
    font-size: @fs-base;
    font-weight: 600;
    color: @ink-1;
  }

  &__desc {
    margin: 0 0 @sp-4;
    font-size: @fs-xs;
    color: @ink-2;
    line-height: 1.5;
    flex: 1;
  }

  &__btn {
    font-weight: 600;
  }
}
</style>
