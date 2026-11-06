<!-- app/pages/contact.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

// SEO 配置
useSeoMeta({
  title: () => `${t('contact_title')} - PetMemory`,
  description: () => t('contact_subtitle'),
  ogTitle: () => `${t('contact_title')} - PetMemory`,
  ogDescription: () => t('contact_subtitle'),
  ogImage: 'https://music.petmemory.me/og-cover.jpg',
  ogType: 'website',
  ogUrl: 'https://www.petmemory.me/contact',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.petmemory.me/contact' }]
})

// FAQ 数据
const faqs = computed(() => [
  {
    q: t('contact_faq_1_q'),
    a: t('contact_faq_1_a')
  },
  {
    q: t('contact_faq_2_q'),
    a: t('contact_faq_2_a')
  },
  {
    q: t('contact_faq_3_q'),
    a: t('contact_faq_3_a')
  }
])
</script>

<template>
  <div class="page">
    <div class="container section contact-page">
      
      <!-- 头部简介 -->
      <header class="contact-hero">
        <h1 class="contact-hero__title">{{ t('contact_title') }}</h1>
        <p class="contact-hero__subtitle">{{ t('contact_subtitle') }}</p>
      </header>

      <!-- 邮箱联系卡片 -->
      <section class="contact-card contact-card--primary">
        <div class="contact-card__icon">
          <van-icon name="envelop-o" />
        </div>
        <div class="contact-card__content">
          <h2 class="contact-card__title">{{ t('contact_email_label') }}</h2>
          <p class="contact-card__desc">{{ t('contact_email_hint') }}</p>
          <a href="mailto:fczx1999@gmail.com" class="btn btn--primary contact-card__btn">
            {{ t('contact_email_action') }}
          </a>
        </div>
        <div class="contact-card__email">
          fczx1999@gmail.com
        </div>
      </section>

      <!-- 常见问题 FAQ -->
      <section class="faq-section">
        <h2 class="faq-section__title">{{ t('contact_faq_title') }}</h2>
        <div class="faq-list">
          <div v-for="(faq, index) in faqs" :key="index" class="faq-item">
            <h3 class="faq-item__question">
              <van-icon name="question-o" class="faq-icon" />
              {{ faq.q }}
            </h3>
            <p class="faq-item__answer">{{ faq.a }}</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.contact-page {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: @sp-8;
}

.contact-hero {
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

/* 联系卡片 */
.contact-card {
  display: flex;
  align-items: center;
  gap: @sp-5;
  padding: @sp-6;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  box-shadow: @shadow-1;
  margin-bottom: @sp-7;

  @media (max-width: @bp-sm) {
    flex-direction: column;
    align-items: flex-start;
    gap: @sp-4;
    padding: @sp-5;
  }

  &--primary {
    background: linear-gradient(135deg, fade(@accent-soft, 40%), @surface);
    border-color: @accent-soft;
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    font-size: 28px;
    color: @accent;
    background: @surface;
    border-radius: 50%;
    box-shadow: @shadow-1;
  }

  &__content {
    flex: 1;
  }

  &__title {
    margin: 0 0 @sp-1;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__desc {
    margin: 0 0 @sp-3;
    font-size: @fs-sm;
    color: @ink-2;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 @sp-5;
    height: 36px;
    font-size: @fs-sm;
  }

  &__email {
    font-family: @font-mono;
    font-size: @fs-base;
    color: @accent;
    font-weight: 600;

    @media (max-width: @bp-sm) {
      margin-top: @sp-2;
    }
  }
}

/* FAQ 区域 */
.faq-section {
  &__title {
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
    margin-bottom: @sp-5;
    padding-bottom: @sp-2;
    border-bottom: 1px solid @border;
  }
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
}

.faq-item {
  padding: @sp-5;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;

  &__question {
    display: flex;
    align-items: flex-start;
    gap: @sp-2;
    margin: 0 0 @sp-2;
    font-size: @fs-base;
    font-weight: 600;
    color: @ink-1;

    .faq-icon {
      color: @accent;
      margin-top: 2px;
      flex-shrink: 0;
    }
  }

  &__answer {
    margin: 0;
    padding-left: 22px; /* 对齐图标后的文字 */
    font-size: @fs-sm;
    color: @ink-2;
    line-height: @lh-base;
  }
}
</style>