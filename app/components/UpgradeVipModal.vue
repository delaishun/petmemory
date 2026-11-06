<!-- app/components/UpgradeVipModal.vue -->
<script setup lang="ts">
import { showToast } from "vant";
import { useI18n } from "~/composables/useI18n";
import type { AuthUser } from "~/types/auth";

const { t } = useI18n();
const { $api } = useNuxtApp();
const me = useState<AuthUser | null>("auth:user", () => null);

const config = useRuntimeConfig();
const paddleClientToken = String(config.public.paddleClientToken || "");
const paymentProvider = String(config.public.paymentProvider || "paddle");

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const submitting = ref(false);

// 👇 修正：全局对象名称改为 DodoPaymentsCheckout
declare global {
  interface Window {
    Paddle: any;
    DodoPaymentsCheckout: any;
  }
}

// ============================================================
// 工具函数：等待第三方 SDK 加载完成（类型同步更新）
// ============================================================
function waitForSDK(sdkName: 'Paddle' | 'DodoPaymentsCheckout'): Promise<any> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;

    const check = () => {
      if (window[sdkName]) {
        resolve(window[sdkName]);
      } else if (attempts >= maxAttempts) {
        reject(new Error(`${sdkName} SDK load timeout`));
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    check();
  });
}

// ============================================================
// Paddle 相关逻辑
// ============================================================
let paddleInitialized = false;
async function initPaddle() {
  if (paddleInitialized || !paddleClientToken) return;
  try {
    const paddle = await waitForSDK('Paddle');
    if (paddleClientToken.startsWith("test_")) {
      paddle.Environment.set("sandbox");
    }

    paddle.Initialize({
      token: paddleClientToken,
      eventCallback: (event: any) => {
        if (event.name === "checkout.completed") {
          handleSuccess();
        }
      },
    });
    paddleInitialized = true;
  } catch (err) {
    console.error("Paddle Init Failed:", err);
  }
}

async function handlePaddleSubscribe() {
  const paddle = await waitForSDK('Paddle');
  const res = await $api<{ priceId: string; userId: number }>(
    "/api/paddle/checkout-vip",
    { method: "POST" }
  );

  paddle.Checkout.open({
    items: [{ priceId: res.priceId, quantity: 1 }],
    customData: { userId: res.userId, type: "vip" },
  });
}

// ============================================================
// 👇 核心修改：Dodo Payments 相关逻辑
// ============================================================
async function handleDodoSubscribe() {
  // 1. 请求后端创建 Checkout Session
  const res = await $api<{ checkout_url: string; session_id: string }>(
    "/api/dodo/create-checkout",
    {
      method: "POST",
      body: { type: "vip", payload: {} }
    }
  );

  // 2. 获取正确的全局 SDK 对象
  const DodoPaymentsCheckout = await waitForSDK('DodoPaymentsCheckout');
  
  if (res.checkout_url) {
    // 3. 先初始化，再打开收银台
    DodoPaymentsCheckout.Initialize({
      mode: 'test', // 上线时改为 'live'
      displayType: 'overlay',
      onEvent: (event: any) => {
        // 支付成功
        if (event.event_type === 'payment.succeeded') {
          console.log('Dodo payment success', event);
          handleSuccess();
        }
        // 用户主动关闭弹窗
        if (event.event_type === 'checkout.closed') {
          submitting.value = false;
        }
        // 支付发生错误
        if (event.event_type === 'checkout.error') {
          showToast(event.data?.message || '支付发生错误');
          submitting.value = false;
        }
      }
    });

    // 打开 Overlay
    await DodoPaymentsCheckout.Checkout.open({
      checkoutUrl: res.checkout_url,
    });
  } else {
    throw new Error("Failed to get checkout URL");
  }
}

// ============================================================
// 统一入口与状态处理
// ============================================================
function handleSuccess() {
  showToast({
    type: "success",
    message: t("vip_subscribe_success"),
  });
  visible.value = false;
  submitting.value = false;
  emit("success");
}

// 监听弹窗打开，如果是 Paddle 模式则需要提前初始化
watch(visible, (open) => {
  if (open && paymentProvider === "paddle") {
    initPaddle();
  }
});

