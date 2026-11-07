<!-- app/pages/articles/[title].vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { showToast } from 'vant'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { AuthUser } from '~/types/auth' // 👈 引入用户类型

// ============================================================
// 初始化与路由参数
// ============================================================
const { t } = useI18n()
const route = useRoute()
const { $api } = useNuxtApp()

const articleSlug = computed(() => String(route.params.title || ''))

// ============================================================
// 用户状态与弹窗控制
// ============================================================
const me = useState<AuthUser | null>('auth:user', () => null)
const loginModalVisible = ref(false)
const addPetModalVisible = ref(false)

function handleAddPet() {
  if (!me.value) {
    loginModalVisible.value = true
  } else {
    addPetModalVisible.value = true
  }
}

// 登录成功后的回调：关闭登录框，直接拉起添加宠物框
function onLoginSuccess() {
  loginModalVisible.value = false
  if (me.value) {
    addPetModalVisible.value = true
  }
}

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
const { data: article, pending, error, refresh: refreshArticle } = await useAsyncData<ArticleDetail>(
  () => `article:${articleSlug.value}`,
  () => $api<ArticleDetail>(`/api/articles/${articleSlug.value}`),
  { watch: [articleSlug] },
)

// ============================================================
// 页面底部展示用的标签
// ============================================================
const seoTags = computed(() => [
  t('seo_tag_memorial'),
  t('seo_tag_past'),
  t('seo_tag_memory'),
  t('seo_tag_heaven'),
  t('seo_tag_love'),
])

// ============================================================
// SEO 配置
// ============================================================
function stripMarkdown(md: string): string {
  if (!md) return ''
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const plainText = computed(() => stripMarkdown(article.value?.content || ''))

useSeoMeta({
  title: () => article.value?.title || t('article_not_found'),
  description: () =>
    plainText.value.slice(0, 160) ||
    (article.value
      ? `${article.value.title} - PetMemory`
      : 'Read pet memorial articles on PetMemory.'),
  ogTitle: () =>
    article.value ? `${article.value.title} - PetMemory` : 'Article - PetMemory',
  ogDescription: () =>
    plainText.value.slice(0, 200) || 'Read pet memorial articles on PetMemory.',
  ogImage: () =>
    article.value?.imageUrl || 'https://music.petmemory.me/og-cover.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 600,
  ogType: 'article',
  ogUrl: () => `https://www.petmemory.me/articles/${articleSlug.value}`,
  articlePublishedTime: () => article.value?.createdAt,
  articleModifiedTime: () => article.value?.updatedAt,
  twitterCard: 'summary_large_image',
  twitterTitle: () =>
    article.value ? `${article.value.title} - PetMemory` : 'Article - PetMemory',
  twitterDescription: () =>
    plainText.value.slice(0, 200) || 'Read pet memorial articles on PetMemory.',
  twitterImage: () =>
    article.value?.imageUrl || 'https://music.petmemory.me/og-cover.jpg',
  robots: () => (article.value ? 'index, follow' : 'noindex, nofollow'),
})

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: `https://www.petmemory.me/articles/${articleSlug.value}`,
    },
  ],
}))

// ============================================================
// 日期格式化
// ============================================================
function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// ============================================================
// 分享功能
// ============================================================
const shareModalVisible = ref(false)

const shareUrl = computed(() => {
  if (!articleSlug.value) return ''
  return `https://www.petmemory.me/articles/${articleSlug.value}`
})

const shareText = computed(() => {
  if (!article.value) return ''
  return `Read "${article.value.title}" on PetMemory`
})

function handleShare() {
  shareModalVisible.value = true
}

function shareToX() {
  const url = encodeURIComponent(shareUrl.value)
  const text = encodeURIComponent(shareText.value)
  window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, '_blank')
  shareModalVisible.value = false
}

function shareToFacebook() {
  const url = encodeURIComponent(shareUrl.value)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  shareModalVisible.value = false
}

function shareToReddit() {
  const url = encodeURIComponent(shareUrl.value)
  const title = encodeURIComponent(shareText.value)
  window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank')
  shareModalVisible.value = false
}

function shareToPinterest() {
  const url = encodeURIComponent(shareUrl.value)
  const media = encodeURIComponent(article.value?.imageUrl || '')
  const description = encodeURIComponent(shareText.value)
  window.open(
    `https://www.pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`,
    '_blank'
  )
  shareModalVisible.value = false
}

function shareToTelegram() {
  const url = encodeURIComponent(shareUrl.value)
  const text = encodeURIComponent(shareText.value)
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank')
  shareModalVisible.value = false
}

