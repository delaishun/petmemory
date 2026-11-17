<!-- app/components/GenerateVideoModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import { uploadToOss, buildFilename } from '~/utils/upload'

const { t } = useI18n()
const { $api } = useNuxtApp()

// ============================================================
// Props & Emits
// ============================================================
interface Photo {
  id: number
  imageUrl: string
}

interface Props {
  modelValue: boolean
  slug: string
  petName: string
  avatarUrl: string
  photos: Photo[]
  userVnum?: number
  resumeData?: { id: number, tempUrl: string, aspectRatio: string } | null // 👈 新增
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ============================================================
// 数据与配置
// ============================================================
// 背景配置（6种）
const BACKGROUNDS = [
  { code: 'heaven', name: '天堂' },
  { code: 'grass', name: '草原' },
  { code: 'flower', name: '花海' },
  { code: 'house', name: '木屋' },
  { code: 'snow', name: '雪地' },
  { code: 'beach', name: '沙滩' }
]

// 动作配置（10种，对应后端 wan-video.ts 中的 ACTION_PROMPTS）
const ACTIONS = [
  { id: 'joyful_sweet', name: '😊 开心亲昵' },
  { id: 'joyful_run', name: '🏃 欢快奔跑' },
  { id: 'playful_hop', name: '✨ 俏皮跳跃' },
  { id: 'gentle_petting', name: '🤍 温柔抚摸' },
  { id: 'tender_gaze', name: '🥺 温柔凝视' },
  { id: 'sweet_nap', name: '😴 安心小憩' },
  { id: 'friendly_wave', name: '👋 举爪问好' },
  { id: 'happy_spin', name: '🎈 开心转圈' },
  { id: 'loving_glance', name: '✨ 回头思念' },
  { id: 'basking_sun', name: '☀️ 沐浴阳光' }
]

const RATIOS = [
  { value: '9:16', label: '竖版 9:16' },
  { value: '1:1', label: '方形 1:1' },
  { value: '16:9', label: '横版 16:9' }
]

// ============================================================
// 状态
// ============================================================
// 可选的图片列表（相册在前，头像在后）
const photoList = computed(() => {
  const list: { id: string | number; imageUrl: string }[] = []
  if (props.photos && props.photos.length > 0) {
    props.photos.forEach(p => list.push({ id: p.id, imageUrl: p.imageUrl }))
  }
  return list
})

const selectedImage = ref<string>('')
const selectedBg = ref<string>('')
const selectedAction = ref<string>(ACTIONS[0]?.id || 'joyful_sweet')
const selectedRatio = ref<string>('9:16')

// 流程状态
const step = ref<'config' | 'generating' | 'preview'>('config')
const videoId = ref<number | null>(null)
const tempVideoUrl = ref<string>('')
const saving = ref(false)
let pollTimer: any = null

// 初始化默认选项
watch(visible, (open) => {
  if (open) {
    if (props.resumeData) {
      // 👈 如果有恢复数据，直接跳到预览步骤
      videoId.value = props.resumeData.id
      tempVideoUrl.value = props.resumeData.tempUrl
      selectedRatio.value = props.resumeData.aspectRatio
      step.value = 'preview'
      return
    }

    // 正常初始化
    selectedImage.value = photoList.value[0]?.imageUrl || ''
    const randomIdx = Math.floor(Math.random() * BACKGROUNDS.length)
    selectedBg.value = BACKGROUNDS[randomIdx]?.code || 'heaven'
    selectedAction.value = ACTIONS[0]?.id || 'joyful_sweet'
    selectedRatio.value = '9:16'
    step.value = 'config'
    videoId.value = null
    tempVideoUrl.value = ''
    saving.value = false
    stopPolling()
  } else {
    stopPolling()
  }
})

// ============================================================
// 轮询逻辑
// ============================================================
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling(id: number) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const res = await $api<{ status: number; tempUrl?: string; errorMsg?: string }>(
        `/api/pets/${props.slug}/videos/${id}/status`
      )
      
      if (res.status === 1 && res.tempUrl) {
        // 生成成功
        stopPolling()
        tempVideoUrl.value = res.tempUrl
        step.value = 'preview'
      } else if (res.status === 3) {
        // 生成失败
        stopPolling()
        showToast({ type: 'fail', message: res.errorMsg || '视频生成失败' })
        visible.value = false
      }
      // status === 0 继续等待
    } catch (err: any) {
      stopPolling()
      showToast({ type: 'fail', message: err?.data?.error || '查询进度失败' })
      visible.value = false
    }
  }, 3000) // 每 3 秒查一次
}

