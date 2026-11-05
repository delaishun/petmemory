<!-- app/pages/pricing.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from "~/types/auth";

const { t } = useI18n()

// 👇 获取全局用户状态
const user = useState<AuthUser | null>("auth:user", () => null);

// 👇 弹窗状态
const loginModalVisible = ref(false);
const upgradeVipModalVisible = ref(false);

// 👇 订阅按钮点击逻辑
function handleSubscribe() {
  if (!user.value) {
    // 未登录：弹出登录框
    loginModalVisible.value = true;
  } else if (!user.value.isVip) {
    // 已登录但非 VIP：弹出购买窗口
    upgradeVipModalVisible.value = true;
  }
}

// 登录成功后的回调：如果登录成功且不是 VIP，直接弹出购买窗口（体验更好）
function onLoginSuccess() {
  loginModalVisible.value = false;
  if (user.value && !user.value.isVip) {
    upgradeVipModalVisible.value = true;
  }
}

// SEO 配置
useSeoMeta({
  title: 'Pricing - PetMemory',
  description:
    'Explore the pricing for our virtual pet memorial services, including VIP subscriptions, virtual gifts, and custom pet portrait artwork.',
  ogTitle: 'Pricing - PetMemory',
  ogDescription: 'Explore the pricing for our virtual pet memorial services.',
  ogImage: 'https://music.petmemory.me/og-cover.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 600,
  ogType: 'website',
  ogUrl: 'https://www.petmemory.me/pricing',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Pricing - PetMemory',
  twitterDescription: 'Explore the pricing for our virtual pet memorial services.',
  twitterImage: 'https://music.petmemory.me/og-cover.jpg',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.petmemory.me/pricing' }]
})

type I18nKey = Parameters<typeof t>[0]

const gifts: { key: I18nKey; price: number }[] = [
  { key: 'gift_flower', price: 1.00 },
  { key: 'gift_ball', price: 1.00 },
  { key: 'gift_bone', price: 0.50 },
  { key: 'gift_carrot', price: 0.50 },
  { key: 'gift_burger', price: 1.00 },
  { key: 'gift_bell', price: 1.00 },
  { key: 'gift_corn', price: 0.50 },
  { key: 'gift_nest', price: 2.50 },
  { key: 'gift_star', price: 1.00 },
  { key: 'gift_biscuit', price: 0.50 },
  { key: 'gift_candle', price: 2.50 },
  { key: 'gift_wings', price: 5.00 },
  { key: 'gift_crown', price: 5.00 },
]

const portraits: { key: I18nKey; price: number }[] = [
  { key: 'pricing_portrait_1', price: 45 },
  { key: 'pricing_portrait_2', price: 60 },
]
</script>

