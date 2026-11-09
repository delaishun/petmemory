<!-- app/components/PetMemoirModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

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
const exporting = ref(false)
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
    
    // 👇 自动清洗掉 AI 文本末尾自带的“永远爱你的...”字样，防止与前端落款重复
    let cleanText = res.memoir || ''
    cleanText = cleanText.replace(/永远爱你的[\s\S]*$/, '').trim()
    memoirText.value = cleanText

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
    showToast(errorMsg || '生成失败，请稍后再试')
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

async function exportPdf() {
  if (loading.value || !memoirText.value || exporting.value) {
    return
  }

  exporting.value = true
  const loadingToast = showToast({
    type: 'loading',
    message: '正在生成 PDF...',
    duration: 0,
    forbidClick: true,
  })

  updatePrintTime()
  await nextTick() // 等待日期及 DOM 渲染完成
  
  // 给头像加载留出一点缓冲时间，防止 html2canvas 截到空白头像
  await new Promise((resolve) => setTimeout(resolve, 200))

  const target = document.querySelector('.memoir-print-area') as HTMLElement
  if (!target) {
    exporting.value = false
    loadingToast.close()
    return
  }

  try {
    // 临时解除高度限制，让元素在截图中完全展开
    const originalMaxHeight = target.style.maxHeight
    const originalOverflow = target.style.overflow
    target.style.maxHeight = 'none'
    target.style.overflow = 'visible'

    // 1. 使用 html2canvas 将目标 DOM 转为高清画布
    const canvas = await html2canvas(target, {
      scale: 2, // 2倍清晰度
      useCORS: true,
      backgroundColor: '#faf6f1',
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    })

    // 恢复原来的样式
    target.style.maxHeight = originalMaxHeight
    target.style.overflow = originalOverflow

    // 2. 使用 jsPDF 将画布生成 PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    // A4 纸尺寸 (mm)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    const margin = 10 // 页边距 10mm
    const contentWidth = pdfWidth - margin * 2

    // 根据画布比例计算图片在 PDF 中的实际高度
    const imgHeight = (canvas.height * contentWidth) / canvas.width

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    let heightLeft = imgHeight
    let position = margin

    // 添加第一页
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
    heightLeft -= (pdfHeight - margin * 2)

    // 如果内容超出一页，进行分页渲染
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
      heightLeft -= (pdfHeight - margin * 2)
    }

    // 触发下载（落款干净、不带括号大宝）
    pdf.save(`${props.petName}-Memoir.pdf`)
    loadingToast.close()
  } catch (err) {
    console.error('PDF 生成失败', err)
    loadingToast.close()
    showToast('生成 PDF 失败，请重试')
  } finally {
    exporting.value = false
  }
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
    :close-on-click-overlay="!loading && !exporting"
    class="memoir-popup"
  >
    <div class="memoir-content">
      <!-- 截图核心区域 -->
      <div class="memoir-inner memoir-print-area">
        <header class="memoir-header">
          <img class="memoir-avatar" :src="petAvatarUrl || defaultPetAvatar" alt="avatar" crossorigin="anonymous" />
          <h2 class="memoir-title">{{ petName }}'s Memoir</h2>
          <p class="memoir-date" v-if="currentPrintTime">{{ currentPrintTime }}</p>
        </header>

        <div v-if="loading" class="memoir-loading">
          <van-loading type="spinner" color="#E8A87C" size="32" />
          <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
        </div>

        <div v-else class="memoir-body">
          <p style="white-space: pre-wrap;">{{ memoirText }}</p>
          <!-- 单独规范的落款，不含（大宝） -->
          <div class="memoir-signoff">
            永远爱你的 {{ petName }}
          </div>
        </div>

        <!-- 底部落款 -->
        <div v-if="!loading" class="memoir-footer">
          petmemory.me
        </div>
      </div>

      <!-- 按钮区，不在截图区内 -->
      <div class="memoir-actions">
        <button 
          v-if="!loading" 
          type="button" 
          class="btn btn--primary btn--lg" 
          :disabled="exporting"
          @click="exportPdf"
        >
          {{ exporting ? '生成中...' : (t('memoir_export') || '导出 PDF') }}
        </button>
        <button type="button" class="btn btn--lg" :disabled="exporting" @click="visible = false">
          {{ t('btn_close') || '关闭' }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style lang="less">
@import "~/assets/css/common.less";

.memoir-content {
  background: #faf6f1;
  max-height: 85vh;
  overflow-y: auto;
  min-height: 240px;
  display: flex;
  flex-direction: column;
}

.memoir-inner {
  padding: @sp-6 @sp-5;
  margin: 0 auto;
  width: 100%;
  max-width: 650px;
  background: #faf6f1;
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
  text-align: justify;
  word-break: break-word;
}

.memoir-signoff {
  margin-top: 24px;
  text-align: right;
  font-family: @font-serif;
  font-weight: 600;
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
  padding: 0 @sp-5 @sp-5;
  
  .btn { flex: 1; }
}
</style>