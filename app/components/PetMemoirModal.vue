<!-- app/components/PetMemoirModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
const { $api } = useNuxtApp()

interface Props {
  modelValue: boolean
  petName: string
  slug: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const memoirText = ref('')

async function generate() {
  loading.value = true
  try {
    const res = await $api<{ memoir: string }>(`/api/pets/${props.slug}/memoir`, {
      method: 'POST',
    })
    memoirText.value = res.memoir
  } catch (err: any) {
    showToast(err?.data?.error || '生成失败，请稍后再试')
    visible.value = false
  } finally {
    loading.value = false
  }
}

function exportPdf() {
  window.print()
}

// 弹窗打开时自动生成
watch(visible, (val) => {
  if (val && !memoirText.value) {
    generate()
  }
})
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '90vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="!loading"
    class="memoir-modal"
  >
    <div class="memoir-content printable-area">
      <header class="memoir-header">
        <h2 class="memoir-title">{{ petName }}'s Memoir</h2>
        <p class="memoir-subtitle">Exclusive Weekly Memory</p>
      </header>

      <div v-if="loading" class="memoir-loading">
        <van-loading type="spinner" color="#E8A87C" size="32" />
        <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
      </div>

      <div v-else class="memoir-body">
        <p style="white-space: pre-wrap;">{{ memoirText }}</p>
      </div>

      <div class="memoir-actions no-print">
        <button v-if="!loading" type="button" class="btn btn--primary btn--lg" @click="exportPdf">
          {{ t('memoir_export') || '导出 PDF' }}
        </button>
        <button type="button" class="btn btn--lg" @click="visible = false">
          {{ t('btn_close') || '关闭' }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.memoir-content {
  padding: @sp-6 @sp-5;
  background: #faf6f1;
  max-height: 85vh;
  overflow-y: auto;
}

.memoir-header {
  text-align: center;
  margin-bottom: @sp-6;
  border-bottom: 1px solid @border;
  padding-bottom: @sp-4;
}

.memoir-title {
  font-family: @font-serif;
  font-size: @fs-xl;
  font-weight: 700;
  color: @ink-1;
  margin: 0 0 @sp-1;
}

.memoir-subtitle {
  font-size: @fs-sm;
  color: @ink-3;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.memoir-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-4;
  padding: @sp-8 0;
  color: @ink-2;
}

.memoir-body {
  font-size: 15px;
  line-height: 2;
  color: @ink-1;
  font-family: @font-serif;
  text-indent: 2em;
}

.memoir-actions {
  margin-top: @sp-6;
  display: flex;
  gap: @sp-3;
  .btn { flex: 1; }
}

/* 👇 打印 PDF 专用的 CSS */
@media print {
  /* 隐藏网页上其它所有内容 */
  body * {
    visibility: hidden;
  }
  /* 只显示弹窗内容区 */
  .printable-area, .printable-area * {
    visibility: visible;
  }
  /* 调整打印位置，去除背景和阴影 */
  .printable-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 20px;
    background: #fff;
    box-shadow: none;
    max-height: none;
    overflow: visible;
  }
  /* 隐藏不需要打印的按钮 */
  .no-print {
    display: none !important;
  }
}
</style>