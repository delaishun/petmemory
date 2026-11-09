<!-- app/components/PetMemoirModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
const { t } = useI18n()
const { $api } = useNuxtApp()
interface Props {
  modelValue: boolean
  petName: string
  petAvatarUrl?: string | null
  slug: string
}
const props = withDefaults(defineProps<Props>(), {
  petAvatarUrl: null,
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const loading = ref(false)
const memoirText = ref('')
const currentPrintTime = ref('')
const defaultPetAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
       <rect width="120" height="120" fill="#F5EEE4" />
       <circle cx="60" cy="52" r="22" fill="#DCD0BF" />
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF" />
     </svg>`
  )
async function generate() {
  loading.value = true
  try {
    const res = await $api<{ memoir: string }>(`/api/pets/${props.slug}/memoir`, {
      method: 'POST',
    })
    memoirText.value = res.memoir
  } catch (err: any) {
    const errorMsg = err?.data?.error || ''

    if (errorMsg.includes('每周只能生成一次回忆录')) {
      const match = errorMsg.match(/还需等待 (\d+) 天/)
      if (match && match[1]) {
        showToast({ message: t('memoir_cooldown', { n: match[1] }) })
        visible.value = false
        return
      }
    }

    showToast(err?.data?.error || '生成失败，请稍后再试')
    visible.value = false
  } finally {
    loading.value = false
  }
}
function updatePrintTime() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  currentPrintTime.value = `${y}-${m}-${dd} ${hh}:${mm}`
}
function exportPdf() {
  if (loading.value || !memoirText.value) {
    showToast(t('memoir_generating') || '正在生成回忆录，请稍候...')
    return
  }
  updatePrintTime()
  window.print()
}
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
    :style="{ width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="!loading"
    class="memoir-popup"
  >
    <div class="memoir-content">
      <div class="memoir-inner memoir-print-area">
        <header class="memoir-header">
          <img class="memoir-avatar" :src="petAvatarUrl || defaultPetAvatar" alt="avatar" />
          <h2 class="memoir-title">{{ petName }}'s Memoir</h2>
          <p class="memoir-date" v-if="currentPrintTime">{{ currentPrintTime }}</p>
        </header>
        <div v-if="loading" class="memoir-loading">
          <van-loading type="spinner" color="#E8A87C" size="32" />
          <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
        </div>
        <div v-else class="memoir-body">
          <p style="white-space: pre-wrap;">{{ memoirText }}</p>
        </div>
        <!-- 底部落款 -->
        <div v-if="!loading" class="memoir-footer">
          petmemory.me
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
    </div>
  </van-popup>
</template>
<style lang="less">
@import "~/assets/css/common.less";
/* ============================================================ */
/* 屏幕显示样式 */
/* ============================================================ */
.memoir-popup {
  .memoir-content {
    background: #faf6f1;
    max-height: 85vh;
    overflow-y: auto;
    min-height: 240px;
  }
  .memoir-inner {
    padding: @sp-6 @sp-5;
    max-width: 650px;
    margin: 0 auto;
  }
  .memoir-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: @sp-6;
    border-bottom: 1px solid @border;
    padding-bottom: @sp-4;
  }
  .memoir-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: @sp-3;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .memoir-title {
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
    margin: 0 0 @sp-1;
  }
  .memoir-date {
    font-size: @fs-xs;
    color: @ink-3;
    font-family: @font-mono;
    margin: @sp-1 0 0;
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
    font-size: 16px;
    line-height: 2.2;
    color: @ink-1;
    font-family: @font-serif;
    text-align: center;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .memoir-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
    font-size: 12px;
    color: @ink-3;
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px dashed #ddd;
    font-family: @font-mono;
  }
  .memoir-actions {
    margin-top: @sp-6;
    display: flex;
    gap: @sp-3;
    .btn { flex: 1; }
  }
}
/* ============================================================ */
/* 👇 修复打印偏左问题 & 彻底消除尾部多余元素 */
/* ============================================================ */
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  /* 1. 核心大招：直接把主页框架完全隐藏 */
  #__nuxt {
    display: none !important;
  }

  /* 2. 重置 body 和 teleport 容器，让弹窗自然撑开 */
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 100% !important;
    height: auto !important;
  }

  #teleports {
    display: block !important;
    width: 100% !important;
    height: auto !important;
  }

  /* 3. 隐藏网页多余元素 */
  .van-overlay,
  .memoir-actions,
  .no-print {
    display: none !important;
  }

  /* 4. van-popup 弹窗彻底清除所有定位残留 */
  .van-popup.memoir-popup {
    display: block !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .van-popup.memoir-popup .memoir-content {
    display: block !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
  }

  /* 5. 核心打印内容容器，强制居中 */
  .van-popup.memoir-popup .memoir-inner {
    display: block !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 620px !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: transparent !important;
  }

  /* 6. 头部区域 */
  .van-popup.memoir-popup .memoir-header {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    padding-bottom: 15px !important;
    margin-bottom: 20px !important;
    border-bottom: 1px solid #ddd !important;
  }
  .van-popup.memoir-popup .memoir-avatar {
    width: 70px !important;
    height: 70px !important;
    margin-bottom: 8px !important;
    border-radius: 50%;
    object-fit: cover;
  }
  .van-popup.memoir-popup .memoir-title {
    font-size: 20px !important;
    margin-bottom: 4px !important;
    font-family: serif;
  }
  .van-popup.memoir-popup .memoir-date {
    font-size: 11px !important;
    color: #888 !important;
    font-family: monospace;
  }

  /* 7. 正文排版 */
  .van-popup.memoir-popup .memoir-body {
    display: block !important;
    width: 100% !important;
    text-align: justify !important;
    font-size: 13pt !important;
    line-height: 1.8 !important;
    color: #2c2c2c !important;
    font-family: serif;
    word-break: break-word;
  }
  .van-popup.memoir-popup .memoir-body p {
    margin: 0 !important;
    width: 100% !important;
    white-space: pre-wrap;
  }

  /* 8. 底部落款 */
  .van-popup.memoir-popup .memoir-footer {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 2px !important;
    margin-top: 30px !important;
    padding-top: 10px !important;
    border-top: 1px dashed #ccc !important;
    font-size: 10pt !important;
    color: #666 !important;
    font-family: monospace;
  }
}
</style>
