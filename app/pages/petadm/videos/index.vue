<!-- app/pages/petadm/videos/index.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
const { $api } = useNuxtApp()

const searchSlug = ref('')
const loading = ref(false)
const videos = ref<any[]>([])

async function handleSearch() {
  if (!searchSlug.value.trim()) return
  loading.value = true
  videos.value = []
  try {
    // 👇 修改点 1：搜索接口路径
    videos.value = await $api(`/api/pets/admin/videos/search?slug=${searchSlug.value.trim()}`)
  } catch (err: any) {
    showToast(err?.data?.error || '搜索失败')
  } finally {
    loading.value = false
  }
}

async function toggleStatus(video: any) {
  const newStatus = video.status === 5 ? 2 : 5 // 5=封禁, 2=解封恢复
  try {
    // 👇 修改点 2：封禁/解封接口路径
    await $api(`/api/pets/admin/videos/${video.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    video.status = newStatus
    showToast({ type: 'success', message: newStatus === 5 ? '已封禁' : '已解封' })
  } catch (err: any) {
    showToast(err?.data?.error || '操作失败')
  }
}
</script>

<template>
  <div class="admin-videos">
    <div class="search-bar">
      <input v-model="searchSlug" placeholder="输入宠物 Slug (如 hason_tMb-KezX)" @keyup.enter="handleSearch" />
      <button class="btn btn--primary" @click="handleSearch">搜索</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="videos.length > 0" class="video-grid">
      <div v-for="video in videos" :key="video.id" class="video-card">
        <img :src="`${video.videoUrl}?x-oss-process=video/snapshot,t_1000,f_jpg,w_400`" />
        <div class="video-info">
          <span>ID: {{ video.id }}</span>
          <span class="status" :class="`status-${video.status}`">
            {{ video.status === 2 ? '正常' : video.status === 4 ? '已隐藏' : '已封禁' }}
          </span>
        </div>
        <button 
          class="btn btn--sm" 
          :class="video.status === 5 ? 'btn--primary' : 'btn--danger'"
          @click="toggleStatus(video)"
        >
          {{ video.status === 5 ? '解封' : '封禁' }}
        </button>
      </div>
    </div>

    <div v-else-if="searchSlug && !loading" class="empty">
      该宠物暂无视频
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.admin-videos {
  padding: @sp-5;
}
.search-bar {
  display: flex;
  gap: @sp-3;
  margin-bottom: @sp-5;
  
  input {
    flex: 1;
    padding: 0 @sp-3;
    height: 40px;
    border: 1px solid @border;
    border-radius: @radius;
  }
}
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: @sp-4;
}
.video-card {
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius;
  padding: @sp-3;
  display: flex;
  flex-direction: column;
  gap: @sp-2;

  img {
    width: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
    border-radius: @radius-sm;
  }
}
.video-info {
  display: flex;
  justify-content: space-between;
  font-size: @fs-xs;
  color: @ink-2;
}
.status {
  font-weight: bold;
  &.status-2 { color: @success; }
  &.status-4 { color: @warning; }
  &.status-5 { color: @danger; }
}
.btn--danger {
  background: @danger;
  color: #fff;
}
</style>