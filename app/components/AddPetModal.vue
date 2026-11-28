<!-- app/components/AddPetModal.vue -->
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

interface PetPublic {
  id: number
  slug: string
  name: string
  species: string
  breed: string
  gender: number
  birthday: string | null
  leaveDate: string | null
  hometown: string
  avatarUrl: string
  bio: string
  personality: string
  soundEffect: string
  createdAt: string
}

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', pet: PetPublic): void
}>()

// ============================================================
// v-model 代理
// ============================================================

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ============================================================
// 表单状态
// ============================================================

const form = reactive({
  name: '',
  species: '',
})

const errors = reactive({
  name: '',
  avatar: '',
  species: '',
  global: '',
})

const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string>('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const loading = ref(false)

const { $api } = useNuxtApp()

// ============================================================
// 弹窗样式
// ============================================================

const popupStyle = {
  maxHeight: '92vh',
  width: 'min(600px, 100%)',
  left: '50%',
  right: 'auto',
  translate: '-50% 0',
} as const

// ============================================================
// 根据物种识别叫声参数
// ============================================================

function detectSoundEffect(speciesStr: string): string {
  const s = speciesStr.toLowerCase()
  if (s.includes('狗') || s.includes('dog')) return 'wang'
  if (s.includes('猫') || s.includes('cat')) return 'miao'
  if (s.includes('鸭') || s.includes('duck')) return 'duck'
  if (s.includes('鸟') || s.includes('bird')) return 'birds'
  if (
    s.includes('鼠') || 
    s.includes('mouse') || 
    s.includes('rat') || 
    s.includes('hamster') || 
    s.includes('squirrel')
  ) return 'mouse'
  return 'ring'
}

// ============================================================
// 头像选择
// ============================================================

function triggerFileInput() {
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
    errors.avatar = t('err_select_image')
    return
  }

  errors.avatar = ''
  avatarFile.value = file

  const reader = new FileReader()
  reader.onload = () => {
    avatarPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

// ============================================================
// 校验（弹窗提示）
// ============================================================

function validate(): boolean {
  errors.name = ''
  errors.avatar = ''
  errors.species = ''
  errors.global = ''

  const missing: string[] = []

  if (!form.name.trim()) {
    errors.name = t('err_name_required')
    missing.push(t('field_name'))
  } else if (form.name.trim().length > 50) {
    errors.name = t('err_name_too_long')
    showToast(t('err_name_too_long'))
    return false
  }

  if (!avatarFile.value) {
    errors.avatar = t('err_avatar_required')
    missing.push(t('field_avatar'))
  }

  if (!form.species.trim()) {
    errors.species = t('err_species_required')
    missing.push(t('field_species'))
  }

  if (missing.length > 0) {
    showToast(`${t('err_please_fill')}: ${missing.join(' / ')}`)
    return false
  }

  return true
}

// ============================================================
// 提交：处理头像 → 上传 OSS → 创建宠物
// ============================================================

async function handleSubmit() {
  if (loading.value) return
  if (!validate()) return
  if (!avatarFile.value) return

  loading.value = true
  errors.global = ''

  try {
    const processed = await processAvatar(avatarFile.value)
    const filename = buildFilename(processed.ext)
    const { url } = await uploadToOss(processed.blob, filename, {
      fdir: 'petm_pavatar',
    })

    const pet = await $api<PetPublic>('/api/pets', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        species: form.species.trim(),
        avatarUrl: url,
        soundEffect: detectSoundEffect(form.species),
      },
    })

    showToast({ type: 'success', message: t('msg_pet_created') })
    emit('success', pet)
    visible.value = false
  } catch (err: any) {
    if (err instanceof ImageProcessError) {
      errors.avatar = err.message
    } else {
      errors.global =
        err?.data?.error ||
        err?.data?.message ||
        err?.message ||
        t('err_create_failed')
    }
  } finally {
    loading.value = false
  }
}

// ============================================================
// 重置
// ============================================================