<template>
  <div class="page">
    <div class="container section pricing-page">
      
      <!-- 头部简介区 -->
      <header class="pricing-hero">
        <h1 class="pricing-hero__title">{{ t('pricing_title') }}</h1>
        <p class="pricing-hero__intro">
          {{ t('pricing_intro') }}
        </p>
      </header>

      <!-- VIP 会员区 -->
      <section class="pricing-section">
        <h2 class="pricing-section__title">{{ t('pricing_vip_section') }}</h2>
        <div class="vip-card">
          <div class="vip-card__icon">
            <van-icon name="gem-o" />
          </div>
          <div class="vip-card__info">
            <h3 class="vip-card__title">{{ t('pricing_vip_name') }}</h3>
            <ul class="vip-card__features">
              <li><van-icon name="success" /> {{ t('pricing_vip_f1') }}</li>
              <li><van-icon name="success" /> {{ t('pricing_vip_f2') }}</li>
              <li><van-icon name="success" /> {{ t('pricing_vip_f3') }}</li>
              <li><van-icon name="success" /> {{ t('pricing_vip_f4') }}</li>
            </ul>
          </div>
          
          <!-- 👇 右侧价格与订阅按钮 -->
          <div class="vip-card__action">
            <div class="vip-card__price">
              <span class="currency">$</span>{{ t('pricing_vip_price') }}<span class="period">{{ t('pricing_vip_period') }}</span>
            </div>
            
            <button 
              v-if="!user?.isVip" 
              type="button" 
              class="btn btn--primary vip-card__btn"
              @click="handleSubscribe"
            >
              {{ t('pricing_btn_get_vip') }}
            </button>
            <div v-else class="vip-card__active">
              <van-icon name="checked" /> {{ t('pricing_vip_active') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 虚拟礼物区 -->
      <section class="pricing-section">
        <h2 class="pricing-section__title">{{ t('pricing_gifts_section') }}</h2>
        <div class="gift-grid">
          <div v-for="gift in gifts" :key="gift.key" class="gift-item">
            <span class="gift-item__name">{{ t(gift.key) }}</span>
            <span class="gift-item__price">${{ gift.price.toFixed(2) }}</span>
          </div>
        </div>
      </section>

      <!-- 定制手绘区 -->
      <section class="pricing-section">
        <h2 class="pricing-section__title">{{ t('pricing_portraits_section') }}</h2>
        <div class="portrait-grid">
          <div v-for="item in portraits" :key="item.key" class="portrait-card">
            <div class="portrait-card__info">
              <h3 class="portrait-card__title">{{ t(item.key) }}</h3>
            </div>
            <div class="portrait-card__price">${{ item.price }}</div>
          </div>
        </div>
      </section>

      <!-- 👇 底部退款政策提示 -->
      <div class="pricing-footer-note">
        <p>
          {{ t('pricing_refund_notice') }}
          <NuxtLink to="/refund" class="pricing-footer-note__link">{{ t('refund_title') }}</NuxtLink>
          {{ t('pricing_refund_suffix') }}
        </p>
      </div>

    </div>

    <!-- 登录弹窗 -->
    <LoginModal 
      v-if="loginModalVisible" 
      v-model="loginModalVisible" 
      @success="onLoginSuccess" 
    />
    
    <!-- VIP 购买弹窗 -->
    <UpgradeVipModal 
      v-if="upgradeVipModalVisible" 
      v-model="upgradeVipModalVisible" 
    />
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.pricing-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: @sp-8;
}

.pricing-hero {
  text-align: center;
  padding: @sp-7 @sp-4 @sp-6;

  &__title {
    margin: 0 0 @sp-3;
    font-family: @font-serif;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
    letter-spacing: 0.05em;
  }

  &__intro {
    margin: 0 auto;
    max-width: 650px;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-base;
  }
}

.pricing-section {
  margin-bottom: @sp-7;

  &__title {
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
    margin-bottom: @sp-4;
    padding-bottom: @sp-2;
    border-bottom: 1px solid @border;
  }
}

// 修改 VIP 卡片布局以适应按钮
.vip-card {
  display: flex;
  align-items: center;
  gap: @sp-5;
  padding: @sp-5 @sp-6;
  background: linear-gradient(135deg, fade(@gold-soft, 50%), @surface);
  border: 1px solid @gold-hover;
  border-radius: @radius-lg;
  box-shadow: 0 4px 12px fade(@gold-hover, 10);

  @media (max-width: @bp-sm) {
    flex-direction: column;
    align-items: flex-start;
    gap: @sp-4;
    padding: @sp-5;
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    font-size: 32px;
    color: @gold-hover;
    background: @surface;
    border-radius: 50%;
    box-shadow: @shadow-1;
  }

  &__info {
    flex: 1;
  }

  &__title {
    margin: 0 0 @sp-2;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__features {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: @sp-2;

    @media (max-width: @bp-sm) {
      grid-template-columns: 1fr;
    }

    li {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: @fs-sm;
      color: @ink-2;

      .van-icon {
        color: @gold-hover;
      }
    }
  }

  // 👇 新增右侧区域样式
  &__action {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: @sp-3;

    @media (max-width: @bp-sm) {
      width: 100%;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-top: @sp-2;
    }
  }

  &__price {
    font-size: 36px;
    font-weight: 800;
    color: @gold-hover;
    font-family: @font-mono;
    white-space: nowrap;

    .currency {
      font-size: 20px;
      margin-right: 2px;
    }
    .period {
      font-size: @fs-sm;
      font-weight: 500;
      color: @ink-3;
    }
  }

  &__btn {
    // 使用全局的基础按钮样式，这里微调宽高
    padding-left: @sp-5;
    padding-right: @sp-5;
    border-radius: @radius-pill;
  }

  &__active {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: @gold-hover;
    font-weight: 600;
    font-size: @fs-sm;
  }
}

.gift-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: @sp-3;
}

.gift-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @sp-3 @sp-4;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius;
  transition: background @dur-fast ease;

  &:hover {
    background: @surface-2;
    border-color: @border-strong;
  }

  &__name {
    font-size: @fs-sm;
    color: @ink-1;
    font-weight: 500;
  }

  &__price {
    font-size: @fs-sm;
    font-weight: 700;
    color: @accent;
    font-family: @font-mono;
  }
}

.portrait-grid {
  display: flex;
  flex-direction: column;
  gap: @sp-3;
}

.portrait-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @sp-4 @sp-5;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  box-shadow: @shadow-1;
  gap: @sp-4;

  @media (max-width: @bp-sm) {
    flex-direction: column;
    align-items: flex-start;
    gap: @sp-3;
  }

  &__title {
    margin: 0;
    font-size: @fs-base;
    font-weight: 600;
    color: @ink-1;
  }

  &__price {
    font-size: @fs-xl;
    font-weight: 700;
    color: @accent;
    font-family: @font-mono;
  }
}

// 👇 新增底部退款提示样式
.pricing-footer-note {
  margin-top: @sp-8;
  text-align: center;
  font-size: @fs-sm;
  color: @ink-3;

  p {
    margin: 0;
  }

  &__link {
    color: @accent;
    text-decoration: underline;
    text-decoration-color: fade(@accent, 50%);
    text-underline-offset: 2px;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent-hover;
      text-decoration-color: @accent-hover;
    }
  }
}
</style>