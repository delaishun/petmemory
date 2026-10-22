<!-- app/components/UploadPhotoModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { processPhoto, ImageProcessError } from '~/utils/image-process'
import { uploadToOss, buildFilename } from '~/utils/upload'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

interface PhotoPublic {
  id: number
  imageUrl: string
  caption: string
  sortOrder: number
  createdAt: string
}

interface Props {
  modelValue: boolean
  /** 宠物 slug，用于 POST /api/pets/:slug/photos */
  slug: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', photos: PhotoPublic[]): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { $api } = useNuxtApp()

// 常量：与后端 maxItems 对齐
const MAX_FILES = 10

const canUpload = computed(() => !!props.slug)

// ============================================================
// 单张状态
// ============================================================

type ItemStatus =
  | 'pending'      // 等待
  | 'processing'   // 压缩中
  | 'uploading'    // 上传中
  | 'done'         // 已传 OSS
  | 'error'        // 失败

interface UploadItem {
  uid: number
  file: File
  previewUrl: string
  status: ItemStatus
  progress: number
  error: string
  url: string         // 上传成功后的 OSS URL
}

// ============================================================
// 状态
// ============================================================

const items = ref<UploadItem[]>([])
const running = ref(false)      // 处理 + 上传阶段
const saving = ref(false)       // 最后 POST 保存阶段
const uploaderList = ref<any[]>([])
const globalError = ref('')

// 每次开始 / 重置都自增，用于打断进行中的任务
let runToken = 0
let uidSeq = 0

// ============================================================
// 计算属性
// ============================================================

const total = computed(() => items.value.length)
const doneCount = computed(
  () => items.value.filter((i) => i.status === 'done').length,
)
const errorCount = computed(
  () => items.value.filter((i) => i.status === 'error').length,
)
const hasError = computed(() => errorCount.value > 0)
const busy = computed(() => running.value || saving.value)

const overallText = computed(() => {
  if (total.value === 0) return ''
  if (saving.value) return t('upload_progress_saving')
  if (doneCount.value === total.value && !hasError.value) return t('upload_progress_all_done')
  if (hasError.value && !running.value) {
    return t('upload_progress_partial_fail', { ok: doneCount.value, total: total.value, fail: errorCount.value })
  }
  return t('upload_progress_uploading', { current: Math.min(doneCount.value + 1, total.value), total: total.value })
})

// ============================================================
// 重置
// ============================================================

function resetState() {
  runToken++
  running.value = false
  saving.value = false
  globalError.value = ''
  for (const it of items.value) {
    if (it.previewUrl) URL.revokeObjectURL(it.previewUrl)
  }
  items.value = []
  uploaderList.value = []
}

watch(visible, (v) => {
  if (!v) resetState()
})

// ============================================================
// 工具
// ============================================================

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function statusText(item: UploadItem): string {
  switch (item.status) {
    case 'pending':
      return t('upload_status_pending')
    case 'processing':
      return t('upload_status_processing')
    case 'uploading':
      return t('upload_status_uploading', { p: item.progress })
    case 'done':
      return t('upload_status_done')
    case 'error':
      return item.error || t('upload_status_error')
    default:
      return ''
  }
}

// ============================================================
// van-uploader 的 after-read
// ============================================================

function handleAfterRead(payload: any) {
  const arr = Array.isArray(payload) ? payload : [payload]
  const files = arr
    .map((x: any) => x?.file)
    .filter((f: any): f is File => f instanceof File)

  // 立刻清空 van-uploader 的内部列表，改用自定义渲染
  uploaderList.value = []

  if (files.length) void startUpload(files)
}

// ============================================================
// 主流程：逐张处理 → 上传 OSS → 批量保存到后端
// ============================================================

async function startUpload(rawFiles: File[]) {
  if (busy.value || rawFiles.length === 0) return
  if (!canUpload.value) {
    showToast(t('upload_err_no_slug'))
    return
  }

  // 单次上限
  let files = rawFiles
  if (files.length > MAX_FILES) {
    showToast(t('upload_err_max_files', { max: MAX_FILES }))
    files = files.slice(0, MAX_FILES)
  }

  const token = ++runToken
  globalError.value = ''

  items.value = files.map((file) => ({
    uid: ++uidSeq,
    file,
    previewUrl: '',
    status: 'pending' as ItemStatus,
    progress: 0,
    error: '',
    url: '',
  }))

  running.value = true
  const succeeded: Array<{ url: string }> = []

  try {
    // ---------- 阶段 1：逐张处理 + 上传 OSS ----------
    for (let i = 0; i < items.value.length; i++) {
      if (token !== runToken) return

      const item = items.value[i]
      if (!item) continue

      try {
        // 1. 压缩 + 校验
        item.status = 'processing'
        const processed = await processPhoto(item.file)
        if (token !== runToken) return

        // 本地预览
        item.previewUrl = URL.createObjectURL(processed.blob)

        // 2. 上传 OSS
        item.status = 'uploading'
        item.progress = 0
        const filename = buildFilename(processed.ext)
        const { url } = await uploadToOss(processed.blob, filename, {
          fdir: 'pet_photos',
          onProgress: (p) => {
            item.progress = p
          },
        })
        if (token !== runToken) return

        item.url = url
        item.status = 'done'
        succeeded.push({ url })
      } catch (err: any) {
        if (token !== runToken) return
        console.error(`[UploadPhotoModal] item #${i} failed:`, err)
        item.status = 'error'
        item.error =
          err instanceof ImageProcessError
            ? err.message
            : err?.message || t('upload_item_error')
        // 单张失败不中断，继续后面的
      }
    }

    if (token !== runToken) return

    // ---------- 阶段 2：批量保存到后端 ----------
    if (succeeded.length === 0) {
      globalError.value = t('upload_err_all_failed')
      return
    }

    saving.value = true
    try {
      const photos = await $api<PhotoPublic[]>(
        `/api/pets/${props.slug}/photos`,
        {
          method: 'POST',
          body: { photos: succeeded },
        },
      )
      if (token !== runToken) return

      emit('success', photos)

      if (hasError.value) {
        showToast(t('upload_msg_partial_success', { ok: succeeded.length, fail: errorCount.value }))
      } else {
        showToast({ type: 'success', message: t('upload_msg_success') })
      }

      // 全部成功 → 立即关闭；有部分失败 → 也关闭（失败信息已展示过）
      visible.value = false
    } catch (err: any) {
      globalError.value =
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        t('upload_err_save_failed')
    } finally {
      saving.value = false
    }
  } finally {
    if (token === runToken) running.value = false
  }
}

// ============================================================
// 关闭
// ============================================================

function handleClose() {
  if (busy.value) return
  visible.value = false
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '92vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    :close-on-click-overlay="!busy"
    teleport="body"
  >
    <div class="upload-photo">
      <header class="upload-photo__header">
        <h2 class="upload-photo__title">{{ t('upload_photo_title') }}</h2>
        <p class="upload-photo__subtitle">
          {{
            items.length === 0
              ? t('upload_photo_subtitle')
              : overallText
          }}
        </p>
      </header>

      <!-- 状态 1：选择文件 -->
      <div v-if="items.length === 0" class="upload-photo__body">
        <van-uploader
          v-model="uploaderList"
          :after-read="handleAfterRead"
          :multiple="true"
          :max-count="MAX_FILES"
          :preview-image="false"
          :disabled="!canUpload"
          accept="image/*,.heic,.heif"
          class="upload-photo__uploader"
        >
          <div class="picker">
            <div class="picker__icon">
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <div class="picker__text">{{ t('upload_photo_select') }}</div>
            <div class="picker__hint">
              {{ t('upload_photo_hint', { max: MAX_FILES }) }}
            </div>
          </div>
        </van-uploader>

        <p class="upload-photo__tips">
          {{ t('upload_photo_compress_tip') }}
        </p>
      </div>

      <!-- 状态 2：上传进度列表 -->
      <div v-else class="upload-photo__body">
        <ul class="items">
          <li
            v-for="item in items"
            :key="item.uid"
            class="item"
            :class="`item--${item.status}`"
          >
            <div class="item__thumb">
              <img v-if="item.previewUrl" :src="item.previewUrl" alt="" />
              <van-loading
                v-else-if="item.status !== 'pending'"
                type="spinner"
                size="16"
              />
            </div>

            <div class="item__main">
              <div class="item__top">
                <span class="item__name">{{ item.file.name }}</span>
                <span class="item__status">{{ statusText(item) }}</span>
              </div>

              <div class="item__meta">
                {{ formatSize(item.file.size) }}
              </div>

              <div v-if="item.status === 'uploading'" class="item__progress">
                <div
                  class="item__progress-bar"
                  :style="{ width: Math.max(item.progress, 2) + '%' }"
                />
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 全局错误 -->
      <p v-if="globalError" class="upload-photo__error">{{ globalError }}</p>

      <!-- 底部按钮 -->
      <div v-if="items.length > 0" class="upload-photo__actions">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="busy"
          @click="handleClose"
        >
          {{ busy ? t('pets_loading') : t('btn_close') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 弹窗主体
// ============================================================
.upload-photo {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
  padding: @sp-5 @sp-5 @sp-4;

  @media (max-width: @bp-sm) {
    padding: @sp-4 @sp-4 @sp-3;
  }

  &__header {
    flex-shrink: 0;
    text-align: center;
    margin-bottom: @sp-4;
  }

  &__title {
    margin: 0 0 @sp-1;
    font-family: @font-serif;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__subtitle {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
    min-height: 20px;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: @sp-3;
  }

  &__uploader {
    width: 100%;

    :deep(.van-uploader__wrapper) {
      width: 100%;
    }
    :deep(.van-uploader__input-wrapper) {
      width: 100%;
    }
  }

  &__tips {
    margin: 0;
    font-size: @fs-xs;
    color: @ink-3;
    text-align: center;
  }

  &__error {
    margin: @sp-3 0 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
  }

  &__actions {
    flex-shrink: 0;
    margin-top: @sp-3;
    padding-top: @sp-3;
    border-top: 1px solid @border;

    .btn {
      width: 100%;
    }
  }
}

// ============================================================
// 选择区
// ============================================================
.picker {
  width: 100%;
  padding: 32px 16px;
  border: 1.5px dashed @border-strong;
  border-radius: @radius-lg;
  background: @surface-2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-2;
  cursor: pointer;
  transition: border-color @dur-fast ease, background @dur-fast ease;

  &:hover {
    border-color: @accent;
    background: @accent-soft;
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: @surface;
    border: 1px solid @border;
    display: flex;
    align-items: center;
    justify-content: center;
    color: @ink-2;
  }

  &__text {
    font-size: @fs-base;
    font-weight: 500;
    color: @ink-1;
  }

  &__hint {
    font-size: @fs-xs;
    color: @ink-3;
    text-align: center;
    line-height: 1.5;
    max-width: 320px;
  }
}

// ============================================================
// 上传列表
// ============================================================
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: @sp-2;
}

.item {
  display: flex;
  gap: @sp-3;
  align-items: center;
  padding: @sp-2;
  border: 1px solid @border;
  border-radius: @radius;
  background: @surface-2;
  transition: border-color @dur-fast ease, background @dur-fast ease;

  &--done {
    border-color: @accent;
  }

  &--error {
    border-color: fade(@danger, 40%);
    background: fade(@danger, 6%);
  }

  &__thumb {
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    border-radius: @radius-sm;
    overflow: hidden;
    background: @surface;
    border: 1px solid @border;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: @sp-2;
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    font-size: @fs-xs;
    color: @ink-2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__status {
    flex: 0 0 auto;
    font-size: @fs-xs;
    color: @ink-3;
    font-weight: 500;
  }

  &--done &__status {
    color: @accent;
  }

  &--error &__status {
    color: @danger;
  }

  &__meta {
    font-family: @font-mono;
    font-size: 11px;
    color: @ink-3;
  }

  &__progress {
    height: 3px;
    background: @border;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 2px;
  }

  &__progress-bar {
    height: 100%;
    background: @accent;
    border-radius: 2px;
    transition: width .2s ease;
  }
}
</style>