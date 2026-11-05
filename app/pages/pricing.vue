<!-- app/pages/pricing.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

type I18nKey = Parameters<typeof t>[0]

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

// 礼物列表，只存 key 和 价格
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

// 定制画作数据
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
          <div class="vip-card__price">
            <span class="currency">$</span>{{ t('pricing_vip_price') }}<span class="period">{{ t('pricing_vip_period') }}</span>
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

    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

/* 样式部分保持不变 */
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
</style>