<!-- app/pages/petadm/edit.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { buildFilename, uploadToOss } from '~/utils/upload'
import type { AuthUser } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const user = useState<AuthUser | null>('auth:user', () => null)
const isAdmin = computed(() => !!user.value && user.value.isAdmin)

// ============================================================
// 状态
// ============================================================
const articleId = computed(() => Number(route.query.id) || null)
const isEditing = computed(() => !!articleId.value)

const form = reactive({
  title: '',
  imageUrl: '',
  content: '',
  slug: '',
  isPublished: 1, // 1=发布 0=草稿
})

const loading = ref(false)
const submitting = ref(false)

// ============================================================
// 初始化：编辑模式回填数据
// ============================================================
onMounted(async () => {
  if (!isAdmin.value) return
  if (isEditing.value) {
    loading.value = true
    try {
      const res = await $api<{
        title: string
        imageUrl: string
        content: string
        slug: string
        isPublished: number
      }>(`/api/articles/admin/${articleId.value}`)
      form.title = res.title
      form.imageUrl = res.imageUrl
      form.content = res.content
      form.slug = res.slug
      form.isPublished = res.isPublished
    } catch (err: any) {
      showToast(err?.data?.error || '加载文章失败')
      router.push('/petadm')
    } finally {
      loading.value = false
    }
  }
})

// ============================================================
// 图片上传 (对接 md-editor-v3 的 onUploadImg)
// ============================================================
async function handleUploadImg(
  files: Array<File>,
  callback: (urls: Array<string>) => void
) {
  const urls: string[] = []
  for (const file of files) {
    try {
      const filename = buildFilename(file.name.split('.').pop() || 'jpg')
      const { url } = await uploadToOss(file, filename, { fdir: 'pet_articles' })
      urls.push(url)
    } catch (err) {
      showToast('图片上传失败，请重试')
    }
  }
  callback(urls)
}

// ============================================================
// 提交保存
// ============================================================
async function handleSubmit() {
  if (!form.title.trim()) {
    showToast('请填写文章标题')
    return
  }
  if (!form.content.trim()) {
    showToast('请填写文章内容')
    return
  }

  submitting.value = true
  try {
    const payload = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      content: form.content,
      slug: form.slug.trim() || undefined,
      isPublished: form.isPublished,
    }

    if (isEditing.value) {
      await $api(`/api/articles/${articleId.value}`, {
        method: 'PATCH',
        body: payload,
      })
      showToast({ type: 'success', message: '文章已更新' })
    } else {
      await $api('/api/articles', {
        method: 'POST',
        body: payload,
      })
      showToast({ type: 'success', message: '文章已发布' })
    }
    router.push('/petadm')
  } catch (err: any) {
    showToast(err?.data?.error || '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}

// ============================================================
// SEO
// ============================================================
useHead({
  title: isEditing.value ? '编辑文章' : '新建文章',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})
</script>

<template>
  <div v-if="!isAdmin" class="forbidden-view container">
    <van-icon name="warning-o" size="48" color="#C25A5A" />
    <h1>403 Forbidden</h1>
    <p>您没有权限访问此页面。</p>
    <NuxtLink to="/" class="btn btn--primary mt-4">返回首页</NuxtLink>
  </div>

  <div v-else class="admin-edit-page">
    <!-- 顶部操作栏 -->
    <header class="edit-header container">
      <div class="edit-header__left">
        <NuxtLink to="/petadm" class="btn btn--sm btn--ghost">
          <van-icon name="arrow-left" /> 返回列表
        </NuxtLink>
        <h1 class="edit-header__title">
          {{ isEditing ? '编辑文章' : '新建文章' }}
        </h1>
      </div>
      <div class="edit-header__right">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '保存中...' : '保存文章' }}
        </button>
      </div>
    </header>

    <!-- 表单主体 -->
    <main class="edit-main container">
      <div v-if="loading" class="loading-state">
        <van-loading type="spinner" color="#A66039" />
        <p>加载文章数据...</p>
      </div>

      <div v-else class="edit-form">
        <!-- 左侧：基础信息 -->
        <aside class="edit-sidebar">
          <div class="field">
            <label class="field__label">标题 <span class="required">*</span></label>
            <input
              v-model="form.title"
              type="text"
              class="input"
              placeholder="输入文章标题"
              maxlength="200"
            />
          </div>

          <div class="field">
            <label class="field__label">URL Slug (可选)</label>
            <input
              v-model="form.slug"
              type="text"
              class="input"
              placeholder="例如: my_love_dog"
              maxlength="100"
            />
            <p class="field__hint">留空将自动根据标题生成，修改后旧链接会失效。</p>
          </div>

          <div class="field">
            <label class="field__label">封面图</label>
            <div class="cover-upload">
              <img v-if="form.imageUrl" :src="form.imageUrl" alt="cover" class="cover-img" />
              <div v-else class="cover-empty">
                <van-icon name="photograph" size="24" />
                <span>暂无封面</span>
              </div>
              <input
                type="file"
                accept="image/*"
                class="cover-input"
                @change="async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (!file) return
                  try {
                    const filename = buildFilename(file.name.split('.').pop() || 'jpg')
                    const { url } = await uploadToOss(file, filename, { fdir: 'pet_articles' })
                    form.imageUrl = url
                  } catch { showToast('封面上传失败') }
                }"
              />
            </div>
          </div>

          <div class="field">
            <label class="field__label">发布状态</label>
            <div class="radio-group">
              <label class="radio" :class="{ 'is-active': form.isPublished === 1 }">
                <input v-model="form.isPublished" type="radio" :value="1" />
                立即发布
              </label>
              <label class="radio" :class="{ 'is-active': form.isPublished === 0 }">
                <input v-model="form.isPublished" type="radio" :value="0" />
                存为草稿
              </label>
            </div>
          </div>
        </aside>

        <!-- 右侧：Markdown 编辑器 -->
        <div class="edit-content">
          <MdEditor
            v-model="form.content"
            :on-upload-img="handleUploadImg"
            :preview="true"
            :toolbars-exclude="['github', 'save']"
            placeholder="开始撰写文章..."
            style="height: calc(100vh - 180px); border-radius: 8px;"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.forbidden-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: @sp-8 0;
  text-align: center;
  min-height: 60vh;
  h1 { font-size: @fs-xl; color: @ink-1; margin: @sp-3 0 @sp-1; }
  p { color: @ink-3; margin-bottom: @sp-4; }
}