async function handleSubscribe() {
  submitting.value = true;
  try {
    if (paymentProvider === "dodo") {
      await handleDodoSubscribe();
    } else {
      await handlePaddleSubscribe();
    }
  } catch (err: any) {
    showToast(err?.data?.error || err.message || "发起支付失败，请重试");
    submitting.value = false;
  } finally {
    if (paymentProvider === "paddle") {
      submitting.value = false;
    }
  }
}
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    :style="{ width: 'min(380px, 90%)' }"
    teleport="body"
    :close-on-click-overlay="!submitting"
    class="vip-modal"
  >
    <div class="vip-modal__content">
      <!-- 顶部皇冠 -->
      <div class="vip-modal__header">
        <van-icon name="gem-o" class="vip-modal__icon" />
        <h2 class="vip-modal__title">{{ t("user_upgrade_vip") }}</h2>
        <p class="vip-modal__subtitle">
          {{ t("vip_auto_renew_tip") }}
        </p>
      </div>

      <!-- 价格展示区 -->
      <div class="vip-modal__price-box">
        <div class="vip-modal__price">
          <span class="symbol">$</span>
          <span class="amount">9.90</span>
          <span class="period">/ {{ t("year") }}</span>
        </div>
      </div>

      <!-- 特权列表 -->
      <ul class="vip-modal__features">
        <li class="vip-modal__feature-item">
          <van-icon name="success" class="check-icon" />
          <span>{{ t("user_vip_desc_1") }}</span>
        </li>
        <li class="vip-modal__feature-item">
          <van-icon name="success" class="check-icon" />
          <span>{{ t("user_vip_desc_2") }}</span>
        </li>
        <li class="vip-modal__feature-item">
          <van-icon name="success" class="check-icon" />
          <span>{{ t("user_vip_desc_3") }}</span>
        </li>
        <li class="vip-modal__feature-item">
          <van-icon name="success" class="check-icon" />
          <span>{{ t("user_vip_desc_4") }}</span>
        </li>
        <li class="vip-modal__feature-item highlight">
          <van-icon name="gold-coin-o" class="check-icon" />
          <span>{{ t("vip_bonus_points_tip") }}</span>
        </li>
      </ul>

      <!-- 底部操作 -->
      <div class="vip-modal__actions">
        <button
          type="button"
          class="btn btn--lg vip-modal__cancel"
          :disabled="submitting"
          @click="visible = false"
        >
          {{ t("btn_cancel") }}
        </button>
        <button
          type="button"
          class="btn btn--lg vip-modal__submit"
          :disabled="submitting"
          @click="handleSubscribe"
        >
          {{
            submitting
              ? t("btn_processing")
              : t("vip_subscribe_btn")
          }}
        </button>
      </div>

      <!-- 小字提示 -->
      <p class="vip-modal__terms">
        {{ t("vip_terms_tip") }}
      </p>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.vip-modal {
  &__content {
    display: flex;
    flex-direction: column;
    padding: @sp-6 @sp-5 @sp-4;
    background: linear-gradient(180deg, #fffdf8 0%, #ffffff 100%);
  }

  &__header {
    text-align: center;
    margin-bottom: @sp-4;
  }

  &__icon {
    font-size: 48px;
    color: #f1c40f;
    margin-bottom: @sp-2;
    filter: drop-shadow(0 4px 12px rgba(241, 196, 15, 0.4));
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

  &__price-box {
    display: flex;
    justify-content: center;
    margin-bottom: @sp-5;
  }

  &__price {
    display: flex;
    align-items: baseline;
    color: @ink-1;

    .symbol {
      font-size: @fs-lg;
      font-weight: 600;
      color: @ink-2;
    }
    .amount {
      font-size: 42px;
      font-family: @font-mono;
      font-weight: 700;
      color: #d4af37;
      margin: 0 4px;
    }
    .period {
      font-size: @fs-sm;
      color: @ink-3;
    }
  }

  &__features {
    list-style: none;
    padding: 0;
    margin: 0 0 @sp-6;
    background: @surface-2;
    border-radius: @radius-lg;
    padding: @sp-4;
    border: 1px solid @border;

    .highlight {
      color: #d4af37;
      font-weight: 600;
    }
  }

  &__feature-item {
    display: flex;
    align-items: flex-start;
    gap: @sp-2;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.5;

    & + & {
      margin-top: @sp-3;
    }

    .check-icon {
      color: #d4af37;
      font-size: 16px;
      margin-top: 2px;
      flex-shrink: 0;
    }
  }

  &__actions {
    display: flex;
    gap: @sp-3;
    margin-bottom: @sp-3;

    .btn {
      flex: 1;
      height: 44px;
    }
  }

  &__cancel {
    color: @ink-2;
    background: @surface;
    border-color: @border-strong;

    &:hover {
      border-color: @accent;
      color: @accent;
    }
  }

  &__submit {
    color: @ink-1;
    background: linear-gradient(135deg, #f1c40f 0%, #e5b769 100%);
    border: none;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(241, 196, 15, 0.3);

    &:hover {
      background: linear-gradient(135deg, #f4d03f 0%, #d4af37 100%);
    }

    &:disabled {
      opacity: 0.7;
    }
  }

  &__terms {
    margin: 0;
    font-size: 11px;
    color: @ink-3;
    text-align: center;
    line-height: 1.4;
  }
}
</style>