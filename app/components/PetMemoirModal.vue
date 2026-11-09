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

// 核心修复：点击导出时动态注入全局打印样式，强行打垮主页的所有多余元素
function exportPdf() {
  const styleId = 'global-pdf-print-style'
  let styleEl = document.getElementById(styleId)
  
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    styleEl.innerHTML = `
      @media print {
        /* 1. 强行隐藏全局非弹窗元素 */
        body > *:not(#teleports) {
          display: none !important;
        }
        #teleports > *:not(.van-popup--bottom) {
          display: none !important;
        }

        /* 2. 隐藏弹窗遮罩及内部不打印的按钮/页脚 */
        .van-overlay, 
        .memoir-actions, 
        .no-print {
          display: none !important;
        }

        /* 3. 彻底打碎 Vant 弹窗的绝对/固定定位，使其在 A4 纸上居中 */
        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
        }

        .van-popup,
        .memoir-popup {
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          transform: none !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          box-shadow: none !important;
          border: none !important;
        }

        .memoir-content {
          background: #fff !important;
          max-height: none !important;
          min-height: auto !important;
          overflow: visible !important;
        }

        /* 4. 解决 p1 问题：解决居左与重叠，精准垂直水平居中 Header */
        .memoir-inner {
          max-width: 680px !important;
          margin: 0 auto !important;
          padding: 40px 20px !important;
        }

        .memoir-header {
          display: block !important;
          text-align: center !important;
          margin: 0 auto 30px auto !important;
        }

        .memoir-avatar {
          display: block !important;
          margin: 0 auto 12px auto !important;
          width: 80px !important;
          height: 80px !important;
          border-radius: 50% !important;
        }

        .memoir-title, .memoir-subtitle {
          text-align: center !important;
        }

        .memoir-body {
          font-size: 15px !important;
          line-height: 2 !important;
          color: #2c2c2c !important;
          text-align: left !important;
        }
      }
    `
    document.head.appendChild(styleEl)
  }

  // 触发打印流程
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
          <p class="memoir-subtitle">Exclusive Weekly Memory</p>
        </header>

        <div v-if="loading" class="memoir-loading">
          <van-loading type="spinner" color="#E8A87C" size="32" />
          <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
        </div>

        <div v-else class="memoir-body">
          <p style="white-space: pre-wrap;">{{ memoirText }}</p>
        </div>

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