.admin-edit-page {
  background: #f7f8fa;
  min-height: calc(100vh - 64px);
  padding-bottom: @sp-6;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @sp-4 0;

  &__left {
    display: flex;
    align-items: center;
    gap: @sp-3;
  }

  &__title {
    margin: 0;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }
}

.edit-main {
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: @sp-8;
  color: @ink-3;
  p { margin-top: @sp-3; }
}

.edit-form {
  display: flex;
  gap: @sp-5;
  align-items: flex-start;

  @media (max-width: @bp-md) {
    flex-direction: column;
  }
}

.edit-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: @surface;
  padding: @sp-4;
  border-radius: @radius-lg;
  border: 1px solid @border;
  display: flex;
  flex-direction: column;
  gap: @sp-4;

  @media (max-width: @bp-md) {
    width: 100%;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: @sp-1;

  &__label {
    font-size: @fs-sm;
    font-weight: 500;
    color: @ink-2;
  }

  &__hint {
    font-size: @fs-xs;
    color: @ink-3;
    margin: 0;
  }

  .required { color: @danger; }
}

.cover-upload {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: @surface-2;
  border: 1px dashed @border-strong;
  border-radius: @radius;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover { border-color: @accent; }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: @ink-3;
    font-size: @fs-xs;
  }

  .cover-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
}

.radio-group {
  display: flex;
  gap: @sp-2;
}

.radio {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid @border;
  border-radius: @radius-sm;
  font-size: @fs-sm;
  color: @ink-2;
  cursor: pointer;
  transition: all 0.2s;

  input { display: none; }

  &.is-active {
    border-color: @accent;
    background: @accent-soft;
    color: @accent;
    font-weight: 500;
  }
}

.edit-content {
  flex: 1;
  min-width: 0;
  background: @surface;
  border-radius: @radius-lg;
  border: 1px solid @border;
  overflow: hidden;

  :deep(.md-editor) {
    border: none;
    background: @surface;
  }
}
</style>