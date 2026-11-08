<!-- app/components/UpgradeVipModal.vue -->
<script setup lang="ts">
import { showToast } from "vant";
import { useI18n } from "~/composables/useI18n";
import type { AuthUser } from "~/types/auth";
import { DodoPayments } from "dodopayments-checkout";

const { t } = useI18n();
const { $api } = useNuxtApp();
const config = useRuntimeConfig();
const paddleClientToken = String(config.public.paddleClientToken || "");
const paymentProvider = String(config.public.paymentProvider || "paddle");

interface Props {
  modelValue: boolean;
  user?: {
    isLifetimeVip?: boolean;
    vipExpiresAt?: string | null;
  } | null;
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

// 当前正在处理哪种支付（防止重复点击）
const submittingPlan = ref<"lifetime" | "subscription" | null>(null);

// ============================================================
// 判断展示哪些卡片
// ============================================================
const isSubActive = computed(() => {
  return !!props.user?.vipExpiresAt && new Date(props.user.vipExpiresAt) > new Date();
});

const showLifetime = computed(() => {
  // 只要不是终身 VIP，就展示终身卡片（哪怕他现在是订阅）
  return !props.user?.isLifetimeVip;
});

const showSubscription = computed(() => {
  // 只要订阅过期了，就展示订阅卡片（哪怕他现在是终身）
  return !isSubActive.value;
});

// 👇 如果两者都不展示（理论上不可能），直接关闭
watch([showLifetime, showSubscription], ([l, s]) => {
  if (!l && !s && visible.value) visible.value = false;
});

// ============================================================
// SDK 初始化（保留原逻辑）
// ============================================================
declare global {
  interface Window {
    Paddle: any;
  }
}

function waitForSDK(sdkName: "Paddle"): Promise<any> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;
    const check = () => {
      if (window[sdkName]) resolve(window[sdkName]);
      else if (attempts >= maxAttempts) reject(new Error(`${sdkName} SDK load timeout`));
      else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    check();
  });
}

