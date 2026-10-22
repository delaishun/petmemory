<!-- app/components/AvatarUploadModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { processAvatar, ImageProcessError } from '~/utils/image-process'
import { uploadToOss, buildFilename } from '~/utils/upload'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

/** PATCH /api/users/me/avatar 返回的 PublicUser（只取需要的字段） */
interface PublicUser {
  id: number
  nickname: string
  avatarUrl: string | null
  avatarUpdatedAt: string | null
  email: string
  vipExpiresAt: string | null
  isVip: boolean
  createdAt: string
  bio: string | null
}

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', user: PublicUser): void
}>()

// ============================================================
// v-model 代理
// ============================================================

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ============================================================
// 状态
// ============================================================

const { $api } = useNuxtApp()

const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string>('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const loading = ref(false)
const error = ref('')

const canSubmit = computed(
  () => !!avatarFile.value && !loading.value,
)

// ============================================================
// 弹窗样式：窄一点（360px），居中对齐
// ============================================================

const popupStyle = {
  maxHeight: '92vh',
  width: 'min(360px, 92%)',
  left: '50%',
  right: 'auto',
  translate: '-50% 0',
} as const

// ============================================================
// 选择文件
// ============================================================

function triggerFileInput() {
  if (loading.value) return
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const isImage =
    file.type.startsWith('image/') ||
    /\.(heic|heif)$/i.test(file.name)
  if (!isImage) {
    error.value = t('err_select_image')
    return
  }

  error.value = ''
  avatarFile.value = file

  // 本地预览
  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

// ============================================================
// 重置
// ============================================================

function reset() {
  avatarFile.value = null
  avatarPreview.value = ''
  error.value = ''
  loading.value = false
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function handleCancel() {
  if (loading.value) return
  visible.value = false
}

// ============================================================
// 提交：处理头像 → 上传 OSS → PATCH /api/users/me/avatar
// ============================================================

async function handleSubmit() {
  if (!canSubmit.value) return
  if (!avatarFile.value) return

  loading.value = true
  error.value = ''

  try {
    // 1. 处理：中心裁剪为 200×200 正方形 WebP
    const processed = await processAvatar(avatarFile.value)

    // 2. 上传 OSS
    const filename = buildFilename(processed.ext)
    const { url } = await uploadToOss(processed.blob, filename, {
      fdir: 'pet_uavatars',
    })

    // 3. 提交到后端
    const user = await $api<PublicUser>('/api/users/me/avatar', {
      method: 'PATCH',
      body: { avatarUrl: url },
    })

    showToast({ type: 'success', message: t('avatar_update_success') })
    emit('success', user)
    visible.value = false
  } catch (err: any) {
    if (err instanceof ImageProcessError) {
      error.value = err.message
    } else {
      error.value =
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        t('avatar_upload_failed')
    }
  } finally {
    loading.value = false
  }
}

// 关闭时重置
watch(
  () => props.modelValue,
  (open) => {
    if (!open) reset()
  },
)
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="popupStyle"
    :close-on-click-overlay="!loading"
    teleport="body"
  >
    <div class="avatar-modal">
      <header class="avatar-modal__header">
        <h2 class="avatar-modal__title">{{ t('avatar_upload_title') }}</h2>
        <p class="avatar-modal__subtitle">
          {{ t('avatar_upload_subtitle') }}
        </p>
      </header>

      <!-- 头像预览 + 选择 -->
      <div class="avatar-modal__picker">
        <div
          class="avatar-modal__circle"
          :class="{ 'is-empty': !avatarPreview }"
          @click="triggerFileInput"
        >
          <img
            v-if="avatarPreview"
            :src="avatarPreview"
            class="avatar-modal__img"
            alt="Avatar Preview"
          />
          <div v-else class="avatar-modal__placeholder">
            <van-icon name="photograph" size="24" />
            <span>{{ t('avatar_select_image') }}</span>
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*,.heic,.heif"
          class="avatar-modal__input"
          @change="onFileChange"
        />
      </div>

      <!-- 提示 / 错误 -->
      <p v-if="error" class="avatar-modal__error">{{ error }}</p>
      <p v-else class="avatar-modal__hint">
        {{ t('avatar_hint_cooldown') }}
      </p>

      <!-- 操作 -->
      <div class="avatar-modal__actions">
        <button
          type="button"
          class="btn btn--lg"
          :disabled="loading"
          @click="handleCancel"
        >
          {{ t('btn_cancel') }}
        </button>
        <button
          type="button"
          class="btn btn--primary btn--lg"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ loading ? t('avatar_uploading') : t('btn_confirm') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.avatar-modal {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
  padding: @sp-6 @sp-5 @sp-5;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4 @sp-4;
  }

  &__header {
    text-align: center;
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
  }

  &__picker {
    display: flex;
    justify-content: center;
  }

  &__circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: @surface-2;
    transition: border-color @dur-fast ease, background @dur-fast ease;

    &.is-empty {
      border: 2px dashed @border-strong;

      &:hover {
        border-color: @accent;
        background: @accent-soft;
      }
    }
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: @ink-3;
    font-size: @fs-xs;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__input {
    display: none;
  }

  &__hint {
    margin: 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-xs;
    color: @ink-3;
    text-align: center;
    background: @surface-2;
    border-radius: @radius-sm;
  }

  &__error {
    margin: 0;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
    text-align: center;
  }

  &__actions {
    display: flex;
    gap: @sp-3;
    padding-top: @sp-3;
    border-top: 1px solid @border;

    .btn { flex: 1; }
  }
}
</style>