// ============================================================
// 提交生成请求
// ============================================================
async function handleGenerate() {
  if (!selectedImage.value || !selectedBg.value || !selectedAction.value) {
    showToast('请完善生成选项')
    return
  }

  step.value = 'generating'

  try {
    const res = await $api<{ videoId: number; taskId: string }>(
      `/api/pets/${props.slug}/videos`,
      {
        method: 'POST',
        body: {
          imageUrl: selectedImage.value,
          bgCode: selectedBg.value,
          actionId: selectedAction.value,
          ratio: selectedRatio.value
        }
      }
    )
    videoId.value = res.videoId
    startPolling(res.videoId)
  } catch (err: any) {
    step.value = 'config'
    showToast({ type: 'fail', message: err?.data?.error || '提交生成任务失败' })
  }
}

// ============================================================
// 保存逻辑：前端下载临时视频 → 上传 OSS → 通知后端更新
// ============================================================
async function handleSave() {
  if (!tempVideoUrl.value || !videoId.value || saving.value) return
  saving.value = true

  const loadingToast = showToast({
    type: 'loading',
    message: '正在保存视频到云端...',
    duration: 0,
    forbidClick: true
  })

  try {
    // 1. 下载千问的临时视频
    const response = await fetch(tempVideoUrl.value)
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()

    // 2. 上传到 OSS (假设你已经在 utils/upload.ts 里支持了 mp4)
    const filename = buildFilename('mp4')
    const { url } = await uploadToOss(blob, filename, { fdir: 'pet_videos' })

    // 3. 通知后端保存永久地址
    await $api(`/api/pets/${props.slug}/videos/${videoId.value}`, {
      method: 'PATCH',
      body: { videoUrl: url }
    })

    loadingToast.close()
    showToast({ type: 'success', message: '保存成功！' })
    emit('success')
    visible.value = false
  } catch (err) {
    loadingToast.close()
    console.error('自动保存失败:', err)
    
    // ⚠️ 降级方案：如果因为 CORS 跨域失败，弹窗提示用户手动下载
    showDialog({
      title: '无法自动保存',
      message: '服务器受限，请点击下方按钮手动下载视频，稍后再联系我们帮您上传。',
      showCancelButton: true,
      confirmButtonText: '手动下载',
      cancelButtonText: '取消'
    }).then(() => {
      const a = document.createElement('a')
      a.href = tempVideoUrl.value
      a.download = `${props.petName}-memory.mp4`
      a.target = '_blank'
      a.click()
    })
  } finally {
    saving.value = false
  }
}

async function handleAbandon() {
  if (!videoId.value) {
    visible.value = false
    return
  }
  try {
    await $api(`/api/pets/${props.slug}/videos/${videoId.value}`, {
      method: 'PATCH',
      body: { abandon: true }
    })
  } catch (err) {
    console.warn('标记废弃失败', err)
  }
  emit('success') // 👈 通知父组件刷新并清空数据
  visible.value = false
}

// 暴露给模板使用
const bgImgUrl = (code: string) => `https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/bg_${code}.jpg`

