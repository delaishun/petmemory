<!-- app/components/ManageSubscriptionModal.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth'

const { t } = useI18n()

// 获取全局用户状态，判断是用什么渠道支付的
const user = useState<AuthUser | null>('auth:user', () => null)
// 👇 核心修改：默认采用 Dodo 支付（因为目前网站默认是 Dodo）
const provider = computed(() => user.value?.payment_provider || 'dodo')

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// 动态计算当前应该显示的步骤文案
const steps = computed(() => {
  if (provider.value === 'dodo') {
    return [
      t('manage_sub_dodo_step_1') || '前往您注册时使用的邮箱。',
      t('manage_sub_dodo_step_2') || '搜索来自 Dodo Payments 的收据邮件。',
      t('manage_sub_dodo_step_3') || '打开邮件，点击里面的 "Customer Portal" 或 "Manage Subscription" 链接。',
      t('manage_sub_dodo_step_4') || '在打开的网页中，点击 "Cancel Subscription" 即可取消。',
    ]
  }
  // Paddle 兜底
  return [
    t('manage_sub_paddle_step_1') || '前往您注册时使用的邮箱。',
    t('manage_sub_paddle_step_2') || '搜索来自 Paddle 的账单邮件。',
    t('manage_sub_paddle_step_3') || '打开邮件，点击里面的 "Manage Subscription" 链接。',
    t('manage_sub_paddle_step_4') || '在打开的网页中，点击 "Cancel Subscription" 即可取消。',
  ]
})

const descText = computed(() => {
  return provider.value === 'dodo' 
    ? (t('manage_sub_dodo_desc') || '您的 VIP 会员通过 Dodo Payments 管理。如需取消自动续费：')
    : (t('manage_sub_paddle_desc') || '您的 VIP 会员通过 Paddle 管理。如需取消自动续费：')
})
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="{ width: 'min(380px, 90%)' }"
    teleport="body"
    class="manage-modal"
  >
    <div class="manage-modal__content">
      <div class="manage-modal__header">
        <van-icon name="setting-o" class="manage-modal__icon" />
        <h2 class="manage-modal__title">{{ t('manage_sub_title') || '管理订阅' }}</h2>
        <p class="manage-modal__subtitle">{{ t('manage_sub_subtitle') || '您的订阅正在自动续费中' }}</p>
      </div>

      <div class="manage-modal__body">
        <p class="manage-modal__desc">{{ descText }}</p>
        
        <ol class="manage-modal__steps">
          <li v-for="(step, idx) in steps" :key="idx">{{ step }}</li>
        </ol>

        <div class="manage-modal__tips">
          <van-icon name="info-o" class="tips-icon" />
          <span>{{ t('manage_sub_tips') || '取消后，您的 VIP 权益将持续到当前计费周期结束。' }}</span>
        </div>
      </div>

      <div class="manage-modal__actions">
        <button 
          type="button" 
          class="btn btn--primary btn--lg manage-modal__btn" 
          @click="visible = false"
        >
          {{ t('btn_got_it') || '我知道了' }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.manage-modal {
  &__content {
    display: flex;
    flex-direction: column;
    padding: @sp-6 @sp-5 @sp-5;
    background: @surface;
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-5;
  }

  &__icon {
    font-size: 42px;
    color: @ink-3;
    margin-bottom: @sp-2;
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
    color: @accent;
    font-weight: 500;
  }

  &__body {
    background: @surface-2;
    padding: @sp-4;
    border-radius: @radius-lg;
    border: 1px solid @border;
    margin-bottom: @sp-5;
  }

  &__desc {
    margin: 0 0 @sp-3;
    font-size: @fs-sm;
    color: @ink-2;
    font-weight: 500;
  }

  &__steps {
    margin: 0;
    padding-left: @sp-5;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.6;

    li {
      margin-bottom: @sp-2;
    }
  }

  &__tips {
    display: flex;
    align-items: flex-start;
    gap: @sp-1;
    margin-top: @sp-4;
    padding-top: @sp-3;
    border-top: 1px dashed @border;
    font-size: @fs-xs;
    color: @ink-3;
    line-height: 1.5;

    .tips-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }
  }

  &__actions {
    display: flex;
  }

  &__btn {
    width: 100%;
  }
}
</style>