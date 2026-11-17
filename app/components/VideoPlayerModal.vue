<!-- app/components/VideoPlayerModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { parseSlugFromParam, getPetUrl } from "~/utils/petUrl";

interface Props {
  modelValue: boolean
  videoUrl: string
  aspectRatio: string
  petName?: string 
  videoId?: number
  videoStatus?: number // 2=正常, 4=隐藏, 5=封禁
  isOwner?: boolean
  // 👇 新增：用于判断当前用户是否是主人
  petOwnerId?: number 
  // 👇 新增：用于非主人点击头像时跳转
  petSlug?: string 
  petAvatarUrl?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'download'): void 
  (e: 'refresh'): void 
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// 获取当前全局登录用户
const me = useState<any>("auth:user", () => null)

// 计算当前用户是否是该宠物的主人（如果父组件没传，这里作为兜底）
const actualIsOwner = computed(() => {
  if (props.isOwner !== undefined) return props.isOwner
  if (!me.value || !props.petOwnerId) return false
  return me.value.id === props.petOwnerId
})

function handleDownload() {
  emit('download')
}

// 👇 隐藏操作逻辑
const operating = ref(false)
const { $api } = useNuxtApp()
const route = useRoute()

const slug = computed(() => {
  if (route.path.includes('/pets/')) {
    return parseSlugFromParam(String(route.params.id || ""))
  }
  return props.petSlug || "" // 首页兜底使用传入的 slug
})

async function toggleVisibility() {
  if (!slug.value || !props.videoId || !actualIsOwner.value || operating.value) return
  
  operating.value = true
  try {
    const isHidden = props.videoStatus === 4
    await $api(`/api/pets/${slug.value}/videos/${props.videoId}/visibility`, {
      method: 'PATCH',
      body: { hidden: !isHidden }
    })
    showToast({ type: 'success', message: isHidden ? t('video_unhidden_success') : t('video_hidden_success') })
    visible.value = false
    emit('refresh')
  } catch (err: any) {
    showToast(err?.data?.error || t('operation_failed'))
  } finally {
    operating.value = false
  }
}

// 👇 非主人点击跳转
const router = useRouter()
function goToPetPage() {
  if (!slug.value) return
  const url = getPetUrl({ name: props.petName || "", slug: slug.value })
  visible.value = false
  router.push(url)
}

// 兜底头像
const defaultPetAvatar = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F5EEE4"/><circle cx="60" cy="52" r="22" fill="#DCD0BF"/><path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/></svg>`
)
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
        <!-- 主人：显示隐藏和保存视频 -->
        <template v-if="actualIsOwner">
          <button
            v-if="slug && videoStatus !== 5"
            class="btn btn--lg"
            :disabled="operating"
            @click="toggleVisibility"
          >
            <van-icon :name="videoStatus === 4 ? 'eye-o' : 'closed-eye'" />
            <span>{{ videoStatus === 4 ? t('video_unhide') : t('video_hide') }}</span>
          </button>

          <button class="btn btn--primary btn--lg download-btn" @click="handleDownload">
            <van-icon name="down" />
            <span>{{ t('video_save') }}</span>
          </button>
        </template>

        <!-- 非主人：显示宠物头像和“去主页”按钮 -->
        <template v-else>
          <button class="btn btn--lg guest-action-btn" @click="goToPetPage">
            <img 
              class="guest-avatar" 
              :src="petAvatarUrl || defaultPetAvatar" 
              alt="avatar" 
            />
            <span>{{ t('go_to_pet_home', { name: petName || t('go_to_pet_home_default') }) }}</span>
          </button>
        </template>
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

/* 👇 新增：非主人操作按钮样式 */
.guest-action-btn {
  max-width: 280px !important;
  background: #fff;
  color: @ink-1;
  border: 1px solid @border;
  display: flex;
  align-items: center;
  justify-content: center;

  .guest-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }

  &:hover {
    background: @surface-2;
  }
}
</style>