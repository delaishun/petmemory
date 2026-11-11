<!-- app/pages/pricing.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from "~/types/auth";

const { t, locale } = useI18n()

// 获取全局用户状态
const user = useState<AuthUser | null>("auth:user", () => null);

// 弹窗状态
const loginModalVisible = ref(false);
const upgradeVipModalVisible = ref(false);

// 订阅按钮点击逻辑
function handleSubscribe() {
  if (!user.value) {
    loginModalVisible.value = true;
  } else {
    // 只要不是“终身+订阅双满”，就允许打开升级弹窗
    upgradeVipModalVisible.value = true;
  }
}

// 登录成功后的回调
function onLoginSuccess() {
  loginModalVisible.value = false;
  if (user.value) {
    upgradeVipModalVisible.value = true;
  }
}

// 👇 动态双语双 VIP 权益数据
const vipPlans = computed(() => [
  {
    id: 'lifetime',
    icon: '💎',
    title: locale.value === 'en' ? 'Lifetime Keepsake' : '终身珍藏版',
    price: '$8.9',
    period: locale.value === 'en' ? 'One-time' : '一次性买断',
    theme: 'blue',
    features: locale.value === 'en' ? [
      'Permanently unlock 20 photos limit',
      'Premium backgrounds, effects & music',
      'Export offline HTML webpage',
      'Get 1-Year Subscription FREE (Includes Cross-Time Messaging)',
      'Get 10,000 bonus points'
    ] : [
      '永久解锁 20 张相册空间',
      '解锁精美背景、节日特效与专属音乐',
      '一键导出离线 HTML 网页',
      '限时赠送 1 年订阅 VIP（含宠物对话）',
      '赠送 10000 积分'
    ]
  },
  {
    id: 'subscription',
    icon: '🌈',
    title: locale.value === 'en' ? 'Premium Subscription' : '尊享订阅版',
    price: '$5.9',
    period: locale.value === 'en' ? '/ year' : '/ 年',
    theme: 'gold',
    features: locale.value === 'en' ? [
      'Unlimited Cross-Time Pet Chat',
      'Weekly exclusive memoir (PDF)',
      'Monthly random gifts(Worth $2–$7)',
      'Get 10,000 bonus points'
    ] : [
      '无限次跨时空宠物对话',
      '每周生成专属回忆录并支持 PDF 导出',
      '每月登录获赠随机礼物(价值$2-$7)',
      '赠送 10000 积分'
    ]
  }
])

// 优化 SEO 描述，去掉 AI 字眼，强调纪念品
useSeoMeta({
  title: 'Pricing & Keepsakes - PetMemory',
  description:
    'Explore options for premium digital pet memorial spaces, virtual tributes, and custom pet portrait keepsakes to honor your beloved pet.',
  ogTitle: 'Pricing & Keepsakes - PetMemory',
  ogDescription: 'Premium digital memorial spaces and custom pet portrait keepsakes.',
  ogImage: 'https://music.petmemory.me/og-cover.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 600,
  ogType: 'website',
  ogUrl: 'https://www.petmemory.me/pricing',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Pricing & Keepsakes - PetMemory',
  twitterDescription: 'Premium digital memorial spaces and custom pet portrait keepsakes.',
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

      <!-- 调整顺序：优先展示定制画像纪念品 -->
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

      <!-- 👇 修改：VIP 会员区 (双卡片) -->
      <section class="pricing-section">
        <h2 class="pricing-section__title">
          {{ locale === 'en' ? 'Premium Memorial Space' : '高级数字纪念空间' }}
        </h2>
        
        <div class="vip-grid">
          <div 
            v-for="plan in vipPlans" 
            :key="plan.id" 
            class="vip-card"
            :class="`vip-card--${plan.theme}`"
          >
            <div class="vip-card__header">
              <div class="vip-card__icon">{{ plan.icon }}</div>
              <div class="vip-card__info">
                <h3 class="vip-card__title">{{ plan.title }}</h3>
                <div class="vip-card__price">
                  <span class="amount">{{ plan.price }}</span>
                  <span class="period">{{ plan.period }}</span>
                </div>
              </div>
            </div>
            
            <ul class="vip-card__features">
              <li v-for="(f, i) in plan.features" :key="i">
                <van-icon name="success" /> <span>{{ f }}</span>
              </li>
            </ul>
            
            <div class="vip-card__action">
              <button 
                v-if="!user" 
                type="button" 
                class="btn btn--primary vip-card__btn"
                @click="handleSubscribe"
              >
                {{ locale === 'en' ? 'Login to Upgrade' : '登录后升级' }}
              </button>
              <button 
                v-else
                type="button" 
                class="btn btn--primary vip-card__btn"
                @click="handleSubscribe"
              >
                {{ locale === 'en' ? 'View & Upgrade' : '查看并升级' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 虚拟纪念贡品区 -->
      <section class="pricing-section">
        <h2 class="pricing-section__title">{{ t('pricing_gifts_section') }}</h2>
        <div class="gift-grid">
          <div v-for="gift in gifts" :key="gift.key" class="gift-item">
            <span class="gift-item__name">{{ t(gift.key) }}</span>
            <span class="gift-item__price">${{ gift.price.toFixed(2) }}</span>
          </div>
        </div>
      </section>

      <!-- 底部退款政策提示 -->
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
      :user="user"
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

// ============================================================
// 👇 新增：双 VIP 卡片样式
// ============================================================
.vip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: @sp-4;

  @media (max-width: @bp-sm) {
    grid-template-columns: 1fr;
  }
}

.vip-card {
  display: flex;
  flex-direction: column;
  padding: @sp-5;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  box-shadow: @shadow-1;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: @shadow-2;
  }

  &--blue {
    border-color: fade(#00bfff, 40%);
    background: linear-gradient(180deg, fade(#00bfff, 3%) 0%, @surface 100%);
    
    .vip-card__icon { background: fade(#00bfff, 10%); }
    .vip-card__price { color: #00bfff; }
    .van-icon { color: #00bfff; }
  }

  &--gold {
    border-color: fade(#f1c40f, 40%);
    background: linear-gradient(180deg, fade(#f1c40f, 3%) 0%, @surface 100%);
    
    .vip-card__icon { background: fade(#f1c40f, 10%); }
    .vip-card__price { color: #d4af37; }
    .van-icon { color: #d4af37; }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: @sp-3;
    margin-bottom: @sp-4;
    padding-bottom: @sp-3;
    border-bottom: 1px dashed @border;
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    font-size: 28px;
    border-radius: 50%;
  }

  &__info {
    flex: 1;
  }

  &__title {
    margin: 0 0 4px;
    font-size: @fs-base;
    font-weight: 700;
    color: @ink-1;
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-family: @font-mono;
    font-weight: 700;

    .amount { font-size: 24px; }
    .period { font-size: @fs-xs; font-weight: 500; color: @ink-3; }
  }

  &__features {
    margin: 0 0 @sp-5;
    padding: 0;
    list-style: none;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: @sp-2;

    li {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: @fs-sm;
      color: @ink-2;
      line-height: 1.5;

      .van-icon {
        font-size: 16px;
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }

  &__action {
    margin-top: auto;
  }

  &__btn {
    width: 100%;
    border-radius: @radius-pill;
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