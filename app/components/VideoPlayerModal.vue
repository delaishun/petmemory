<!-- app/components/VideoPlayerModal.vue -->
<script setup lang="ts">
interface Props {
  modelValue: boolean
  videoUrl: string
  aspectRatio: string
  petName: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// 触发浏览器强制下载
function handleDownload() {
  if (!props.videoUrl) return
  const separator = props.videoUrl.includes('?') ? '&' : '?'
  const downloadUrl = `${props.videoUrl}${separator}response-content-disposition=attachment;filename="${encodeURIComponent(props.petName)}-memory.mp4"`
  
  const link = document.createElement('a')
  link.href = downloadUrl
  link.target = '_blank'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0', background: 'transparent' }"
    teleport="body"
    :close-on-click-overlay="true"
  >
    <div class="video-player-modal">
      <!-- 顶部关闭按钮 -->
      <div class="modal-header">
        <button class="close-btn" @click="visible = false">
          <van-icon name="cross" />
        </button>
      </div>

      <!-- 播放器区域 -->
      <div class="player-wrapper">
        <video
          v-if="visible"
          :src="videoUrl"
          controls
          autoplay
          playsinline
          class="native-video"
          :style="{ aspectRatio: aspectRatio.replace(':', '/') }"
        ></video>
      </div>

      <!-- 底部操作区 -->
      <div class="modal-footer">
        <button class="btn btn--primary btn--lg download-btn" @click="handleDownload">
          <van-icon name="down" />
          <span>保存视频</span>
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.video-player-modal {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.9);
  border-radius: @radius-xl @radius-xl 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.modal-header {
  display: flex;
  justify-content: flex-end;
  padding: @sp-3;
  
  .close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: none;
    border-radius: 50%;
    cursor: pointer;

    :deep(.van-icon) {
      font-size: 20px;
    }
  }
}

.player-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0 @sp-3;

  .native-video {
    max-width: 100%;
    max-height: 65vh;
    border-radius: @radius;
    outline: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
}

.modal-footer {
  padding: @sp-5 @sp-5 @sp-6;
  display: flex;
  justify-content: center;

  .download-btn {
    width: 100%;
    max-width: 280px;
    gap: @sp-2;
    
    :deep(.van-icon) {
      font-size: 18px;
    }
  }
}
</style>