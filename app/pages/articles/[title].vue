<!-- app/pages/articles/[title].vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
// 👇 新增：引入 Markdown 预览组件和样式
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

// ============================================================
// 初始化与路由参数
// ============================================================
const { t } = useI18n()
const route = useRoute()
const { $api } = useNuxtApp()

// 获取路由参数，这里对应的是 slug (如 my_love_dog)
const articleSlug = computed(() => String(route.params.title || ''))

// ============================================================
// 类型
// ============================================================
interface ArticleDetail {
  id: number
  slug: string
  title: string
  imageUrl: string
  content: string
  createdAt: string
  updatedAt: string
}

// ============================================================
// 数据获取
// ============================================================
const { data: article, pending, error } = await useAsyncData<ArticleDetail>(
  () => `article:${articleSlug.value}`,
  () => $api<ArticleDetail>(`/api/articles/${articleSlug.value}`),
  { watch: [articleSlug] } // 当路由参数变化时重新请求
)

// ============================================================
// SEO 标签 (用于底部展示及动态 Meta)
// ============================================================
const seoTags = computed(() => [
  t('seo_tag_memorial'),
  t('seo_tag_past'),
  t('seo_tag_memory'),
  t('seo_tag_heaven'),
  t('seo_tag_love')
])

// ============================================================
// SEO 配置
// ============================================================
useHead(() => {
  if (!article.value) {
    return { title: `${t('article_not_found')} · ${t('app_name')}` }
  }
  
  // 动态生成包含 SEO 标签的 meta description
  const metaDesc = `${article.value.title} - ${seoTags.value.join(', ')}`
  
  return {
    title: `${article.value.title} · ${t('app_name')}`,
    meta: [
      { name: 'description', content: metaDesc }
    ]
  }
})

// 格式化日期
function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="page container article-page">
    <!-- 加载中 -->
    <div v-if="pending" class="status-view">
      <van-loading type="spinner" color="#A66039" size="32" />
      <p>{{ t('article_loading') }}</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error || !article" class="status-view">
      <van-icon name="warning-o" size="48" class="status-icon" />
      <h1>{{ t('article_not_found') }}</h1>
      <NuxtLink to="/articles" class="btn btn--primary mt-4">
        {{ t('article_back_to_list') }}
      </NuxtLink>
    </div>

    <!-- 文章内容 -->
    <article v-else class="article-content">
      <!-- 头部：标题与时间 -->
      <header class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <time>{{ formatDate(article.createdAt) }}</time>
          <span class="dot">·</span>
          <span>{{ t('seo_tag_memorial') }}</span>
        </div>
      </header>

      <!-- 封面图 -->
      <div class="article-cover" v-if="article.imageUrl">
        <img :src="article.imageUrl" :alt="article.title" />
      </div>

      <!-- 正文内容区 (改为 Markdown 渲染) -->
      <div class="article-body">
        <MdPreview :modelValue="article.content" :editorId="'preview-' + article.slug" />
      </div>

      <!-- 底部 SEO 标签与情感文字 -->
      <footer class="article-footer">
        <div class="article-divider">
          <span>{{ t('article_divider_text') }}</span>
        </div>
        
        <div class="article-seo-tags">
          <span v-for="(tag, index) in seoTags" :key="index" class="tag">
            {{ tag }}
          </span>
        </div>

        <div class="article-back">
          <NuxtLink to="/articles" class="btn btn--lg">
            {{ t('article_read_more') }}
          </NuxtLink>
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.article-page {
  max-width: 800px;
  margin: 0 auto;
  padding-top: @sp-7;
  padding-bottom: @sp-8;
  min-height: 80vh;

  @media (max-width: @bp-sm) {
    padding-top: @sp-4;
    padding-bottom: @sp-6;
  }
}

.status-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: @sp-8 0;
  color: @ink-3;
  text-align: center;

  h1 {
    font-size: @fs-lg;
    margin: @sp-3 0;
    color: @ink-1;
  }

  .status-icon {
    color: @warning;
  }
}

.article-content {
  background: @surface;
  padding: 0 @sp-6;

  @media (max-width: @bp-sm) {
    padding: 0 @sp-4;
  }
}

.article-header {
  text-align: center;
  margin-bottom: @sp-6;
}

.article-title {
  font-family: @font-serif;
  font-size: 36px;
  font-weight: 700;
  color: @ink-1;
  line-height: 1.3;
  margin: 0 0 @sp-3;
  letter-spacing: -0.01em;

  @media (max-width: @bp-sm) {
    font-size: 28px;
  }
}

.article-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: @sp-2;
  font-size: @fs-sm;
  color: @ink-3;
  font-family: @font-mono;

  .dot {
    color: @border-strong;
  }
}

.article-cover {
  width: 100%;
  border-radius: @radius-lg;
  overflow: hidden;
  margin-bottom: @sp-7;
  box-shadow: @shadow-2;
  
  img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }
}

// ============================================================
// 正文样式 (让 MdPreview 融入全局设计)
// ============================================================
.article-body {
  /* 覆盖 MdPreview 默认的样式，让它融入你的设计 */
  :deep(.md-editor-preview-wrapper) {
    padding: 0; 
  }
  
  :deep(.md-editor-preview) {
    font-family: inherit;
    color: @ink-2;
    font-size: 17px;
    line-height: 1.9;
    letter-spacing: 0.01em;
    background: transparent;
  }

  :deep(p) {
    margin-bottom: 1.5em;
  }

  :deep(h2) {
    font-family: @font-serif;
    font-size: 24px;
    font-weight: 700;
    color: @ink-1;
    margin: 2em 0 1em;
    padding-bottom: 0.3em;
    border-bottom: 1px solid @border;
  }

  :deep(h3) {
    font-family: @font-serif;
    font-size: 20px;
    font-weight: 600;
    color: @ink-1;
    margin: 1.5em 0 0.8em;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: @radius;
    margin: 1.5em auto;
    display: block;
    box-shadow: @shadow-1;
  }

  :deep(blockquote) {
    margin: 1.5em 0;
    padding: 1em 1.5em;
    background: @surface-2;
    border-left: 4px solid @accent;
    border-radius: @radius-sm;
    color: @ink-2;
    font-style: italic;
  }

  :deep(ul), :deep(ol) {
    margin-bottom: 1.5em;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin-bottom: 0.5em;
  }

  :deep(a) {
    color: @accent;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.article-footer {
  margin-top: @sp-8;
  padding-top: @sp-6;
}

.article-divider {
  position: relative;
  text-align: center;
  margin-bottom: @sp-6;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: @border;
  }

  span {
    position: relative;
    display: inline-block;
    padding: 0 @sp-4;
    background: @surface;
    font-family: @font-serif;
    font-size: @fs-sm;
    color: @ink-3;
    font-style: italic;
  }
}

.article-seo-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: @sp-2;
  margin-bottom: @sp-7;

  .tag {
    font-size: @fs-xs;
    color: @ink-3;
    background: @surface-2;
    padding: 4px 12px;
    border-radius: @radius-pill;
    border: 1px solid @border;
    transition: all @dur-fast ease;
    cursor: default;

    &:hover {
      color: @accent;
      border-color: @accent-soft;
      background: @accent-soft;
    }
  }
}

.article-back {
  text-align: center;
  
  .btn {
    min-width: 200px;
    border-radius: @radius-pill;
  }
}
</style>