<!-- app/components/EditNicknameModal.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

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
  point?: number
}

interface Props {
  modelValue: boolean
  currentNickname: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', user: PublicUser): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { $api } = useNuxtApp()

const nickname = ref('')
const loading = ref(false)
const error = ref('')

// 弹窗打开时初始化输入框
watch(visible, (open) => {
  if (open) {
    nickname.value = props.currentNickname
    error.value = ''
  }
})

async function handleSubmit() {
  const val = nickname.value.trim()
  if (!val) {
    error.value = t('edit_nickname_empty')
    return
  }
  if (val === props.currentNickname) {
    visible.value = false
    return
  }

  loading.value = true
  error.value = ''

  try {
    const updatedUser = await $api<PublicUser>('/api/users/me/nickname', {
      method: 'PATCH',
      body: { nickname: val },
    })
    showToast({ type: 'success', message: t('edit_nickname_success') })
    emit('success', updatedUser)
    visible.value = false
  } catch (err: any) {
    error.value = err?.data?.error || err?.data?.message || t('edit_nickname_failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="{ width: 'min(340px, 90%)' }"
    teleport="body"
    :close-on-click-overlay="!loading"
  >
    <div class="edit-nickname">
      <h3 class="edit-nickname__title">{{ t('edit_nickname_title') }}</h3>
      
      <div class="edit-nickname__field">
        <input
          v-model="nickname"
          type="text"
          class="input"
          :placeholder="t('edit_nickname_placeholder')"
          maxlength="50"
          @keyup.enter="handleSubmit"
        />
        <p v-if="error" class="edit-nickname__error">{{ error }}</p>
      </div>

      <div class="edit-nickname__actions">
        <button type="button" class="btn btn--lg" :disabled="loading" @click="visible = false">
          {{ t('btn_cancel') }}
        </button>
        <button type="button" class="btn btn--primary btn--lg" :disabled="loading" @click="handleSubmit">
          {{ loading ? t('btn_saving') : t('btn_confirm') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.edit-nickname {
  display: flex;
  flex-direction: column;
  padding: @sp-6 @sp-5 @sp-5;

  &__title {
    margin: 0 0 @sp-4;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    text-align: center;
  }

  &__field {
    margin-bottom: @sp-4;
  }

  &__error {
    margin: @sp-2 0 0;
    font-size: @fs-xs;
    color: @danger;
  }

  &__actions {
    display: flex;
    gap: @sp-3;

    .btn {
      flex: 1;
    }
  }
}
</style>
