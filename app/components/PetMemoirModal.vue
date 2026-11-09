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
       <rect width="120" height="120" fill="#F5EEE4"/>
       <circle cx="60" cy="52" r="22" fill="#DCD0BF"/>
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/>
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
          <!-- 👇 日期在这里显示 -->
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

<!-- 👇 核心修改：移除 scoped，让打印样式能够选中全局节点 -->
<style lang="less">
@import "~/assets/css/common.less";

/* ============================================================ */
/* 屏幕显示样式（必须带上作用域限定，防止污染全局） */
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
    margin: 0;
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
/* 👇 终极打印排版覆盖（全局生效） */
/* ============================================================ */
@media print {
  /* 1. 核心大招：直接干掉主页面框架，包含所有的主页按钮、页脚、相册等 */
  #__nuxt,
  .van-overlay {
    display: none !important;
  }

  /* 2. 重置全局边距 */
  body, html {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  /* 3. 解除 Vant 弹窗的所有限制，让它回归自然文档流 */
  .memoir-popup {
    position: static !important; 
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    max-height: none !important;
    transform: none !important;
    left: auto !important;
    bottom: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  /* 4. 去掉滚动条，让内容撑开 */
  .memoir-popup .memoir-content {
    display: block !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
    min-height: 0 !important;
  }

  /* 5. 内层容器：居中排版，留出合适的打印边距（消除顶部大段空白） */
  .memoir-popup .memoir-inner {
    display: block !important;
    padding: 20mm 15mm !important; 
    max-width: 100% !important;
    margin: 0 auto !important;
    background: transparent !important;
    box-sizing: border-box !important;
  }

  /* 6. 头部紧凑排列 */
  .memoir-popup .memoir-header {
    padding-bottom: 15px !important;
    margin-bottom: 20px !important;
    border-bottom: 1px dashed #ccc !important;
  }

  .memoir-popup .memoir-avatar {
    width: 80px !important;
    height: 80px !important;
    margin-bottom: 10px !important;
  }
  
  .memoir-popup .memoir-title {
    font-size: 22px !important;
    margin-bottom: 5px !important;
  }

  .memoir-popup .memoir-date {
    font-size: 12px !important;
  }

  /* 7. 正文左对齐，行高适合纸质阅读 */
  .memoir-popup .memoir-body {
    text-align: left !important;
    font-size: 14pt !important;
    line-height: 1.8 !important;
    color: #000 !important;
  }

  .memoir-popup .memoir-footer {
    margin-top: 40px !important;
    padding-top: 10px !important;
    border-top: 1px solid #ccc !important;
    font-size: 10pt !important;
    color: #666 !important;
  }

  /* 8. 隐藏按钮 */
  .memoir-popup .memoir-actions {
    display: none !important;
  }
}
</style>