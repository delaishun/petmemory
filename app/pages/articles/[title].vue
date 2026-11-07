<!-- app/pages/articles/[title].vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import { showToast, showConfirmDialog } from 'vant'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import type { AuthUser } from '~/types/auth'

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
  likeCount: number
}

interface ArticleComment {
  id: number
  content: string
  createdAt: string
  author: {
    id: number
    nickname: string
    avatarUrl: string | null
  }
}

// ============================================================
// 数据获取（走 ISR，SSR 阶段生成 HTML）
// ============================================================
const { data: article, pending, error } = await useAsyncData<ArticleDetail>(
  () => `article:${articleSlug.value}`,
  () => $api<ArticleDetail>(`/api/articles/${articleSlug.value}`),
  { watch: [articleSlug] },
)

// ============================================================
// 点赞逻辑
// ============================================================
const hasLiked = ref(false)
const isLiking = ref(false)

async function handleLike() {
  if (hasLiked.value || isLiking.value || !article.value) return

  isLiking.value = true
  try {
    const res = await $api<{ likeCount: number }>(
      `/api/articles/${articleSlug.value}/like`,
      { method: 'POST' }
    )
    article.value.likeCount = res.likeCount
    hasLiked.value = true
    localStorage.setItem(`liked_article_${articleSlug.value}`, 'true')
  } catch (err: any) {
    showToast(err?.data?.error || '点赞失败，请稍后重试')
  } finally {
    isLiking.value = false
  }
}

// ============================================================
// 评论逻辑（走 CSR，客户端异步拉取）
// ============================================================
const comments = ref<ArticleComment[]>([])
const commentTotal = ref(0)
const commentLoading = ref(false)
const commentInput = ref('')
const commentSubmitting = ref(false)
const COMMENT_PAGE_SIZE = 10

const hasMoreComments = computed(
  () => comments.value.length < commentTotal.value
)

const isMuted = computed(() => {
  // @ts-ignore 假设 AuthUser 类型中没有明确写出 muteUntil，使用 any 兜底
  const muteUntil = (me.value as any)?.muteUntil
  if (!muteUntil) return false
  return new Date(muteUntil) > new Date()
})

async function loadComments(reset = false) {
  if (!article.value || commentLoading.value) return
  if (reset) {
    comments.value = []
    commentTotal.value = 0
  }
  commentLoading.value = true
  try {
    const offset = reset ? 0 : comments.value.length
    // 加上 &t=${Date.now()} 彻底杜绝任何层面的缓存
    const res = await $api<{ items: ArticleComment[]; total: number }>(
      `/api/articles/${articleSlug.value}/comments?limit=${COMMENT_PAGE_SIZE}&offset=${offset}&t=${Date.now()}`
    )
    if (reset) {
      comments.value = res.items
    } else {
      comments.value.push(...res.items)
    }
    commentTotal.value = res.total
  } catch (err) {
    showToast('加载评论失败')
  } finally {
    commentLoading.value = false
  }
}

// 关键修改：在客户端挂载时执行评论拉取和本地状态恢复
onMounted(() => {
  if (import.meta.client && articleSlug.value) {
    // 1. 恢复点赞状态
    const liked = localStorage.getItem(`liked_article_${articleSlug.value}`)
    if (liked === 'true') {
      hasLiked.value = true
    }
    // 2. 拉取评论列表
    loadComments(true)
  }
})

// 监听路由变化重新加载评论
watch(articleSlug, () => {
  if (import.meta.client) {
    loadComments(true)
  }
})

async function submitComment() {
  const text = commentInput.value.trim()
  if (!text) return

  commentSubmitting.value = true
  try {
    const res = await $api<ArticleComment>(
      `/api/articles/${articleSlug.value}/comments`,
      { method: 'POST', body: { content: text } }
    )
    // 追加到列表末尾 (因为是从老到新显示)
    comments.value.push(res)
    commentTotal.value++
    commentInput.value = ''
    showToast({ type: 'success', message: t('article_comment_success') || '评论成功' })
  } catch (err: any) {
    showToast(err?.data?.error || '评论失败')
  } finally {
    commentSubmitting.value = false
  }
}

