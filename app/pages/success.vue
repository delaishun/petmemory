<!-- app/pages/success.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth'

const { t } = useI18n()

// 获取当前登录用户，用于跳转个人主页查看订单
const me = useState<AuthUser | null>('auth:user', () => null)

// SEO 配置
useSeoMeta({
  title: () => `${t('payment_success_title')} - PetMemory`,
  description: () => t('payment_success_desc'),
  robots: 'noindex, nofollow', // 支付成功页不需要被搜索引擎收录
})
</script>

<template>
  <div class="page">
    <div class="container section success-page">
      
      <div class="success-card">
        <!-- 成功图标 -->
        <div class="success-icon">
          <van-icon name="checked" />
        </div>
        
        <!-- 文本提示 -->
        <h1 class="success-title">{{ t('payment_success_title') }}</h1>
        <p class="success-desc">{{ t('payment_success_desc') }}</p>
        
        <!-- 操作按钮 -->
        <div class="success-actions">
          <NuxtLink to="/" class="btn btn--lg">
            {{ t('btn_back_home') }}
          </NuxtLink>
          
          <NuxtLink 
            :to="me ? `/users/${me.id}` : '/'" 
            class="btn btn--primary btn--lg"
          >
            {{ t('btn_go_orders') }}
          </NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.success-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-card {
  max-width: 480px;
  width: 100%;
  padding: @sp-8 @sp-6;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-xl;
  box-shadow: @shadow-2;
  text-align: center;

  @media (max-width: @bp-sm) {
    padding: @sp-6 @sp-4;
  }
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto @sp-5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: @success;
  color: #fff;
  border-radius: 50%;
  font-size: 40px;
  box-shadow: 0 4px 12px fade(@success, 40%);
}

.success-title {
  margin: 0 0 @sp-3;
  font-family: @font-serif;
  font-size: @fs-2xl;
  font-weight: 700;
  color: @ink-1;
}

.success-desc {
  margin: 0 0 @sp-6;
  font-size: @fs-base;
  color: @ink-2;
  line-height: @lh-base;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: @sp-3;
  
  @media (min-width: @bp-sm) {
    flex-direction: row;
    justify-content: center;
  }

  .btn {
    min-width: 140px;
  }
}
</style>