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

function exportPdf() {
  window.print()
}

watch(visible, (val) => {
  if (val && !memoirText.value) {
    generate()
  }
})
</script>

<template>
  <!-- 👇 移除了 maxHeight 属性，改由内部 CSS 控制高度，避免加载时撑满全屏 -->
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
      <!-- 新增 memoir-inner 专门负责居中和最大宽度 -->
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

/* ============================================================ */
/* 屏幕显示样式 */
/* ============================================================ */

/* 外层：控制弹窗背景色和最大高度 */
.memoir-content {
  background: #faf6f1;
  max-height: 85vh;
  overflow-y: auto;
  /* 最小高度，防止加载时太扁 */
  min-height: 240px; 
}

/* 内层：控制内容宽度并居中 */
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

/* ============================================================ */
/* 👇 打印 PDF 专用的排版修复 */
/* ============================================================ */
@media print {
  /* 1. 强制隐藏页面上除回忆录弹窗以外的所有内容（包含主页框架、各种操作按钮） */
  body * {
    visibility: hidden !important;
  }

  /* 2. 只把回忆录弹窗内容及其内部子元素设为可见 */
  .memoir-popup,
  .memoir-popup * {
    visibility: visible !important;
  }

  /* 3. 重置弹窗在打印页中的绝对定位，使其完全撑满并顶格居中 */
  .memoir-popup {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
  }

  /* 4. 彻底隐藏遮罩层和底部操作按钮 */
  .van-overlay,
  .memoir-actions,
  .no-print {
    display: none !important;
    visibility: hidden !important;
  }

  /* 5. 修复 p1 问题：回忆录内容区域完美的 A4 纸居中与打印排版 */
  .memoir-content {
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  .memoir-inner {
    width: 100% !important;
    max-width: 700px !important;
    margin: 0 auto !important;
    padding: 20px 40px !important;
    box-sizing: border-box !important;
  }

  .memoir-header {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    width: 100% !important;
    margin-bottom: 30px !important;
  }

  .memoir-avatar {
    margin: 0 auto 12px auto !important;
  }

  .memoir-title,
  .memoir-subtitle {
    text-align: center !important;
  }

  /* 解决跨页断行体验问题 */
  .memoir-body {
    page-break-inside: auto;
    color: #2c2c2c !important;
  }
}
</style>