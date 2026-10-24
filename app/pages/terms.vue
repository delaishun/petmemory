<!-- app/pages/terms.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

useHead(() => ({
  title: `${t('terms_title')} · ${t('app_name')}`,
}))

// 扩充为 9 个段落，明确加入数据删除条款
const sections = computed(() => [
  {
    title: t('terms_sec1_title'),
    content: t('terms_sec1_desc'),
  },
  {
    title: t('terms_sec2_title'),
    content: t('terms_sec2_desc'),
  },
  {
    title: t('terms_sec3_title'),
    content: t('terms_sec3_desc'),
  },
  {
    title: t('terms_sec4_title'),
    content: t('terms_sec4_desc'),
  },
  {
    title: t('terms_sec5_title'),
    content: t('terms_sec5_desc'),
  },
  {
    title: t('terms_sec6_title'),
    content: t('terms_sec6_desc'),
  },
  {
    title: t('terms_sec7_title'),
    content: t('terms_sec7_desc'),
  },
  {
    // 新增：账号注销与数据删除
    title: t('terms_sec8_title'),
    content: t('terms_sec8_desc'),
  },
  {
    // 顺延：适用法律与争议解决
    title: t('terms_sec9_title'),
    content: t('terms_sec9_desc'),
  },
])
</script>

<template>
  <div class="page">
    <div class="container section terms-page">
      <header class="terms-hero">
        <h1 class="terms-hero__title">{{ t('terms_title') }}</h1>
        <p class="terms-hero__date">{{ t('terms_last_updated') }}: 2026-10-24</p>
      </header>

      <div class="terms-content">
        <p class="terms-content__intro">{{ t('terms_intro') }}</p>

        <section v-for="(sec, index) in sections" :key="index" class="terms-section">
          <h2 class="terms-section__title">{{ sec.title }}</h2>
          <p class="terms-section__desc">{{ sec.content }}</p>
        </section>

        <section class="terms-section">
          <h2 class="terms-section__title">{{ t('terms_contact_title') }}</h2>
          <p class="terms-section__desc">
            {{ t('terms_contact_desc') }} 
            <a href="mailto:fczx1999@gmail.com">fczx1999@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.terms-page {
  max-width: 800px;
  margin: 0 auto;
}

.terms-hero {
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

.terms-content {
  padding: @sp-6 @sp-4;
  line-height: @lh-loose;

  &__intro {
    font-size: @fs-base;
    color: @ink-1;
    font-weight: 500;
    margin-bottom: @sp-6;
  }
}

.terms-section {
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
    white-space: pre-line; 

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