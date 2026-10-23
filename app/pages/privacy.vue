<!-- app/pages/privacy.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

useHead(() => ({
  title: `${t('privacy_title')} · ${t('app_name')}`,
}))

// 将条款拆分得更细，满足 Google 对数据收集的详尽要求
const sections = computed(() => [
  {
    title: t('privacy_sec1_title'),
    content: t('privacy_sec1_desc'),
  },
  {
    title: t('privacy_sec2_title'),
    content: t('privacy_sec2_desc'),
  },
  {
    title: t('privacy_sec3_title'),
    content: t('privacy_sec3_desc'),
  },
  {
    title: t('privacy_sec4_title'),
    content: t('privacy_sec4_desc'),
  },
  {
    title: t('privacy_sec5_title'),
    content: t('privacy_sec5_desc'),
  },
  {
    title: t('privacy_sec6_title'),
    content: t('privacy_sec6_desc'),
  },
  {
    title: t('privacy_sec7_title'),
    content: t('privacy_sec7_desc'),
  },
  {
    title: t('privacy_sec8_title'),
    content: t('privacy_sec8_desc'),
  },
])
</script>

<template>
  <div class="page">
    <div class="container section privacy-page">
      <header class="privacy-hero">
        <h1 class="privacy-hero__title">{{ t('privacy_title') }}</h1>
        <p class="privacy-hero__date">{{ t('privacy_last_updated') }}: 2024-05-20</p>
      </header>

      <div class="privacy-content">
        <p class="privacy-content__intro">{{ t('privacy_intro') }}</p>

        <section v-for="(sec, index) in sections" :key="index" class="privacy-section">
          <h2 class="privacy-section__title">{{ sec.title }}</h2>
          <p class="privacy-section__desc">{{ sec.content }}</p>
        </section>

        <section class="privacy-section">
          <h2 class="privacy-section__title">{{ t('privacy_contact_title') }}</h2>
          <p class="privacy-section__desc">
            {{ t('privacy_contact_desc') }} 
            <a href="mailto:support@petmemory.me">support@petmemory.me</a>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.privacy-page {
  max-width: 800px;
  margin: 0 auto;
}

.privacy-hero {
  text-align: center;
  padding: @sp-7 @sp-4 @sp-6;
  border-bottom: 1px solid @border;

  &__title {
    margin: 0 0 @sp-3;
    font-family: @font-serif;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__date {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }
}

.privacy-content {
  padding: @sp-6 @sp-4;
  line-height: @lh-loose;

  &__intro {
    font-size: @fs-base;
    color: @ink-1;
    font-weight: 500;
    margin-bottom: @sp-6;
  }
}

.privacy-section {
  margin-bottom: @sp-6;

  &__title {
    margin: 0 0 @sp-3;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__desc {
    margin: 0;
    font-size: @fs-base;
    color: @ink-2;
    white-space: pre-line; /* 允许换行生效 */

    a {
      color: @accent;
      text-decoration: underline;

      &:hover {
        color: @accent-hover;
      }
    }
  }
}
</style>