let paddleInitialized = false;
async function initPaddle() {
  if (paddleInitialized || !paddleClientToken) return;
  try {
    const paddle = await waitForSDK("Paddle");
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

// ============================================================
// 购买逻辑
// ============================================================
async function handlePaddleSubscribe(planType: "lifetime" | "subscription") {
  const paddle = await waitForSDK("Paddle");
  const res = await $api<{ priceId: string; userId: number }>(
    "/api/paddle/checkout-vip",
    { method: "POST", body: { planType } } // 👈 传给后端的 planType
  );

  paddle.Checkout.open({
    items: [{ priceId: res.priceId, quantity: 1 }],
    customData: { userId: res.userId, type: "vip", planType },
  });
}

async function handleDodoSubscribe(planType: "lifetime" | "subscription") {
  const res = await $api<{ checkout_url: string; session_id: string }>(
    "/api/dodo/create-checkout",
    {
      method: "POST",
      body: { type: "vip", payload: { planType } }, // 👈 传给后端的 planType
    }
  );

  if (!res.checkout_url) throw new Error("Failed to get checkout URL");

  DodoPayments.Initialize({
    mode: "test", // 上线时改为 'live'
    displayType: "overlay",
    onEvent: (event: any) => {
      if (event.event_type === "payment.succeeded") {
        handleSuccess();
      }
      if (event.event_type === "checkout.closed") {
        submittingPlan.value = null;
      }
      if (event.event_type === "checkout.error") {
        showToast(event.data?.message || "支付发生错误");
        submittingPlan.value = null;
      }
    },
  });

  await DodoPayments.Checkout.open({ checkoutUrl: res.checkout_url });
}

function handleSuccess() {
  showToast({ type: "success", message: t("vip_subscribe_success") });
  visible.value = false;
  submittingPlan.value = null;
  emit("success");
}

async function handleSubscribe(planType: "lifetime" | "subscription") {
  if (submittingPlan.value) return;
  submittingPlan.value = planType;

  try {
    if (paymentProvider === "dodo") {
      await handleDodoSubscribe(planType);
    } else {
      await handlePaddleSubscribe(planType);
    }
  } catch (err: any) {
    showToast(err?.data?.error || err.message || "发起支付失败，请重试");
    submittingPlan.value = null;
  } finally {
    if (paymentProvider === "paddle") {
      submittingPlan.value = null;
    }
  }
}

watch(visible, (open) => {
  if (open && paymentProvider === "paddle") {
    initPaddle();
  }
});
</script>

<template>
  <van-popup
    v-model:show="visible"
    round
    position="bottom"
    :style="{
      maxHeight: '90vh',
      width: 'min(500px, 100%)',
      left: '50%',
      right: 'auto',
      translate: '-50% 0',
    }"
    teleport="body"
    :close-on-click-overlay="!submittingPlan"
    class="vip-modal"
  >
    <div class="vip-modal__content">
      <div class="vip-modal__header">
        <van-icon name="gem-o" class="vip-modal__icon" />
        <h2 class="vip-modal__title">{{ t("vip_upgrade_title") }}</h2>
        <p class="vip-modal__subtitle">{{ t("vip_upgrade_subtitle") }}</p>
      </div>

      <div class="vip-modal__plans">
        <!-- 🌟 终身 VIP 卡片 -->
        <div v-if="showLifetime" class="plan-card plan-card--lifetime">
          <div class="plan-card__badge">💎 Lifetime</div>
          <h3 class="plan-card__title">{{ t("vip_plan_lifetime_title") }}</h3>
          <div class="plan-card__price">
            <span class="symbol">$</span>
            <span class="amount">8.9</span>
            <span class="period">{{ t("vip_plan_once") }}</span>
          </div>
          <ul class="plan-card__list">
            <li class="highlight">
              <strong>{{ t("vip_plan_lifetime_bonus") }}</strong>
            </li>
            <li>
              <van-icon name="success" class="check" />{{ t("vip_plan_lifetime_f1") }}
            </li>
            <li>
              <van-icon name="success" class="check" />{{ t("vip_plan_lifetime_f2") }}
            </li>
          </ul>
          <button
            type="button"
            class="btn btn--primary btn--lg plan-card__btn"
            :disabled="!!submittingPlan"
            @click="handleSubscribe('lifetime')"
          >
            {{
              submittingPlan === "lifetime"
                ? t("btn_processing")
                : t("vip_plan_lifetime_btn")
            }}
          </button>
        </div>

        <!-- 🌈 订阅 VIP 卡片 -->
        <div v-if="showSubscription" class="plan-card plan-card--subscription">
          <div class="plan-card__badge">🌈 Subscription</div>
          <h3 class="plan-card__title">{{ t("vip_plan_sub_title") }}</h3>
          <div class="plan-card__price">
            <span class="symbol">$</span>
            <span class="amount">5.9</span>
            <span class="period">/ {{ t("year") }}</span>
          </div>
          <ul class="plan-card__list">
            <li><van-icon name="success" class="check" />{{ t("vip_plan_sub_f1") }}</li>
            <li><van-icon name="success" class="check" />{{ t("vip_plan_sub_f2") }}</li>
            <li><van-icon name="success" class="check" />{{ t("vip_plan_sub_f3") }}</li>
          </ul>
          <button
            type="button"
            class="btn btn--gold btn--lg plan-card__btn"
            :disabled="!!submittingPlan"
            @click="handleSubscribe('subscription')"
          >
            {{
              submittingPlan === "subscription"
                ? t("btn_processing")
                : t("vip_plan_sub_btn")
            }}
          </button>
        </div>
      </div>

      <p class="vip-modal__terms">{{ t("vip_upgrade_tips") }}</p>
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
    margin-bottom: @sp-5;
  }

  &__icon {
    font-size: 44px;
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

  &__plans {
    display: flex;
    flex-direction: column;
    gap: @sp-4;
    margin-bottom: @sp-5;
  }

  &__terms {
    margin: 0;
    font-size: 11px;
    color: @ink-3;
    text-align: center;
    line-height: 1.4;
  }
}

.plan-card {
  position: relative;
  padding: @sp-5;
  border-radius: @radius-lg;
  border: 2px solid @border;
  background: @surface;
  overflow: hidden;

  &--lifetime {
    border-color: #00bfff;
    background: linear-gradient(180deg, fade(#00bfff, 5%) 0%, @surface 100%);
  }

  &--subscription {
    border-color: #f1c40f;
    background: linear-gradient(180deg, fade(#f1c40f, 5%) 0%, @surface 100%);
  }

  &__badge {
    position: absolute;
    top: 12px;
    right: -28px;
    width: 100px;
    padding: 4px 0;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    transform: rotate(45deg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .plan-card--lifetime & {
      background: #00bfff;
    }
    .plan-card--subscription & {
      background: #f1c40f;
    }
  }

  &__title {
    margin: 0 0 @sp-2;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__price {
    display: flex;
    align-items: baseline;
    margin-bottom: @sp-3;
    color: @ink-1;

    .symbol {
      font-size: @fs-lg;
      font-weight: 600;
    }
    .amount {
      font-size: 32px;
      font-family: @font-mono;
      font-weight: 700;
      margin: 0 2px;
    }
    .period {
      font-size: @fs-sm;
      color: @ink-3;
    }
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0 0 @sp-4;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.5;

    li {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      & + li {
        margin-top: @sp-2;
      }
    }

    .check {
      color: #d4af37;
      font-size: 16px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .highlight {
      color: #00bfff;
      font-weight: 600;
    }
  }

  &__btn {
    width: 100%;
    height: 44px;
  }
}
</style>
