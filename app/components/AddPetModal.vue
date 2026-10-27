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
  hometown: string
  avatarUrl: string
  bio: string
  personality: string          // ← 新增
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
  breed: '',
  hometown: '',
  personality: '',             // ← 新增（非必填）
  birthday: '',
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
// 生日选择器
// ============================================================

const showDatePicker = ref(false)
const datePickerValue = ref<string[]>(['2020', '01', '01'])
const minDate = new Date(2000, 0, 1)
const maxDate = new Date()

function openDatePicker() {
  if (form.birthday) {
    const [y, m, d] = form.birthday.split('-')
    if (y && m && d) datePickerValue.value = [y, m, d]
  }
  showDatePicker.value = true
}

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  form.birthday = selectedValues.join('-')
  showDatePicker.value = false
}

function clearBirthday() {
  form.birthday = ''
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
// 校验
// ============================================================

function validate(): boolean {
  errors.name = ''
  errors.avatar = ''
  errors.species = ''
  errors.global = ''

  let ok = true

  if (!form.name.trim()) {
    errors.name = t('err_name_required')
    ok = false
  } else if (form.name.trim().length > 50) {
    errors.name = t('err_name_too_long')
    ok = false
  }

  if (!avatarFile.value) {
    errors.avatar = t('err_avatar_required')
    ok = false
  }

  if (!form.species.trim()) {
    errors.species = t('err_species_required')
    ok = false
  }

  return ok
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
        breed: form.breed.trim() || undefined,
        hometown: form.hometown.trim() || undefined,
        personality: form.personality.trim() || undefined,  // ← 新增
        birthday: form.birthday || undefined,
        avatarUrl: url,
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
  form.breed = ''
  form.hometown = ''
  form.personality = ''        // ← 新增
  form.birthday = ''
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

        <!-- 品种 -->
        <div class="field">
          <label class="field__label" for="pet-breed">{{ t('field_breed') }}</label>
          <input
            id="pet-breed"
            v-model.trim="form.breed"
            type="text"
            class="input"
            :placeholder="t('placeholder_breed')"
            maxlength="60"
            :disabled="loading"
          />
        </div>

        <!-- 家乡 -->
        <div class="field">
          <label class="field__label" for="pet-hometown">{{ t('field_hometown') }}</label>
          <input
            id="pet-hometown"
            v-model.trim="form.hometown"
            type="text"
            class="input"
            :placeholder="t('placeholder_hometown')"
            maxlength="100"
            :disabled="loading"
          />
        </div>

        <!-- 性格爱好（非必填） -->
        <div class="field">
          <label class="field__label" for="pet-personality">
            {{ t('field_personality') }}
          </label>
          <textarea
            id="pet-personality"
            v-model="form.personality"
            class="input textarea"
            :placeholder="t('placeholder_personality')"
            maxlength="200"
            rows="3"
            :disabled="loading"
          ></textarea>
          <span class="field__hint">{{ form.personality.length }} / 200</span>
        </div>

        <!-- 生日 -->
        <div class="field">
          <label class="field__label" for="pet-birthday">{{ t('field_birthday') }}</label>
          <div class="date-field" @click="openDatePicker">
            <span :class="{ 'date-field__placeholder': !form.birthday }">
              {{ form.birthday || t('placeholder_birthday') }}
            </span>
            <van-icon
              v-if="form.birthday"
              name="cross"
              class="date-field__clear"
              @click.stop="clearBirthday"
            />
          </div>
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

    <!-- 生日选择器 -->
    <van-popup
      v-model:show="showDatePicker"
      position="bottom"
      round
      teleport="body"
    >
      <van-date-picker
        v-model="datePickerValue"
        :title="t('date_picker_title')"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 弹窗主体
// ============================================================
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

// 非必填字段底部的字数提示
.field__hint {
  display: block;
  margin-top: 4px;
  font-size: @fs-xs;
  color: @ink-3;
  text-align: right;
}

// ============================================================
// 头像上传
// ============================================================
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

// ============================================================
// 生日字段
// ============================================================
.date-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  font-size: @fs-base;
  color: @ink-1;
  background: @surface;
  border: 1px solid @border-strong;
  border-radius: @radius;
  cursor: pointer;
  transition: border-color @dur-fast ease;

  &:hover {
    border-color: @accent;
  }

  &__placeholder {
    color: @ink-3;
  }

  &__clear {
    color: @ink-3;
    padding: 4px;
    cursor: pointer;
    transition: color @dur-fast ease;

    &:hover { color: @danger; }
  }
}

// ============================================================
// 多行文本（性格爱好）
// ============================================================
.textarea {
  min-height: 76px;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;       // textarea 默认 monospace，覆盖掉以保持和 input 视觉一致

  &:disabled {
    cursor: not-allowed;
    background: @surface-2;
    color: @ink-3;
  }
}
</style>