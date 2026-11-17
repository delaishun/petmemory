<!-- app/components/VideoPlayerModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { parseSlugFromParam } from "~/utils/petUrl";

interface Props {
  modelValue: boolean
  videoUrl: string
  aspectRatio: string
  petName?: string 
  videoId?: number
  videoStatus?: number // 2=正常, 4=隐藏, 5=封禁
  isOwner?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void 
  (e: 'refresh'): void 
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function handleDownload() {
  emit('download')
}

// 👇 新增隐藏操作逻辑
const operating = ref(false)
const { $api } = useNuxtApp()
const route = useRoute()

// 👇 修改点 1：只有当前路由是 /pets/xxx 时，才去解析 slug
const slug = computed(() => {
  if (route.path.includes('/pets/')) {
    return parseSlugFromParam(String(route.params.id || ""))
  }
  return ""
})

async function toggleVisibility() {
  // 👇 修改点 2：如果没有 slug（说明在首页），或者没有视频 id、不是主人，就不执行
  if (!slug.value || !props.videoId || !props.isOwner || operating.value) return
  
  operating.value = true
  try {
    const isHidden = props.videoStatus === 4
    await $api(`/api/pets/${slug.value}/videos/${props.videoId}/visibility`, {
      method: 'PATCH',
      body: { hidden: !isHidden }
    })
    showToast({ type: 'success', message: isHidden ? '已取消隐藏' : '已隐藏' })
    visible.value = false // 关闭弹窗
    emit('refresh') // 通知父页面重新拉取数据
  } catch (err: any) {
    showToast(err?.data?.error || '操作失败')
  } finally {
    operating.value = false
  }
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
        <!-- 👇 新增隐藏按钮：加上 slug 判断，首页时自动隐藏 -->
        <button
          v-if="slug && isOwner && videoStatus !== 5"
          class="btn btn--lg"
          :disabled="operating"
          @click="toggleVisibility"
        >
          <van-icon :name="videoStatus === 4 ? 'eye-o' : 'closed-eye'" />
          <span>{{ videoStatus === 4 ? '取消隐藏' : '隐藏' }}</span>
        </button>

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
  gap: @sp-3;

  .btn {
    flex: 1;
    max-width: 200px;
    gap: @sp-2;
  }

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