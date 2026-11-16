<!-- app/pages/videos/index.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'
import type { AuthUser } from '~/types/auth'
import VideoCoverCard from '~/components/VideoCoverCard.vue'
import VideoPlayerModal from '~/components/VideoPlayerModal.vue'

const { t } = useI18n()
const { $api } = useNuxtApp()
const me = useState<AuthUser | null>("auth:user", () => null)

const PAGE_SIZE = 20

interface VideoItem {
  id: number
  videoUrl: string
  aspectRatio: string
  createdAt: string
  pet: {
    name: string
    slug: string
    ownerId: number
  }
}

interface VideoListResponse {
  items: VideoItem[]
  total: number
}

// ============================================================
// 数据获取与分页逻辑
// ============================================================
const { data: firstPage, pending, error: fetchError } = await useAsyncData<VideoListResponse>(
  'videos:list:first',
  () => $api<VideoListResponse>(`/api/videos?limit=${PAGE_SIZE}&offset=0`)
)

const extraVideos = ref<VideoItem[]>([])
const extraTotal = ref(0)

const videos = computed(() => {
  const firstItems = firstPage.value?.items || []
  return [...firstItems, ...extraVideos.value]
})

const total = computed(() => {
  return extraTotal.value || firstPage.value?.total || 0
})

const hasMore = computed(() => videos.value.length < total.value)

const loadingMore = ref(false)
const loadMoreError = ref('')

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  loadMoreError.value = ''

  try {
    const res = await $api<VideoListResponse>(
      `/api/videos?limit=${PAGE_SIZE}&offset=${videos.value.length}`
    )
    extraVideos.value = [...extraVideos.value, ...res.items]
    extraTotal.value = res.total
  } catch (err: any) {
    loadMoreError.value = err?.data?.error || '加载失败，请稍后重试'
  } finally {
    loadingMore.value = false
  }
}

// ============================================================
// 播放与下载控制
// ============================================================
const activeVideoModal = ref(false)
const activeVideo = ref<VideoItem | null>(null)

function handlePlayVideo(video: VideoItem) {
  activeVideo.value = video
  activeVideoModal.value = true
}

function handleDownloadClick(video: VideoItem) {
  if (!me.value) {
    showToast('请先登录')
    return
  }
  if (me.value.id !== video.pet.ownerId) {
    showToast('仅宠物主人可下载该视频')
    return
  }
  downloadVideoFile(video.videoUrl, video.pet.name)
}

async function downloadVideoFile(url: string, petName: string) {
  const loadingToast = showToast({
    type: 'loading',
    message: '正在下载，请稍候...',
    duration: 0,
    forbidClick: true,
  })

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('网络请求失败')
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${petName}-memory.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
    loadingToast.close()
    showToast({ type: 'success', message: '下载成功' })
  } catch (err) {
    console.error('下载失败:', err)
    loadingToast.close()
    showToast('下载失败，请检查网络或 OSS 跨域配置')
  }
}

// ============================================================
// SEO
// ============================================================
useSeoMeta({
  title: 'Living Memories - PetMemory',
  description: 'Browse all dynamic pet memorial videos on PetMemory.',
})
</script>

<template>
  <div class="pets-page">
    <div class="container">
      <!-- 页头 -->
      <header class="pets-header">
        <h1 class="pets-header__title serif">Living Memories</h1>
        <p class="pets-header__subtitle">
          <template v-if="!pending && total > 0">
            共 <strong>{{ total }}</strong> 个动态回忆
          </template>
          <template v-else-if="!pending">
            暂无动态回忆
          </template>
          <template v-else>&nbsp;</template>
        </p>
      </header>

      <!-- 加载失败（首屏） -->
      <div v-if="fetchError" class="empty">
        <p class="empty__title">加载失败</p>
        <p class="empty__desc">请稍后刷新重试</p>
      </div>

      <!-- 首屏骨架屏 -->
      <div v-else-if="pending" class="video-grid">
        <div v-for="i in 4" :key="i" class="skeleton video-card-skeleton" />
      </div>

      <!-- 空状态 -->
      <div v-else-if="videos.length === 0" class="empty">
        <p class="empty__title">还没有任何动态回忆</p>
        <p class="empty__desc">前往宠物主页生成第一个视频吧</p>
        <NuxtLink to="/" class="btn btn--primary mt-4">回到首页</NuxtLink>
      </div>

      <!-- 视频网格 -->
      <template v-else>
        <div class="video-grid">
          <VideoCoverCard
            v-for="video in videos"
            :key="video.id"
            :video-url="video.videoUrl"
            :aspect-ratio="video.aspectRatio"
            :pet-name="video.pet.name"
            @play="handlePlayVideo(video)"
            @download="() => handleDownloadClick(video)"
          />
        </div>

        <!-- 加载更多 -->
        <div class="pets-more">
          <template v-if="hasMore">
            <button
              type="button"
              class="btn btn--lg"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </button>
            <p v-if="loadMoreError" class="pets-more__error">
              {{ loadMoreError }}
            </p>
          </template>

          <p v-else class="pets-more__end">已经到底啦</p>
        </div>
      </template>
    </div>

    <!-- 视频播放弹窗 -->
    <VideoPlayerModal
      v-if="activeVideo"
      v-model="activeVideoModal"
      :video-url="activeVideo.videoUrl"
      :aspect-ratio="activeVideo.aspectRatio"
      :pet-name="activeVideo.pet.name"
      @download="() => handleDownloadClick(activeVideo!)"
    />
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.pets-page {
  padding-bottom: @sp-8;
}

.pets-header {
  text-align: center;
  padding: @sp-7 @sp-4 @sp-5;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4 @sp-4;
  }

  &__title {
    margin: 0;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
    letter-spacing: .04em;
  }

  &__subtitle {
    margin: @sp-3 0 0;
    font-size: @fs-sm;
    color: @ink-3;
    line-height: @lh-base;

    strong {
      color: @accent;
      font-weight: 700;
      margin: 0 2px;
    }
  }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: @sp-4;

  @media (max-width: @bp-sm) {
    grid-template-columns: repeat(2, 1fr);
    gap: @sp-3;
  }
}

.video-card-skeleton {
  aspect-ratio: 1 / 1;
  border-radius: @radius-lg;
  width: 100%;
}

.pets-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-3;
  margin-top: @sp-7;
  padding-top: @sp-5;

  &__error {
    margin: 0;
    font-size: @fs-sm;
    color: @danger;
  }

  &__end {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
    letter-spacing: .04em;

    &::before,
    &::after {
      content: '·';
      padding: 0 @sp-2;
      color: @border-strong;
    }
  }
}
</style>