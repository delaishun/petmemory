<!-- app/pages/refund.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

useSeoMeta({
  title: () => t('refund_title'),
  description: () => 'Refund & Cancellation Policy for PetMemory',
  robots: 'noindex, follow',
})
</script>

<template>
  <div class="page container policy-page">
    <h1 class="page-title">{{ t('refund_title') }}</h1>
    <p class="last-updated">{{ t('refund_last_updated') }}: 2026-10-30</p>

    <div class="policy-content">
      <p>{{ t('refund_intro') }}</p>

      <h2>{{ t('refund_sec1_title') }}</h2>
      <p>{{ t('refund_sec1_desc') }}</p>

      <h2>{{ t('refund_sec2_title') }}</h2>
      <p>{{ t('refund_sec2_desc_1') }}</p>
      <ul>
        <li><strong>{{ t('refund_sec2_item1_title') }}</strong>: {{ t('refund_sec2_item1_desc') }}</li>
        <li><strong>{{ t('refund_sec2_item2_title') }}</strong>: {{ t('refund_sec2_item2_desc') }}</li>
      </ul>
      <p>{{ t('refund_sec2_desc_2') }}</p>

      <h2>{{ t('refund_sec3_title') }}</h2>
      <p>{{ t('refund_sec3_intro') }}</p>
      <ol>
        <li><strong>{{ t('refund_sec3_item1_title') }}</strong>: {{ t('refund_sec3_item1_desc') }}</li>
        <li><strong>{{ t('refund_sec3_item2_title') }}</strong>: {{ t('refund_sec3_item2_desc') }}</li>
        <li><strong>{{ t('refund_sec3_item3_title') }}</strong>: {{ t('refund_sec3_item3_desc') }}</li>
      </ol>

      <h2>{{ t('refund_sec4_title') }}</h2>
      <p>{{ t('refund_sec4_desc') }}</p>
      <ul>
        <li>{{ t('refund_sec4_item1') }}</li>
        <li>{{ t('refund_sec4_item2') }}</li>
        <li>{{ t('refund_sec4_item3') }}</li>
      </ul>

      <h2>{{ t('refund_sec5_title') }}</h2>
      <p>{{ t('refund_sec5_desc') }}</p>
      <ul>
        <li><strong>Email</strong>: fczx1999@gmail.com</li>
        <li><strong>{{ t('refund_sec5_req_title') }}</strong>:
          <ol>
            <li>{{ t('refund_sec5_req1') }}</li>
            <li>{{ t('refund_sec5_req2') }}</li>
            <li>{{ t('refund_sec5_req3') }}</li>
          </ol>
        </li>
      </ul>
      <p>{{ t('refund_sec5_footer') }}</p>

      <h2>{{ t('refund_sec6_title') }}</h2>
      <p>{{ t('refund_sec6_desc') }}</p>
      <ul>
        <li><strong>Website</strong>: <a href="https://www.petmemory.me" target="_blank">https://www.petmemory.me</a></li>
        <li><strong>Email</strong>: support@petmemory.me</li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.policy-page {
  max-width: 800px;
  margin: 0 auto;
  padding: @sp-7 @sp-4;
  min-height: 80vh;
}

.page-title {
  font-family: @font-serif;
  font-size: @fs-xl;
  color: @ink-1;
  margin-bottom: @sp-2;
  text-align: center;
}

.last-updated {
  text-align: center;
  font-size: @fs-sm;
  color: @ink-3;
  margin-bottom: @sp-6;
  font-family: @font-mono;
}

.policy-content {
  background: @surface;
  padding: @sp-6;
  border-radius: @radius-lg;
  border: 1px solid @border;
  box-shadow: @shadow-1;

  @media (max-width: @bp-sm) {
    padding: @sp-4;
  }

  p {
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-loose;
    margin-bottom: @sp-4;
    white-space: pre-line;
  }

  h2 {
    font-family: @font-serif;
    font-size: @fs-lg;
    color: @ink-1;
    margin: @sp-6 0 @sp-3;
    padding-bottom: @sp-2;
    border-bottom: 1px solid @border;
  }

  ul, ol {
    padding-left: @sp-5;
    margin-bottom: @sp-4;
    color: @ink-2;
    line-height: @lh-loose;
    font-size: @fs-base;

    li {
      margin-bottom: @sp-2;
    }
  }

  a {
    color: @accent;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: @accent-hover;
    }
  }
}
</style>