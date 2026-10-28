<!-- app/components/ManageSubscriptionModal.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="{ width: 'min(380px, 90%)' }"
    teleport="body"
    class="manage-modal"
  >
    <div class="manage-modal__content">
      <div class="manage-modal__header">
        <van-icon name="setting-o" class="manage-modal__icon" />
        <h2 class="manage-modal__title">{{ t('manage_sub_title') }}</h2>
        <p class="manage-modal__subtitle">{{ t('manage_sub_subtitle') }}</p>
      </div>

      <div class="manage-modal__body">
        <p class="manage-modal__desc">{{ t('manage_sub_desc') }}</p>
        
        <ol class="manage-modal__steps">
          <li>{{ t('manage_sub_step_1') }}</li>
          <li>{{ t('manage_sub_step_2') }}</li>
          <li>{{ t('manage_sub_step_3') }}</li>
          <li>{{ t('manage_sub_step_4') }}</li>
        </ol>

        <div class="manage-modal__tips">
          <van-icon name="info-o" class="tips-icon" />
          <span>{{ t('manage_sub_tips') }}</span>
        </div>
      </div>

      <div class="manage-modal__actions">
        <button 
          type="button" 
          class="btn btn--primary btn--lg manage-modal__btn" 
          @click="visible = false"
        >
          {{ t('btn_got_it') }}
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.manage-modal {
  &__content {
    display: flex;
    flex-direction: column;
    padding: @sp-6 @sp-5 @sp-5;
    background: @surface;
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-5;
  }

  &__icon {
    font-size: 42px;
    color: @ink-3;
    margin-bottom: @sp-2;
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
    color: @accent;
    font-weight: 500;
  }

  &__body {
    background: @surface-2;
    padding: @sp-4;
    border-radius: @radius-lg;
    border: 1px solid @border;
    margin-bottom: @sp-5;
  }

  &__desc {
    margin: 0 0 @sp-3;
    font-size: @fs-sm;
    color: @ink-2;
    font-weight: 500;
  }

  &__steps {
    margin: 0;
    padding-left: @sp-5;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.6;

    li {
      margin-bottom: @sp-2;
    }
  }

  &__tips {
    display: flex;
    align-items: flex-start;
    gap: @sp-1;
    margin-top: @sp-4;
    padding-top: @sp-3;
    border-top: 1px dashed @border;
    font-size: @fs-xs;
    color: @ink-3;
    line-height: 1.5;

    .tips-icon {
      margin-top: 2px;
      flex-shrink: 0;
    }
  }

  &__actions {
    display: flex;
  }

  &__btn {
    width: 100%;
  }
}
</style>