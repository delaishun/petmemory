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

// 头像加载失败时的兜底标识
const avatarLoadError = ref(false)

// ========== 工具函数 ==========
async function convertUrlToBase64(url: string): Promise<string> {
  if (!url) return "";
  try {
    const timeStampedUrl = url.includes("?")
      ? `${url}&_t=${Date.now()}`
      : `${url}?_t=${Date.now()}`;
    const response = await fetch(timeStampedUrl, { mode: "cors" });
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
            return;
          }
        } catch (err) { }
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }
}

async function waitImagesDecoded(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll('img'));
  const promises = imgs.map(img => {
    if (img.complete && img.naturalHeight > 0) return Promise.resolve();
    return img.decode().catch(() => Promise.resolve());
  });
  await Promise.all(promises);
}
// ========================================

// 监听弹窗打开时，重置头像加载状态
watch(visible, (val) => {
  if (val) {
    avatarLoadError.value = false
    if (!memoirText.value) {
      generate()
    }
  }
})

async function generate() {
  loading.value = true
  try {
    const res = await $api<{ memoir: string }>(`/api/pets/${props.slug}/memoir`, {
      method: 'POST',
    })

    // 👇 修复：直接使用 AI 生成的原始文本，不再做正则截断。
    // 依靠 deepseek.ts 中的 Prompt 来约束落款。
    memoirText.value = res.memoir || ''
    
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
  await nextTick()

  const target = document.querySelector('.memoir-print-area') as HTMLElement
  if (!target) {
    exporting.value = false
    loadingToast.close()
    return
  }

  try {
    await waitImagesDecoded(target)
    await document.fonts.ready
    await new Promise((resolve) => setTimeout(resolve, 250))

    const originalMaxHeight = target.style.maxHeight
    const originalOverflow = target.style.overflow
    target.style.maxHeight = 'none'
    target.style.overflow = 'visible'

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#faf6f1',
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
      imageTimeout: 15000,
      logging: false,
    })

    target.style.maxHeight = originalMaxHeight
    target.style.overflow = originalOverflow

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    const margin = 10
    const contentWidth = pdfWidth - margin * 2
    const imgHeight = (canvas.height * contentWidth) / canvas.width
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    let heightLeft = imgHeight
    let position = margin
    
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
    heightLeft -= (pdfHeight - margin * 2)
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
      heightLeft -= (pdfHeight - margin * 2)
    }
    
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

// 兜底头像 dataURL
const defaultSvgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F5EEE4" rx="60"/><circle cx="60" cy="52" r="22" fill="#DCD0BF"/><path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/></svg>`
const fallbackAvatarSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(defaultSvgStr)))

// 处理最终展示头像
const displayAvatarSrc = computed(async () => {
  if (avatarLoadError.value || !props.petAvatarUrl) {
    return fallbackAvatarSrc
  }
  try {
    return await convertUrlToBase64(props.petAvatarUrl)
  } catch {
    return fallbackAvatarSrc
  }
})

// 同步响应式头像src
const finalAvatar = ref(fallbackAvatarSrc)
watch([()=>props.petAvatarUrl, avatarLoadError], async ()=>{
  finalAvatar.value = await displayAvatarSrc.value
},{immediate:true})

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
          <div class="memoir-avatar-wrap">
            <img
              class="memoir-avatar"
              :src="finalAvatar"
              alt="avatar"
              crossorigin="anonymous"
              @error="avatarLoadError = true"
            />
          </div>
          <h2 class="memoir-title">{{ petName }}'s Memoir</h2>
          <p class="memoir-date" v-if="currentPrintTime">{{ currentPrintTime }}</p>
        </header>
        
        <div v-if="loading" class="memoir-loading">
          <van-loading type="spinner" color="#E8A87C" size="32" />
          <p>{{ t('memoir_generating') || '正在翻阅回忆...' }}</p>
        </div>
        
        <div v-else class="memoir-body">
          <!-- 👇 修复：完全展示 AI 的多语言内容，前端不再硬塞中文落款 -->
          <p style="white-space: pre-wrap;">{{ memoirText }}</p>
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

.memoir-avatar-wrap {
  width: 80px;
  height: 80px;
  margin-bottom: @sp-3;
}

.memoir-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
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
  font-size: 15px;
  line-height: 2.0;
  color: @ink-1;
  font-family: @font-serif;
  text-align: justify;
  word-break: break-word;
}

/* 👇 已经移除原有的 .memoir-signoff 样式 */

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