async function deleteComment(comment: ArticleComment) {
  try {
    await showConfirmDialog({
      title: t('article_comment_delete_confirm') || '确定要删除这条评论吗？',
      confirmButtonText: t('btn_delete') || '删除',
      cancelButtonText: t('btn_cancel') || '取消',
      confirmButtonColor: '#C25A5A',
    })
  } catch {
    return
  }

  try {
    await $api(`/api/articles/${articleSlug.value}/comments/${comment.id}`, {
      method: 'DELETE',
    })
    comments.value = comments.value.filter((c) => c.id !== comment.id)
    commentTotal.value--
    showToast({ type: 'success', message: t('msg_deleted') || '已删除' })
  } catch (err: any) {
    showToast(err?.data?.error || '删除失败')
  }
}

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
      <!-- 头部：标题与时间 + 点赞 -->
      <header class="article-header">
        <h1 class="article-title">{{ article.title }}</h1>
        
        <div class="article-meta">
          <div class="article-meta__left">
            <time>{{ formatDate(article.createdAt) }}</time>
            <span class="dot">·</span>
            <span>{{ t('seo_tag_memorial') }}</span>
          </div>
          
          <!-- 点赞按钮 -->
          <button 
            type="button" 
            class="article-like-btn"
            :class="{ 'is-liked': hasLiked }"
            :disabled="isLiking"
            @click="handleLike"
          >
            <span class="heart-icon">❤️</span>
            <span class="like-count">{{ article.likeCount || 0 }}</span>
          </button>
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

        <!-- 按钮并排布局 -->
        <div class="article-actions">
          <NuxtLink to="/articles" class="btn btn--lg">
            {{ t('article_read_more') }}
          </NuxtLink>
          
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

      <!-- ============================================ -->
      <!-- 文章评论模块                                 -->
      <!-- ============================================ -->
      <section class="article-comments">
        <div class="article-comments__header">
          <h3 class="article-comments__title">{{ t('article_comments_title') || 'Comments' }}</h3>
          <span class="article-comments__count">{{ commentTotal }}</span>
        </div>

        <!-- 评论列表 -->
        <div v-if="comments.length" class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <NuxtLink :to="`/users/${comment.author.id}`" class="comment-item__avatar-link">
              <img class="comment-item__avatar" :src="comment.author.avatarUrl || 'https://music.petmemory.me/default-avatar.png'" alt="avatar" />
            </NuxtLink>
            <div class="comment-item__main">
              <div class="comment-item__head">
                <NuxtLink :to="`/users/${comment.author.id}`" class="comment-item__name">
                  {{ comment.author.nickname }}
                </NuxtLink>
                <span class="comment-item__time">{{ new Date(comment.createdAt).toLocaleString() }}</span>
                
                <!-- 👇 修改点：作者本人或管理员可以删除 -->
                <button 
                  v-if="me?.id === comment.author.id || me?.isAdmin" 
                  class="comment-item__remove" 
                  @click="deleteComment(comment)"
                >
                  <van-icon name="cross" />
                </button>
              </div>
              <p class="comment-item__text">{{ comment.content }}</p>
            </div>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMoreComments" class="comment-load-more">
            <button class="btn btn--sm" :disabled="commentLoading" @click="loadComments(false)">
              {{ commentLoading ? '...' : (t('article_comment_load_more') || 'Load more comments') }}
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="comment-empty">
          <p>{{ t('article_comment_empty') || 'No comments yet. Be the first!' }}</p>
        </div>

        <!-- 发表评论输入区 -->
        <div class="comment-editor">
          <!-- 未登录 -->
          <div v-if="!me" class="comment-editor__login-tip">
            <a href="javascript:;" @click.prevent="loginModalVisible = true" class="comment-editor__login-link">
              {{ t('article_comment_login_tip') || 'Please log in to comment.' }}
            </a>
          </div>
          
          <!-- 被禁言 -->
          <div v-else-if="isMuted" class="comment-editor__muted">
            {{ t('article_comment_muted') || 'You are currently muted and cannot comment.' }}
          </div>

          <!-- 正常输入区 -->
          <template v-else>
            <textarea 
              v-model="commentInput" 
              class="comment-editor__input" 
              :placeholder="t('article_comment_placeholder') || 'Leave a comment... (Max 600 chars)'"
              maxlength="600"
            />
            <div class="comment-editor__footer">
              <span class="comment-editor__count">{{ commentInput.length }}/600</span>
              <button 
                class="btn btn--primary btn--sm" 
                :disabled="!commentInput.trim() || commentSubmitting"
                @click="submitComment"
              >
                {{ commentSubmitting ? (t('btn_processing') || 'Posting...') : (t('article_comment_submit') || 'Post Comment') }}
              </button>
            </div>
          </template>
        </div>
      </section>
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
  justify-content: space-between;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  font-size: @fs-sm;
  color: @ink-3;
  font-family: @font-mono;

  &__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  .dot {
    color: @border-strong;
  }
}

