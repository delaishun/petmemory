<!-- app/pages/articles/index.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 初始化与类型
// ============================================================
const { t } = useI18n()
const { $api } = useNuxtApp()

const PAGE_SIZE = 20

interface ArticleListItem {
  id: number
  slug: string
  title: string
  imageUrl: string
  createdAt: string
}

interface ArticleListResponse {
  items: ArticleListItem[]
  total: number
}

// ============================================================
// 数据获取
// ============================================================
// 初始获取第一页数据 (SSR)
const { data: initialData } = await useAsyncData<ArticleListResponse>(
  'articles:list:first',
  () => $api<ArticleListResponse>(`/api/articles?limit=${PAGE_SIZE}&offset=0`)
)

// 使用 ref 管理列表数据和总数
const items = ref<ArticleListItem[]>(initialData.value?.items ?? [])
const total = ref(initialData.value?.total ?? 0)

const loadingMore = ref(false)

// 是否还有更多数据
const hasMore = computed(() => items.value.length < total.value)

// 加载更多
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    const res = await $api<ArticleListResponse>(
      `/api/articles?limit=${PAGE_SIZE}&offset=${items.value.length}`
    )
    items.value.push(...res.items)
    total.value = res.total
  } catch (err: any) {
    // 可以在这里加一个 Toast 提示
    console.error('加载更多文章失败:', err)
  } finally {
    loadingMore.value = false
  }
}

// ============================================================
// 兜底图片
// ============================================================
const defaultArticleCover = 
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
       <rect width="800" height="450" fill="#F9F7F3"/>
       <path d="M400 225m-40 0a40 40 0 1 0 80 0a40 40 0 1 0 -80 0" fill="#E8E0D5"/>
       <path d="M330 310 C330 270 370 250 400 250 C430 250 470 270 470 310 Z" fill="#E8E0D5"/>
     </svg>`
  )

// ============================================================
// SEO
// ============================================================
useHead(() => ({
  title: `${t('articles_title')} · ${t('app_name')}`,
  meta: [
    {
      name: 'description',
      content: '关于爱、记忆与陪伴的宠物纪念文章。'
    }
  ]
}))
</script>

<template>
  <div class="page container section articles-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <h1 class="page-title">{{ t('articles_title') }}</h1>
      <p class="page-desc">关于爱、记忆与陪伴的故事。</p>
    </header>

    <!-- 空状态 -->
    <div v-if="items.length === 0" class="empty-state">
      <van-icon name="notes-o" size="48" class="empty-icon" />
      <p>目前还没有发布任何文章。</p>
    </div>

    <!-- 文章网格列表 -->
    <div v-else class="article-grid">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="`/articles/${item.slug}`"
        class="article-card"
      >
        <div class="article-card__img-wrap">
          <img 
            :src="item.imageUrl || defaultArticleCover" 
            :alt="item.title" 
            loading="lazy" 
          />
        </div>
        <div class="article-card__content">
          <h2 class="article-card__title">{{ item.title }}</h2>
          <div class="article-card__footer">
            <time class="article-card__date">
              {{ new Date(item.createdAt).toLocaleDateString() }}
            </time>
            <span class="article-card__read-more">
              阅读 <van-icon name="arrow" />
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more-wrap">
      <button 
        type="button"
        class="btn btn--primary btn--lg" 
        :disabled="loadingMore" 
        @click="loadMore"
      >
        {{ loadingMore ? '加载中...' : '显示更多文章' }}
      </button>
    </div>
    
    <!-- 底部提示 -->
    <div v-else-if="items.length > 0" class="end-tip">
      - 已经到底啦 -
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 页面骨架
// ============================================================
.articles-page {
  max-width: 1080px;
  margin: 0 auto;
  padding-top: @sp-6;
  padding-bottom: @sp-8;
  min-height: 80vh;
}

// ============================================================
// 头部
// ============================================================
.page-header {
  text-align: center;
  margin-bottom: @sp-7;
}

.page-title {
  font-family: @font-serif;
  font-size: @fs-2xl;
  font-weight: 700;
  color: @ink-1;
  margin: 0 0 @sp-2;
}

.page-desc {
  font-size: @fs-base;
  color: @ink-3;
  margin: 0;
}

// ============================================================
// 空状态
// ============================================================
.empty-state {
  text-align: center;
  padding: @sp-8 0;
  color: @ink-3;

  .empty-icon {
    color: @border-strong;
    margin-bottom: @sp-3;
  }
}

// ============================================================
// 网格列表
// ============================================================
.article-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: @sp-6 @sp-5;

  @media (max-width: @bp-sm) {
    grid-template-columns: 1fr;
    gap: @sp-4;
  }
}

// ============================================================
// 文章卡片
// ============================================================
.article-card {
  display: flex;
  flex-direction: column;
  background: @surface;
  border-radius: @radius-lg;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  box-shadow: @shadow-1;
  transition: transform @dur-base ease, box-shadow @dur-base ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: @shadow-2;

    .article-card__img-wrap img {
      transform: scale(1.05);
    }
    
    .article-card__title {
      color: @accent;
    }
  }

    &__img-wrap {
    aspect-ratio: 16 / 9;
    background: @surface-2;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s @ease-out; /* 👈 直接写死 0.4s 即可，或者用 @dur-base */
      display: block;
    }
  }

  &__content {
    padding: @sp-4;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  &__title {
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 600;
    color: @ink-1;
    margin: 0 0 @sp-3;
    line-height: 1.4;
    transition: color @dur-fast ease;
    .line-2();
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: @sp-2;
    border-top: 1px dashed @border;
  }

  &__date {
    font-size: @fs-xs;
    color: @ink-3;
    font-family: @font-mono;
  }

  &__read-more {
    font-size: @fs-xs;
    color: @accent;
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

// ============================================================
// 加载更多
// ============================================================
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: @sp-7;
}

.end-tip {
  text-align: center;
  margin-top: @sp-7;
  font-size: @fs-sm;
  color: @ink-3;
  letter-spacing: 0.1em;
}
</style>