function resetForm() {
  form.name = ''
  form.species = ''
  avatarFile.value = null
  avatarPreview.value = ''
  errors.name = ''
  errors.avatar = ''
  errors.species = ''
  errors.global = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) resetForm()
  }
)
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="popupStyle"
    :close-on-click-overlay="!loading"
    teleport="body"
  >
    <div class="add-pet">
      <header class="add-pet__header">
        <h2 class="add-pet__title">{{ t('add_pet_title') }}</h2>
        <p class="add-pet__subtitle">{{ t('add_pet_subtitle') }}</p>
      </header>

      <div class="add-pet__promo">
        <p class="add-pet__promo-video">
          <span class="promo-badge">🎬</span>
          {{ t('home_about_promo_video') }}
        </p>
        <p class="add-pet__promo-deadline">
          <span class="promo-badge">⏰</span>
          {{ t('home_about_promo_deadline') }}
        </p>
      </div>

      <form class="add-pet__form" @submit.prevent="handleSubmit">
        <!-- 头像上传 -->
        <div class="avatar-upload">
          <div class="avatar-upload__circle" @click="triggerFileInput">
            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              class="avatar-upload__img"
              alt="Avatar Preview"
            />
            <div v-else class="avatar-upload__placeholder">
              <van-icon name="photograph" size="22" />
              <span>{{ t('upload_avatar') }}</span>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,.heic,.heif"
            class="avatar-upload__input"
            @change="onFileChange"
          />
          <p v-if="errors.avatar" class="field__error avatar-upload__error">
            {{ errors.avatar }}
          </p>
        </div>

        <!-- 名字 -->
        <div class="field">
          <label class="field__label" for="pet-name">
            {{ t('field_name') }} <span class="field__required">*</span>
          </label>
          <input
            id="pet-name"
            v-model.trim="form.name"
            type="text"
            class="input"
            :placeholder="t('placeholder_name')"
            maxlength="50"
            :disabled="loading"
          />
          <span v-if="errors.name" class="field__error">{{ errors.name }}</span>
        </div>

        <!-- 物种 -->
        <div class="field">
          <label class="field__label" for="pet-species">
            {{ t('field_species') }} <span class="field__required">*</span>
          </label>
          <input
            id="pet-species"
            v-model.trim="form.species"
            type="text"
            class="input"
            :placeholder="t('placeholder_species')"
            maxlength="30"
            :disabled="loading"
          />
          <span v-if="errors.species" class="field__error">{{ errors.species }}</span>
        </div>

        <!-- 全局错误 -->
        <p v-if="errors.global" class="add-pet__error">{{ errors.global }}</p>

        <!-- 操作按钮 -->
        <div class="add-pet__actions">
          <button
            type="button"
            class="btn btn--lg"
            :disabled="loading"
            @click="visible = false"
          >
            {{ t('btn_cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn--primary btn--lg"
            :disabled="loading"
          >
            {{ loading ? t('btn_processing') : t('btn_confirm') }}
          </button>
        </div>
      </form>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.add-pet {
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
  }

  &__promo {
    flex-shrink: 0;
    margin: 0 0 @sp-3;
    padding: @sp-2 @sp-3;
    background: linear-gradient(135deg, #FFF7EC 0%, #FFF0F5 100%);
    border: 1px solid #F5D7B8;
    border-radius: @radius;
    display: flex;
    flex-direction: column;
    gap: 4px;

    p {
      margin: 0;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      font-size: 12px;
      line-height: 1.5;
    }

    .promo-badge {
      flex-shrink: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    &-video {
      color: #A85A1A;
      font-weight: 500;
    }

    &-deadline {
      color: #C0392B;
      font-weight: 600;
    }
  }

  &__form {
    overflow-y: auto;
    padding-bottom: @sp-2;

    .field:last-of-type {
      margin-bottom: @sp-3;
    }
  }

  &__error {
    margin: 0 0 @sp-3;
    padding: @sp-2 @sp-3;
    font-size: @fs-sm;
    color: @danger;
    background: fade(@danger, 8%);
    border-radius: @radius-sm;
  }

  &__actions {
    display: flex;
    gap: @sp-3;
    margin-top: @sp-2;
    padding-top: @sp-3;
    border-top: 1px solid @border;

    .btn { flex: 1; }
  }
}

.field__required {
  color: @danger;
  margin-left: 2px;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-2;
  margin-bottom: @sp-4;

  &__circle {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: @surface-2;
    border: 2px dashed @border-strong;
    transition: border-color @dur-fast ease, background @dur-fast ease;

    &:hover {
      border-color: @accent;
      background: @accent-soft;
    }
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: @ink-3;
    font-size: @fs-xs;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__input {
    display: none;
  }

  &__error {
    margin: 0;
    text-align: center;
  }
}
</style>