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
  const styleId = 'global-pdf-print-style'
  let styleEl = document.getElementById(styleId)
  
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    styleEl.innerHTML = `
      @media print {
        /* 1. 严格控制 A4 纸张边距，清空浏览器默认页眉页脚干扰 */
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }

        /* 2. 隐藏全网页所有元素 */
        body * {
          visibility: hidden !important;
        }

        /* 3. 仅让纯净打印核心区可见 */
        .memoir-print-area,
        .memoir-print-area * {
          visibility: visible !important;
        }

        /* 4. 强制让打印区绝对置顶，彻底消灭顶部空白 */
        .memoir-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          box-sizing: border-box !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }

        /* 5. 宠物头像和名字紧凑居中 */
        .memoir-header {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          text-align: center !important;
          margin-bottom: 12px !important;
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }

        .memoir-avatar {
          display: block !important;
          margin: 0 auto 6px auto !important;
          width: 56px !important;
          height: 56px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
        }

        .memoir-title {
          text-align: center !important;
          width: 100% !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #2c2c2c !important;
          margin: 0 !important;
        }

        /* 6. 回忆录正文排版，适度精简行高，确保单页完整 */
        .memoir-body {
          display: block !important;
          text-align: left !important;
          font-size: 12.5px !important;
          line-height: 1.6 !important;
          color: #2c2c2c !important;
          margin-top: 6px !important;
        }

        .memoir-body p {
          visibility: visible !important;
          display: block !important;
          text-align: left !important;
          margin: 0 !important;
        }

        /* 7. 底部落款：域名 + 时间紧凑居中 */
        .memoir-footer {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important;
          font-size: 10px !important;
          color: #888 !important;
          margin-top: 16px !important;
          border-top: none !important;
          font-family: monospace !important;
        }

        /* 8. 隐藏操作按钮和遮罩 */
        .van-overlay,
        .memoir-actions,
        .no-print,
        .memoir-subtitle {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `
    document.head.appendChild(styleEl)
  }

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
          <h2 class="memoir-title">{{ petName }}</h2>
        </header>

        <div v-if="loading" class="memoir-loading">
          <van-loading type="spinner" color="#E8A87C" size="32" />
          <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
        </div>

        <div v-else class="memoir-body">
          <p style="white-space: pre-wrap;">{{ memoirText }}</p>
        </div>

        <!-- 底部落款：域名 + 动态打印时间 -->
        <div v-if="!loading" class="memoir-footer">
          <span>petmemory.me</span>
          <span v-if="currentPrintTime" style="font-size: 9px; opacity: 0.8;">{{ currentPrintTime }}</span>
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

<style scoped lang="less">
@import "~/assets/css/common.less";

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
</style>