async function copyShareLink() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl.value)
      showToast({
        type: 'success',
        message: t('share_link_copied') || 'Link copied to clipboard',
      })
      return
    }
  } catch {
    /* 降级 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = shareUrl.value
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    showToast(ok ? 'Link copied' : 'Copy failed')
  } catch {
    showToast('Copy failed')
  }
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

      <!-- 正文内容区 -->
      <div class="article-body">
        <MdPreview :modelValue="article.content" :editorId="'preview-' + article.slug" />
      </div>

      <!-- 底部 SEO 标签与操作区 -->
      <footer class="article-footer">
        <div class="article-divider">
          <span>{{ t('article_divider_text') }}</span>
        </div>
        
        <div class="article-seo-tags">
          <span v-for="(tag, index) in seoTags" :key="index" class="tag">
            {{ tag }}
          </span>
        </div>

        <!-- 👇 按钮并排布局 (新增了 Add My Pet) -->
        <div class="article-actions">
          <NuxtLink to="/articles" class="btn btn--lg">
            {{ t('article_read_more') }}
          </NuxtLink>
          
          <!-- 新增：Add My Pet 按钮 -->
          <button 
            type="button" 
            class="btn btn--primary btn--lg article-add-pet-btn" 
            @click="handleAddPet"
          >
            <van-icon name="plus" />
            <span>{{ t('add_my_pet') || 'Add My Pet' }}</span>
          </button>

          <button type="button" class="btn btn--lg article-share-btn" @click="handleShare">
            <van-icon name="share-o" />
            <span>{{ t('pet_share') || 'Share' }}</span>
          </button>
        </div>
      </footer>
    </article>

    <!-- 分享弹窗 -->
    <van-popup
      v-model:show="shareModalVisible"
      round
      :style="{ width: 'min(360px, 90%)' }"
      teleport="body"
    >
      <div class="share-popup">
        <h3 class="share-popup__title">
          {{ t('article_share_title') || 'Share this article' }}
        </h3>
        <p class="share-popup__subtitle">
          {{ t('pet_share_subtitle') || 'Help more people discover this story' }}
        </p>

        <div class="share-popup__icons">
          <button class="share-popup__icon-btn" type="button" aria-label="Share to X" @click="shareToX">
            <img src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/street/x-50.png" alt="X" loading="lazy" />
          </button>
          <button class="share-popup__icon-btn" type="button" aria-label="Share to Facebook" @click="shareToFacebook">
            <img src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/street/facebook-50.png" alt="Facebook" loading="lazy" />
          </button>
          <button class="share-popup__icon-btn" type="button" aria-label="Share to Reddit" @click="shareToReddit">
            <img src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/street/reddit-50.png" alt="Reddit" loading="lazy" />
          </button>
          <button class="share-popup__icon-btn" type="button" aria-label="Share to Pinterest" @click="shareToPinterest">
            <img src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/street/pinterest-50.png" alt="Pinterest" loading="lazy" />
          </button>
          <button class="share-popup__icon-btn" type="button" aria-label="Share to Telegram" @click="shareToTelegram">
            <img src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/street/telegram-50.png" alt="Telegram" loading="lazy" />
          </button>
        </div>

        <div class="share-popup__divider" />

        <p class="share-popup__link-label">
          {{ t('pet_share_copy_label') || 'Or copy this link' }}
        </p>
        <div class="share-popup__link">
          <input
            class="share-popup__input"
            :value="shareUrl"
            readonly
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button type="button" class="btn btn--sm" @click="copyShareLink">
            {{ t('btn_copy') || 'Copy' }}
          </button>
        </div>

        <button
          type="button"
          class="btn btn--primary share-popup__close"
          @click="shareModalVisible = false"
        >
          {{ t('btn_close') || 'Close' }}
        </button>
      </div>
    </van-popup>

    <!-- 登录弹窗 -->
    <LoginModal 
      v-if="loginModalVisible" 
      v-model="loginModalVisible" 
      @success="onLoginSuccess" 
    />

    <!-- 添加宠物弹窗 -->
    <AddPetModal 
      v-if="addPetModalVisible" 
      v-model="addPetModalVisible" 
    />
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

.article-body {
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

  :deep(p) { margin-bottom: 1.5em; }
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
  :deep(li) { margin-bottom: 0.5em; }
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

/* 👇 并排按钮样式 */
.article-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: @sp-3;
  flex-wrap: wrap;

  .btn {
    min-width: 140px; /* 因为有3个按钮，稍微调小一点最小宽度防止溢出 */
    border-radius: @radius-pill;
  }

  .article-add-pet-btn,
  .article-share-btn {
    gap: @sp-1;
    :deep(.van-icon) {
      font-size: 16px;
    }
  }

  @media (max-width: @bp-sm) {
    flex-direction: column;
    width: 100%;
    .btn {
      width: 100%; /* 手机端变成垂直排列，充满宽度 */
    }
  }
}

/* 👇 分享弹窗样式 */
.share-popup {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: @sp-6 @sp-5 @sp-5;
  text-align: center;

  &__title {
    margin: 0 0 @sp-2;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    .line-1();
    max-width: 100%;
  }

  &__subtitle {
    margin: 0 0 @sp-5;
    font-size: @fs-sm;
    color: @ink-3;
  }

  &__icons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: @sp-3;
    margin-bottom: @sp-5;
  }

  &__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    padding: 10px;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: 50%;
    cursor: pointer;
    transition: transform @dur-fast ease, border-color @dur-fast ease,
      box-shadow @dur-fast ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    &:hover {
      border-color: @accent;
      box-shadow: @shadow-1;
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0) scale(0.95);
    }
  }

  &__divider {
    width: 100%;
    height: 1px;
    background: @border;
    margin: 0 0 @sp-4;
  }

  &__link-label {
    margin: 0 0 @sp-2;
    font-size: @fs-xs;
    color: @ink-3;
    letter-spacing: 0.05em;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: @sp-2;
    width: 100%;
    margin-bottom: @sp-5;
  }

  &__input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    font-size: @fs-sm;
    font-family: @font-mono;
    color: @ink-2;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: @radius-sm;
    outline: none;
    cursor: pointer;

    &:focus {
      border-color: @accent;
    }
  }

  &__close {
    width: 100%;
  }
}
</style>