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
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '90vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="!loading"
    class="memoir-modal"
  >
    <!-- 👇 给内容区加上 memoir-print-area 类名用于打印 -->
    <div class="memoir-content memoir-print-area">
      <header class="memoir-header">
        <!-- 👇 新增：回忆录头像 -->
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

      <!-- 👇 新增：底部落款 -->
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
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: @sp-6;
  border-bottom: 1px solid @border;
  padding-bottom: @sp-4;
}

/* 👇 新增头像样式 */
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
  padding: 0 @sp-4;
}

/* 👇 新增底部落款样式 */
.memoir-footer {
  text-align: right;
  font-size: 12px;
  color: @ink-3;
  margin-top: 40px;
  padding-right: @sp-4;
  font-family: @font-mono;
}

.memoir-actions {
  margin-top: @sp-6;
  display: flex;
  gap: @sp-3;
  .btn { flex: 1; }
}

/* 👇 终极打印样式：暴力隐藏所有不需要的元素 */
@media print {
  /* 1. 把页面上所有东西都设为不可见，清除背景 */
  body * {
    visibility: hidden;
    background: transparent !important;
  }
  
  /* 2. 只把回忆录区域设为可见 */
  .memoir-print-area, .memoir-print-area * {
    visibility: visible;
  }

  /* 3. 强制把回忆录区域绝对定位到左上角，铺满整页，不受任何高度限制 */
  .memoir-print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 40px !important;
    background: #fff !important;
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
    box-shadow: none !important;
  }

  /* 4. 隐藏按钮 */
  .memoir-actions {
    display: none !important;
  }
  
  /* 5. 移除弹窗的遮罩 */
  .van-overlay {
    display: none !important;
  }
}
</style>