<!-- app/pages/about.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t, locale } = useI18n()

useSeoMeta({
  title: 'About PetMemory',
  description:
    'Learn about PetMemory — a peaceful virtual sanctuary created to honor beloved pets and support those who carry their memory.',
  ogTitle: 'About PetMemory',
  ogDescription: 'A peaceful virtual sanctuary for beloved pets.',
  ogImage: 'https://music.petmemory.me/og-cover.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 600,
  ogType: 'website',
  ogUrl: 'https://www.petmemory.me/about',
  twitterCard: 'summary_large_image',
  twitterTitle: 'About PetMemory',
  twitterDescription: 'A peaceful virtual sanctuary for beloved pets.',
  twitterImage: 'https://music.petmemory.me/og-cover.jpg',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.petmemory.me/about' }]
})

// 👇 权益列表动态渲染
const tiers = computed(() => [
  {
    key: 'free',
    title: locale.value === 'en' ? 'Free Explorer' : '免费体验版',
    icon: 'smile-o',
    isVip: false,
    features: locale.value === 'en' ? [
      'Create pet memorial page',
      'Upload up to 2 photos',
      'Unlimited messages & gifts',
      '3 free interactions with chat'
    ] : [
      '建立专属宠物主页',
      '上传最多 2 张相片',
      '无限次留言与赠礼',
      '3 次免费宠物对话体验'
    ]
  },
  {
    key: 'lifetime',
    title: locale.value === 'en' ? 'Lifetime Keepsake' : '终身珍藏版',
    price: '$8.9',
    icon: '💎',
    isVip: true,
    features: locale.value === 'en' ? [
      '20 photos album space',
      'Premium backgrounds, effects & music',
      'Export offline HTML page',
      'Get 10,000 bonus points'
    ] : [
      '相册照片扩展至 20 张',
      '解锁精美背景、节日特效与音乐',
      '一键导出离线 HTML 网页',
      '赠送 10000 积分'
    ]
  },
  {
    key: 'subscription',
    title: locale.value === 'en' ? 'Premium Subscription' : '尊享订阅版',
    price: '$5.9 / yr',
    icon: '🌈',
    isVip: true,
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
</script>

<template>
  <div class="page">
    <div class="container section about-page">
      <!-- 头部标题区 -->
      <header class="about-hero">
        <h1 class="about-hero__title">{{ t('about_title') }}</h1>
        <p class="about-hero__subtitle">{{ t('about_subtitle') }}</p>
      </header>

      <!-- 功能特性区 -->
      <div class="about-features">
        
        <!-- 1. 核心功能：时光相册 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="photo-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_album_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_album_desc') }}</p>
          </div>
        </section>

        <!-- 2. 核心功能：温暖陪伴 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="smile-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_interact_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_interact_desc') }}</p>
          </div>
        </section>

        <!-- 3. 核心功能：专属手绘 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="brush-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_drawing_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_drawing_desc') }}</p>
          </div>
        </section>

        <!-- 👇 新增：用户权益对比区 -->
        <div class="tiers-title">
          <h2>{{ locale === 'en' ? 'Membership Privileges' : '会员权益对比' }}</h2>
        </div>

        <div class="tiers-grid">
          <section 
            v-for="tier in tiers" 
            :key="tier.key" 
            class="tier-card"
            :class="`tier-card--${tier.key}`"
          >
            <div class="tier-card__header">
              <div class="tier-card__icon" :class="{ 'is-emoji': tier.isVip }">
                <span v-if="tier.isVip" style="font-size: 28px;">{{ tier.icon }}</span>
                <van-icon v-else :name="tier.icon" />
              </div>
              <div class="tier-card__info">
                <h3 class="tier-card__title">{{ tier.title }}</h3>
                <p v-if="tier.price" class="tier-card__price">{{ tier.price }}</p>
              </div>
            </div>

            <ul class="tier-card__list">
              <li v-for="(feature, idx) in tier.features" :key="idx">
                <van-icon name="success" class="check-icon" />
                <span>{{ feature }}</span>
              </li>
            </ul>
          </section>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.about-page {
  max-width: 800px;
  margin: 0 auto;
}

.about-hero {
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

  &__subtitle {
    margin: 0 auto;
    max-width: 500px;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-base;
  }
}

.about-features {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
  padding-bottom: @sp-8;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: @sp-4;
  padding: @sp-5;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  box-shadow: @shadow-1;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: @shadow-2;
    border-color: @accent-soft;
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    font-size: 24px;
    color: @accent;
    background: @accent-soft;
    border-radius: 50%;
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0 0 @sp-2;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__desc {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: @lh-base;
  }

  @media (max-width: @bp-sm) {
    padding: @sp-4;
    gap: @sp-3;

    &__icon {
      width: 40px;
      height: 40px;
      font-size: 20px;
    }
  }
}

// ============================================================
// 👇 新增：权益对比区样式
// ============================================================
.tiers-title {
  text-align: center;
  margin: @sp-6 0 @sp-4;
  
  h2 {
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
    margin: 0;
  }
}

.tiers-grid {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
}

.tier-card {
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  padding: @sp-5;
  box-shadow: @shadow-1;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: @shadow-2;
  }

  // 基础版
  &--free {
    border-color: @border;
    .tier-card__icon { color: @ink-2; background: @surface-2; }
  }

  // 终身版 (蓝钻风)
  &--lifetime {
    border-color: fade(#00bfff, 30%);
    background: linear-gradient(180deg, fade(#00bfff, 3%) 0%, @surface 100%);
    .tier-card__icon { background: fade(#00bfff, 10%); }
    .check-icon { color: #00bfff; }
  }

  // 订阅版 (彩虹风)
  &--subscription {
    border-color: fade(#f1c40f, 30%);
    background: linear-gradient(180deg, fade(#f1c40f, 3%) 0%, @surface 100%);
    .tier-card__icon { background: fade(#f1c40f, 10%); }
    .check-icon { color: #f1c40f; }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: @sp-4;
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
    border-radius: 50%;
    font-size: 24px;
    box-shadow: @shadow-1;
    
    &.is-emoji {
      background: @surface;
      border: 1px solid @border;
    }
  }

  &__info {
    flex: 1;
  }

  &__title {
    margin: 0 0 4px;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__price {
    margin: 0;
    font-family: @font-mono;
    font-size: @fs-base;
    font-weight: 600;
    color: @accent;
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: @sp-2;

    li {
      display: flex;
      align-items: flex-start;
      gap: @sp-2;
      font-size: @fs-sm;
      color: @ink-2;
      line-height: 1.5;
    }

    .check-icon {
      font-size: 16px;
      margin-top: 2px;
      flex-shrink: 0;
    }
  }
}
</style>