onBeforeUnmount(() => stopPolling())
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '92vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    teleport="body"
    :close-on-click-overlay="step === 'config' && !saving"
  >
    <div class="video-modal">
      <!-- 顶部 -->
      <header class="video-modal__header">
        <h2 class="video-modal__title">Living Memories</h2>
        <p class="video-modal__subtitle">生成专属动态回忆 (剩余 {{ userVnum }} 次)</p>
      </header>

      <!-- 表单配置区 -->
      <div v-if="step === 'config'" class="video-modal__body">
        <!-- 1. 选照片 -->
        <div class="section">
          <h3 class="section__title">1. 选择参考照片</h3>
          <div class="photo-list">
            <div
              v-for="p in photoList"
              :key="p.id"
              class="photo-item"
              :class="{ 'is-selected': selectedImage === p.imageUrl }"
              @click="selectedImage = p.imageUrl"
            >
              <OssImg :src="p.imageUrl" :width="80" :height="80" aspect-ratio="1/1" />
            </div>
          </div>
        </div>

        <!-- 2. 选背景 -->
        <div class="section">
          <h3 class="section__title">2. 选择背景</h3>
          <div class="bg-grid">
            <div
              v-for="bg in BACKGROUNDS"
              :key="bg.code"
              class="bg-item"
              :class="{ 'is-selected': selectedBg === bg.code }"
              @click="selectedBg = bg.code"
            >
              <OssImg :src="bgImgUrl(bg.code)" :width="120" :height="80" aspect-ratio="3/2" />
              <span class="bg-name">{{ bg.name }}</span>
            </div>
          </div>
        </div>

        <!-- 3. 选动作 -->
        <div class="section">
          <h3 class="section__title">3. 选择动作</h3>
          <select v-model="selectedAction" class="action-select">
            <option v-for="act in ACTIONS" :key="act.id" :value="act.id">
              {{ act.name }}
            </option>
          </select>
        </div>

        <!-- 4. 选比例 -->
        <div class="section">
          <h3 class="section__title">4. 视频比例</h3>
          <div class="ratio-group">
            <button
              v-for="r in RATIOS"
              :key="r.value"
              type="button"
              class="ratio-btn"
              :class="{ 'is-active': selectedRatio === r.value }"
              @click="selectedRatio = r.value"
            >
              {{ r.label }}
            </button>
          </div>
        </div>

        <button class="btn btn--primary btn--lg generate-btn" @click="handleGenerate">
          开始生成（消耗 1 次额度）
        </button>
      </div>

      <!-- 生成中状态 -->
      <div v-else-if="step === 'generating'" class="video-modal__status">
        <van-loading type="spinner" color="#E8A87C" size="40" />
        <h3>正在生成视频，请等待...</h3>
        <p>AI 正在努力绘画和制作动画，大约需要 1~3 分钟，请不要关闭此窗口。</p>
      </div>

      <!-- 预览与保存状态 -->
      <div v-else-if="step === 'preview'" class="video-modal__preview">
        <video
          :src="tempVideoUrl"
          controls
          autoplay
          loop
          playsinline
          class="preview-player"
          :style="{ aspectRatio: selectedRatio.replace(':', '/') }"
        ></video>
        <div class="preview-actions">
          <button class="btn btn--lg" :disabled="saving" @click="handleAbandon">放弃</button>
          <button class="btn btn--primary btn--lg" :disabled="saving" @click="handleSave">
            {{ saving ? '保存中...' : '保存到回忆' }}
          </button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.video-modal {
  display: flex;
  flex-direction: column;
  padding: @sp-5;
  max-height: 92vh;

  &__header {
    text-align: center;
    margin-bottom: @sp-4;
    flex-shrink: 0;
  }
  &__title {
    margin: 0;
    font-family: @font-serif;
    font-size: @fs-xl;
    color: @ink-1;
  }
  &__subtitle {
    margin: 4px 0 0;
    font-size: @fs-xs;
    color: @ink-3;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding-bottom: @sp-4;
  }

  &__status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: @sp-8 @sp-5;
    text-align: center;
    
    h3 { margin: @sp-4 0 @sp-2; color: @ink-1; font-size: @fs-lg; }
    p { margin: 0; color: @ink-2; font-size: @fs-sm; line-height: 1.5; }
  }

  &__preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-4;
  }
}

.section {
  margin-bottom: @sp-5;
  &__title {
    font-size: @fs-sm;
    font-weight: 600;
    color: @ink-1;
    margin: 0 0 @sp-2;
  }
}

// 图片选择
.photo-list {
  display: flex;
  gap: @sp-2;
  overflow-x: auto;
  padding-bottom: 4px;
}

.photo-item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: @radius-sm;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color @dur-fast;
  
  &.is-selected { border-color: @accent; }

  .avatar-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .photo-label {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.5);
    color: #fff;
    font-size: 10px;
    text-align: center;
    padding: 2px 0;
  }
}

// 背景选择
.bg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: @sp-2;
}

.bg-item {
  position: relative;
  border-radius: @radius-sm;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color @dur-fast;

  &.is-selected { border-color: @accent; }

  .bg-name {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.5);
    color: #fff;
    font-size: 12px;
    text-align: center;
    padding: 2px 0;
  }
}

// 动作下拉框
.action-select {
  width: 100%;
  padding: 10px 12px;
  font-size: @fs-base;
  border: 1px solid @border;
  border-radius: @radius;
  background: @surface;
  color: @ink-1;
  outline: none;
  &:focus { border-color: @accent; }
}

// 比例选择
.ratio-group {
  display: flex;
  gap: @sp-2;
}

.ratio-btn {
  flex: 1;
  padding: 8px 0;
  font-size: @fs-sm;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius;
  cursor: pointer;
  transition: all @dur-fast;

  &.is-active {
    background: @accent-soft;
    border-color: @accent;
    color: @accent;
    font-weight: 600;
  }
}

.generate-btn {
  width: 100%;
  margin-top: @sp-4;
}

// 播放器
.preview-player {
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  background: #000;
  border-radius: @radius-lg;
}

.preview-actions {
  display: flex;
  gap: @sp-3;
  width: 100%;
  .btn { flex: 1; }
}
</style>