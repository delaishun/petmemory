<!-- app/components/EditPetModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

/** 编辑弹窗需要的宠物初始数据 */
export interface EditablePet {
  id: number
  slug: string
  name: string
  species: string
  breed: string
  hometown: string
  birthday: string | null   // 'YYYY-MM-DD' 或 null
  status: number            // 1=正常 0=隐藏 2=封禁
  personality?: string      // 可选，兜底做兼容
  soundEffect?: string      // 可选，兜底做兼容
}

/** 后端 PATCH /api/pets/:slug 返回 */
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
  personality: string
  soundEffect: string
  status?: number
  createdAt: string
}

interface Props {
  modelValue: boolean
  pet: EditablePet | null
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
// 状态与计算属性
// ============================================================

const form = reactive({
  name: '',
  species: '',
  breed: '',
  hometown: '',
  personality: '',
  birthday: '',        // 'YYYY-MM-DD' 或空
  hidden: false,       // true = status 0
})

const errors = reactive({
  name: '',
  species: '',
  global: '',
})

const loading = ref(false)
const { $api } = useNuxtApp()

// 👇 新增：判断是否被封禁
const isBanned = computed(() => props.pet?.status === 2)

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
// 从 props.pet 初始化表单
// ============================================================

function fillFromPet() {
  const p = props.pet
  if (!p) return
  form.name = p.name
  form.species = p.species
  form.breed = p.breed
  form.hometown = p.hometown
  form.personality = p.personality ?? ''
  form.birthday = p.birthday ?? ''
  form.hidden = p.status === 0
  errors.name = ''
  errors.species = ''
  errors.global = ''
}

// 打开时填充；关闭时不清（关掉后再打开会重新填充）
watch(
  () => props.modelValue,
  (open) => {
    if (open) fillFromPet()
  },
  { immediate: true }
)

// pet 中途变化也刷新
watch(
  () => props.pet,
  () => {
    if (props.modelValue) fillFromPet()
  }
)

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
  } else {
    datePickerValue.value = ['2020', '01', '01']
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
// 校验
// ============================================================

function validate(): boolean {
  errors.name = ''
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

  if (!form.species.trim()) {
    errors.species = t('err_species_required')
    ok = false
  }

  return ok
}

// ============================================================
// 提交
// ============================================================

async function handleSubmit() {
  if (loading.value) return
  if (!validate()) return
  if (!props.pet) return

  loading.value = true
  errors.global = ''

  try {
    // 👇 构建提交数据
    const body: any = {
      name: form.name.trim(),
      species: form.species.trim(),
      breed: form.breed.trim(),
      hometown: form.hometown.trim(),
      personality: form.personality.trim(),
      birthday: form.birthday || null,
      soundEffect: detectSoundEffect(form.species),
    }

    // 👇 核心修改：只有非封禁状态，才提交 status
    if (!isBanned.value) {
      body.status = form.hidden ? 0 : 1
    }

    const updated = await $api<PetPublic>(
      `/api/pets/${props.pet.slug}`,
      {
        method: 'PATCH',
        body,
      },
    )

    showToast({ type: 'success', message: t('msg_saved') })
    emit('success', updated)
    visible.value = false
  } catch (err: any) {
    errors.global =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      t('err_save_failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{ maxHeight: '92vh', width: 'min(600px, 100%)', left: '50%', right: 'auto', translate: '-50% 0' }"
    :close-on-click-overlay="!loading"
    teleport="body"
  >
    <div class="edit-pet">
      <header class="edit-pet__header">
        <h2 class="edit-pet__title">{{ t('edit_pet_title') }}</h2>
        <p class="edit-pet__subtitle">{{ t('edit_pet_subtitle') }}</p>
      </header>

      <form class="edit-pet__form" @submit.prevent="handleSubmit">
        <!-- 名字 -->
        <div class="field">
          <label class="field__label" for="edit-pet-name">
            {{ t('field_name') }} <span class="field__required">*</span>
          </label>
          <input
            id="edit-pet-name"
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
          <label class="field__label" for="edit-pet-species">
            {{ t('field_species') }} <span class="field__required">*</span>
          </label>
          <input
            id="edit-pet-species"
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
          <label class="field__label" for="edit-pet-breed">{{ t('field_breed') }}</label>
          <input
            id="edit-pet-breed"
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
          <label class="field__label" for="edit-pet-hometown">{{ t('field_hometown') }}</label>
          <input
            id="edit-pet-hometown"
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
          <label class="field__label" for="edit-pet-personality">
            {{ t('field_personality') }}
          </label>
          <textarea
            id="edit-pet-personality"
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
          <label class="field__label" for="edit-pet-birthday">{{ t('field_birthday') }}</label>
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

        <!-- 隐藏开关 (带封禁状态判断) -->
        <div class="switch-field">
          <div class="switch-field__text">
            <div class="switch-field__label">
              {{ isBanned ? '宠物已被封禁' : t('switch_hide_title') }}
            </div>
            <div class="switch-field__hint" :class="{ 'is-banned-text': isBanned }">
              {{ isBanned ? '请联系管理员解除封禁，您暂时无法修改可见状态。' : t('switch_hide_hint') }}
            </div>
          </div>
          <van-switch
            v-model="form.hidden"
            :disabled="loading || isBanned"
            size="22"
            active-color="#A66039"
          />
        </div>

        <!-- 全局错误 -->
        <p v-if="errors.global" class="edit-pet__error">{{ errors.global }}</p>

        <!-- 操作按钮 -->
        <div class="edit-pet__actions">
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
            {{ loading ? t('btn_saving') : t('btn_confirm') }}
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
.edit-pet {
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
// 隐藏开关行
// ============================================================
.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: @sp-4;
  margin-bottom: @sp-4;
  padding: @sp-3 @sp-4;
  background: @surface-2;
  border: 1px solid @border;
  border-radius: @radius;

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__label {
    font-size: @fs-base;
    font-weight: 500;
    color: @ink-1;
    margin-bottom: 2px;
  }

  &__hint {
    font-size: @fs-xs;
    color: @ink-3;
    line-height: 1.4;

    // 👇 新增：封禁警告样式
    &.is-banned-text {
      color: @danger;
      font-weight: 500;
    }
  }
}

// ============================================================
// 多行文本（性格爱好）
// ============================================================
.textarea {
  min-height: 76px;
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;       // textarea 默认 monospace，覆盖掉以保持视觉一致

  &:disabled {
    cursor: not-allowed;
    background: @surface-2;
    color: @ink-3;
  }
}
</style>