.article-like-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: @radius-pill;
  transition: background @dur-fast ease;
  user-select: none;

  &:hover:not(:disabled) {
    background: @surface-2;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: default;
  }

  .heart-icon {
    font-size: 18px;
    line-height: 1;
    transition: transform 0.3s ease, filter 0.3s ease;
    filter: grayscale(1) opacity(0.4);
  }

  .like-count {
    font-size: 12px;
    color: @ink-3;
    font-family: @font-mono;
  }

  &.is-liked {
    .heart-icon {
      filter: none;
      animation: heart-beat 0.5s ease;
    }
    .like-count {
      color: @ink-2;
    }
  }
}

@keyframes heart-beat {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
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

.article-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: @sp-3;
  flex-wrap: wrap;

  .btn {
    min-width: 140px;
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
      width: 100%;
    }
  }
}

/* 评论模块样式 */
.article-comments {
  margin-top: @sp-8;
  padding-top: @sp-6;
  border-top: 1px solid @border;
}

.article-comments__header {
  display: flex;
  align-items: center;
  gap: @sp-2;
  margin-bottom: @sp-4;
}

.article-comments__title {
  font-family: @font-serif;
  font-size: @fs-lg;
  font-weight: 700;
  color: @ink-1;
  margin: 0;
}

.article-comments__count {
  font-size: @fs-sm;
  color: @ink-3;
  background: @surface-2;
  padding: 2px 8px;
  border-radius: @radius-pill;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: @sp-3;
  margin-bottom: @sp-5;
}

.comment-item {
  display: flex;
  gap: @sp-3;
  padding-bottom: @sp-3;
  border-bottom: 1px dashed @border;

  &:last-child {
    border-bottom: none;
  }
}

.comment-item__avatar-link {
  flex-shrink: 0;
}

.comment-item__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: @surface-2;
  border: 1px solid @border;
}

.comment-item__main {
  flex: 1;
  min-width: 0;
}

.comment-item__head {
  display: flex;
  align-items: center;
  gap: @sp-2;
  margin-bottom: 4px;
}

.comment-item__name {
  font-size: @fs-sm;
  font-weight: 600;
  color: @ink-1;
  text-decoration: none;

  &:hover {
    color: @accent;
  }
}

.comment-item__time {
  font-size: 11px;
  color: @ink-3;
  font-family: @font-mono;
}

.comment-item__remove {
  margin-left: auto;
  background: none;
  border: none;
  color: @ink-3;
  cursor: pointer;
  padding: 2px;

  &:hover {
    color: @danger;
  }
}

.comment-item__text {
  margin: 0;
  font-size: @fs-sm;
  color: @ink-2;
  line-height: @lh-base;
  word-break: break-word;
}

.comment-load-more {
  display: flex;
  justify-content: center;
  margin-top: @sp-3;
}

.comment-empty {
  text-align: center;
  padding: @sp-6 0;
  color: @ink-3;
  font-size: @fs-sm;
}

.comment-editor {
  background: @surface-2;
  padding: @sp-4;
  border-radius: @radius-lg;
  border: 1px solid @border;

  &__login-tip,
  &__muted {
    text-align: center;
    font-size: @fs-sm;
    color: @ink-3;
    padding: @sp-3 0;
  }

  &__login-link {
    color: @accent;
    text-decoration: underline;
    cursor: pointer;
  }

  &__input {
    width: 100%;
    min-height: 80px;
    padding: @sp-3;
    font-family: inherit;
    font-size: @fs-sm;
    background: @surface;
    border: 1px solid @border;
    border-radius: @radius;
    resize: vertical;
    outline: none;

    &:focus {
      border-color: @accent;
    }
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: @sp-2;
  }

  &__count {
    font-size: @fs-xs;
    color: @ink-3;
    font-family: @font-mono;
  }
}

/* 分享弹窗样式 */
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