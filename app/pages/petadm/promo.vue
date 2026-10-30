<!-- app/pages/petadm/promo.vue -->
<script setup lang="ts">
import { showToast } from 'vant'

const { $api } = useNuxtApp()

const form = reactive({
  imageUrl: '',
  petName: '',
  ownerName: '',
  message: '',
  dialogue: '',
})

// 图片状态
const generating = ref(false)
const resultImage = ref('')

// 短文状态
const essayGenerating = ref(false)
const resultEssay = ref('')

// --- 图片生成逻辑 ---
async function handleGenerate() {
  if (!form.imageUrl) return showToast('请填写图片地址')
  if (!form.petName) return showToast('请填写宠物名')
  if (!form.message && !form.dialogue) return showToast('留言和对话至少填一项')

  generating.value = true
  resultImage.value = ''

  try {
    const res = await $api<{ ok: boolean; imageUrl: string }>('/api/pets/admin/promo/generate', {
      method: 'POST',
      body: form,
    })
    resultImage.value = res.imageUrl
    showToast({ type: 'success', message: '图片生成成功' })
  } catch (err: any) {
    showToast(err.data?.error || '生成失败')
  } finally {
    generating.value = false
  }
}

async function downloadImage() {
  if (!resultImage.value) return
  try {
    const response = await fetch(resultImage.value)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = `promo_${form.petName}_${new Date().getTime()}.webp`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (err) {
    window.open(resultImage.value, '_blank')
  }
}

// --- 短文生成逻辑 ---
async function handleGenerateEssay() {
  if (!form.petName) return showToast('请填写宠物名')
  if (!form.message && !form.dialogue) return showToast('留言和对话至少填一项')

  essayGenerating.value = true
  resultEssay.value = ''

  try {
    const res = await $api<{ ok: boolean; essay: string }>('/api/pets/admin/promo/essay', {
      method: 'POST',
      body: form,
    })
    resultEssay.value = res.essay
    showToast({ type: 'success', message: '短文生成成功' })
  } catch (err: any) {
    showToast(err.data?.error || '短文生成失败')
  } finally {
    essayGenerating.value = false
  }
}

async function copyEssay() {
  if (!resultEssay.value) return
  try {
    await navigator.clipboard.writeText(resultEssay.value)
    showToast({ type: 'success', message: '短文已复制到剪贴板' })
  } catch {
    showToast('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <div class="promo-page">
    <h1 class="page-title">推广物料生成</h1>
    
    <div class="form-card">
      <div class="form-group">
        <label>图片地址 A <span class="required">*</span></label>
        <input v-model="form.imageUrl" type="text" placeholder="输入公网可访问的宠物图片 URL" />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>宠物名 D <span class="required">*</span></label>
          <input v-model="form.petName" type="text" placeholder="宠物名字" />
        </div>
        <div class="form-group">
          <label>主人名 E</label>
          <input v-model="form.ownerName" type="text" placeholder="主人名字（选填）" />
        </div>
      </div>

      <div class="form-group">
        <label>留言 B</label>
        <textarea v-model="form.message" rows="3" placeholder="给宠物的留言（选填）"></textarea>
      </div>

      <div class="form-group">
        <label>对话 C</label>
        <textarea v-model="form.dialogue" rows="4" placeholder="主人与宠物的一轮或多轮对话（选填）"></textarea>
      </div>

      <!-- 操作按钮区 -->
      <div class="btn-group">
        <button class="btn btn--primary" :disabled="generating" @click="handleGenerate">
          {{ generating ? 'AI 正在描绘与排版...' : '✨ 生成推广图片' }}
        </button>
        <button class="btn btn--primary btn--outline" :disabled="essayGenerating" @click="handleGenerateEssay">
          {{ essayGenerating ? 'AI 正在撰写短文...' : '📝 生成英文短文' }}
        </button>
      </div>
    </div>

    <!-- 图片结果展示区 -->
    <div v-if="resultImage" class="result-card">
      <h2>图片生成结果</h2>
      <img :src="resultImage" alt="生成的推广图" />
      <div class="actions">
        <button class="btn" @click="downloadImage">下载图片</button>
      </div>
    </div>

    <!-- 短文结果展示区 -->
    <div v-if="resultEssay" class="result-card">
      <div class="essay-header">
        <h2>英文短文生成结果</h2>
        <button class="btn btn--sm" @click="copyEssay">一键复制</button>
      </div>
      <div class="essay-content">
        {{ resultEssay }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.promo-page {
  padding: @sp-6;
  max-width: 800px;
}

.page-title {
  margin-bottom: @sp-5;
  font-size: @fs-xl;
}

.form-card {
  background: @surface;
  border: 1px solid @border;
  padding: @sp-5;
  border-radius: @radius-lg;
  display: flex;
  flex-direction: column;
  gap: @sp-4;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: @sp-2;

  label {
    font-weight: 500;
    color: @ink-2;
  }
  
  .required {
    color: @danger;
  }

  input, textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid @border;
    border-radius: @radius;
    background: @surface-2;
    &:focus {
      outline: none;
      border-color: @accent;
    }
  }
}

.form-row {
  display: flex;
  gap: @sp-4;
  .form-group {
    flex: 1;
  }
}

.btn-group {
  display: flex;
  gap: @sp-3;
  margin-top: @sp-2;
  
  .btn {
    flex: 1;
  }
  
  .btn--outline {
    background: transparent;
    color: @accent;
    border: 1px solid @accent;
    &:hover {
      background: @accent-soft;
    }
  }
}

.result-card {
  margin-top: @sp-6;
  background: @surface;
  border: 1px solid @border;
  padding: @sp-4;
  border-radius: @radius-lg;
  text-align: center;

  h2 {
    font-size: @fs-lg;
    margin-bottom: @sp-3;
  }

  img {
    max-width: 100%;
    border-radius: @radius;
    box-shadow: @shadow-2;
  }
  
  .actions {
    margin-top: @sp-4;
  }
}

// 短文展示特定样式
.essay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: @sp-3;
  
  h2 {
    margin: 0;
  }
}

.essay-content {
  background: @surface-2;
  padding: @sp-4;
  border-radius: @radius;
  text-align: left;
  font-size: @fs-base;
  line-height: 1.6;
  color: @ink-2;
  white-space: pre-wrap; // 保留换行符
  border: 1px dashed @border;
}
</style>