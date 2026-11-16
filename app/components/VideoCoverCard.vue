<!-- app/components/VideoCoverCard.vue -->
<script setup lang="ts">
// 👇 检查这里：绝对不能有 modelValue！
interface Props {
  videoUrl: string
  aspectRatio: string
  petName: string
  customCoverUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'play', url: string): void
  (e: 'download'): void 
}>()

const posterUrl = computed(() => {
  if (props.customCoverUrl) return props.customCoverUrl
  if (!props.videoUrl) return ''
  const separator = props.videoUrl.includes('?') ? '&' : '?'
  return `${props.videoUrl}${separator}x-oss-process=video/snapshot,t_1000,f_jpg,w_720`
})

function onDownload(e: Event) {
  e.stopPropagation()
  emit('download')
}
</script>

<template>
  <div class="video-cover-card" @click="emit('play', videoUrl)">
    <img 
      :src="posterUrl" 
      class="cover-img" 
      loading="lazy"
    />
    
    <div class="play-overlay">
      <div class="play-icon">
        <van-icon name="play" />
      </div>
    </div>

    <button 
      type="button" 
      class="download-btn"
      @click="onDownload"
      title="下载视频"
    >
      <van-icon name="down" />
    </button>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.video-cover-card {
  position: relative;
  border-radius: @radius-lg;
  overflow: hidden;
  background: #000;
  cursor: pointer;
  box-shadow: @shadow-1;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease;
  aspect-ratio: 1 / 1;
  width: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: @shadow-2;

    .play-icon {
      transform: scale(1.1);
      background: fade(@accent, 90%);
    }
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover; 
    object-position: center; 
    display: block;
    background-color: @surface-2; 
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
  }

  .play-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    color: #fff;
    backdrop-filter: blur(4px);
    transition: all @dur-fast ease;

    :deep(.van-icon) {
      font-size: 20px;
      margin-left: 4px;
    }
  }

  .download-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: all @dur-fast ease;

    &:hover {
      background: @accent;
      border-color: @accent;
    }

    :deep(.van-icon) {
      font-size: 14px;
    }
  }
}
</style>