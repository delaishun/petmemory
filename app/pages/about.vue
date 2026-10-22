<!-- app/pages/about.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

useHead(() => ({
  title: `${t('about_title')} · ${t('app_name')}`,
}))
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
        
        <!-- 1. 时光相册 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="photo-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_album_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_album_desc') }}</p>
          </div>
        </section>

        <!-- 2. 温暖陪伴 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="chat-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_interact_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_interact_desc') }}</p>
          </div>
        </section>

        <!-- 3. 专属手绘 -->
        <section class="feature-card">
          <div class="feature-card__icon">
            <van-icon name="brush-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_drawing_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_drawing_desc') }}</p>
          </div>
        </section>

        <!-- 4. 会员尊享 -->
        <section class="feature-card">
          <div class="feature-card__icon feature-card__icon--gold">
            <van-icon name="gem-o" />
          </div>
          <div class="feature-card__content">
            <h2 class="feature-card__title">{{ t('about_vip_title') }}</h2>
            <p class="feature-card__desc">{{ t('about_vip_desc') }}</p>
          </div>
        </section>

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

    // VIP 专属金色图标
    &--gold {
      color: @gold-hover;
      background: @gold-soft;
    }
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
</style>