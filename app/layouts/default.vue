<!-- app/layouts/default.vue -->
<script setup lang="ts">
import type { AuthUser } from "~/types/auth";
import { useI18n } from "~/composables/useI18n";

const { t, locale, setLocale, initLocale } = useI18n();

// 初始化语言设置
initLocale();

// 全局登录用户。
const user = useState<AuthUser | null>("auth:user", () => null);
const isLoggedIn = computed(() => !!user.value);

// ---------- 登录 / 注册弹窗 ----------
const loginModalVisible = ref(false);
const loginModalMode = ref<"login" | "register">("login");

function openLogin(mode: "login" | "register" = "login") {
  loginModalMode.value = mode;
  loginModalVisible.value = true;
}

// ---------- 顶栏滚动阴影 ----------
const scrolled = ref(false);
const onScroll = () => {
  scrolled.value = window.scrollY > 4;
};

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
});

// ---------- 页脚年份 ----------
const year = new Date().getFullYear();
</script>

<template>
  <div class="layout-wrapper">
    <!-- ============ 顶部导航 ============ -->
    <header class="site-header" :class="{ 'is-scrolled': scrolled }">
      <div class="container site-header__inner">
        <!-- 左：Logo -->
        <NuxtLink to="/" class="site-header__logo">
          <img src="/favicon-32x32.png" alt="Logo" class="site-header__logo-icon" />
          <span class="site-header__logo-text serif">{{ t("app_name") }}</span>
        </NuxtLink>

        <!-- 中：主导航 -->
        <nav class="site-header__nav" aria-label="Main Navigation">
          <NuxtLink to="/" class="site-header__link">{{ t("nav_home") }}</NuxtLink>
          <NuxtLink to="/pets" class="site-header__link">{{ t("nav_pets") }}</NuxtLink>
          <NuxtLink to="/articles" class="site-header__link">{{
            t("articles_title")
          }}</NuxtLink>
          <NuxtLink to="/about" class="site-header__link">{{ t("nav_about") }}</NuxtLink>
        </nav>

        <!-- 右：语言切换 + 管理后台 + 登录按钮 / 圆形头像 -->
        <div class="site-header__right">
          <!-- 语言切换器 -->
          <div class="lang-switch">
            <button
              type="button"
              :class="{ 'is-active': locale === 'en' }"
              @click="setLocale('en')"
            >
              EN
            </button>
            <span class="lang-switch__divider">/</span>
            <button
              type="button"
              :class="{ 'is-active': locale === 'cn' }"
              @click="setLocale('cn')"
            >
              中
            </button>
          </div>

          <!-- 👇 新增：管理后台入口 -->
          <NuxtLink
            v-if="isLoggedIn && user?.isAdmin"
            to="/petadm"
            class="site-header__admin"
          >
            {{ t("admin_panel") }}
          </NuxtLink>
          <!-- 👆 新增结束 -->

          <!-- 登录 / 头像 -->
          <template v-if="!isLoggedIn">
            <button
              type="button"
              class="btn btn--dark btn--sm"
              @click="openLogin('login')"
            >
              {{ t("nav_login") }}
            </button>
          </template>

          <NuxtLink
            v-else
            :to="`/users/${user!.id}`"
            class="avatar"
            :title="user?.nickname"
            :aria-label="user?.nickname"
          >
            <img
              v-if="user?.avatarUrl"
              class="avatar__img"
              :src="user.avatarUrl"
              :alt="user.nickname"
            />
            <span v-else class="avatar__fallback">
              {{ user?.nickname?.charAt(0)?.toUpperCase() || "?" }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- ============ 主内容 ============ -->
    <main class="site-main">
      <slot />
    </main>

    <!-- ============ 页脚 ============ -->
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <div class="site-footer__brand">
          <div class="site-footer__name serif">{{ t("app_name") }}</div>
          <p class="site-footer__desc">{{ t("footer_slogan") }}</p>
        </div>

        <!-- 精简后的链接区 -->
        <div class="site-footer__links">
          <NuxtLink to="/about" class="site-footer__link">{{
            t("footer_about_us")
          }}</NuxtLink>
          <NuxtLink to="/contact" class="site-footer__link">{{
            t("footer_contact")
          }}</NuxtLink>
          <NuxtLink to="/terms" class="site-footer__link">{{
            t("terms_title")
          }}</NuxtLink>
          <NuxtLink to="/privacy" class="site-footer__link">{{
            t("privacy_title")
          }}</NuxtLink>
          <NuxtLink to="/refund" class="site-footer__link">{{
            t("refund_title")
          }}</NuxtLink>
        </div>
      </div>

      <div class="site-footer__bottom">
        <div class="container">
          {{ t("footer_copyright", { year, app_name: t("app_name") }) }}
        </div>
      </div>
    </footer>

    <!-- ============ 登录 / 注册弹窗 ============ -->
    <LoginModal
      v-if="loginModalVisible"
      v-model="loginModalVisible"
      :initial-mode="loginModalMode"
      @success="loginModalVisible = false"
    />
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 整体骨架
// ============================================================
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: @paper;
}

.site-main {
  flex: 1;
}

// ============================================================
// 顶部导航
// ============================================================
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: fade(@paper, 88%);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid @border;
  transition: box-shadow @dur-base ease;

  &.is-scrolled {
    box-shadow: @shadow-1;
  }

  &__inner {
    height: 64px;
    display: flex;
    align-items: center;
    gap: @sp-5;
  }

  // ---------- Logo ----------
  &__logo {
    display: inline-flex;
    align-items: center;
    gap: @sp-2;
    color: @ink-1;
    text-decoration: none;
    flex-shrink: 0;

    &:hover {
      color: @ink-1;
    }
  }

  &__logo-icon {
    width: 30px;
    height: 30px;
    object-fit: cover; // 确保图片不变形
    border-radius: 50%; // 如果原图是方形的，这里会将其裁剪为圆形。如果原图已经是圆形，这行可以保留
    display: block;
    // 去掉了原来的 background 和 box-shadow，让图标更自然
  }

  &__logo-text {
    font-size: @fs-lg;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  // ---------- 主导航 ----------
  &__nav {
    display: flex;
    align-items: center;
    gap: @sp-5;
    margin-left: @sp-4;

    @media (max-width: @bp-md) {
      display: none;
    }
  }

  &__link {
    position: relative;
    font-size: @fs-sm;
    color: @ink-2;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent;
    }

    &.router-link-active {
      color: @ink-1;
      font-weight: 500;

      &::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: -22px;
        height: 2px;
        background: @accent;
        border-radius: 1px;
      }
    }
  }

  // ---------- 右侧操作区 ----------
  &__right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: @sp-4;
  }

  // 👇 新增：管理后台按钮样式
  &__admin {
    font-size: @fs-sm;
    color: @accent;
    background: @accent-soft;
    padding: 4px 10px;
    border-radius: @radius-pill;
    font-weight: 600;
    text-decoration: none;
    transition: background @dur-fast ease, color @dur-fast ease;

    &:hover {
      background: @accent;
      color: @surface;
    }
  }
}

// ============================================================
// 语言切换器
// ============================================================
.lang-switch {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: @fs-sm;
  user-select: none;

  button {
    background: none;
    border: none;
    padding: 4px 6px;
    color: @ink-3;
    cursor: pointer;
    font-size: @fs-sm;
    border-radius: @radius-sm;
    transition: all @dur-fast ease;

    &:hover {
      color: @accent;
      background: @surface-2;
    }

    &.is-active {
      color: @ink-1;
      font-weight: 600;
    }
  }

  &__divider {
    color: @border-strong;
    font-size: 12px;
  }
}

// ============================================================
// 用户头像
// ============================================================
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  text-decoration: none;
  flex: 0 0 auto;
  border: 1px solid @border;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease;

  &:hover {
    transform: scale(1.04);
    box-shadow: 0 0 0 3px @accent-soft;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__fallback {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: @font-serif;
    font-size: @fs-base;
    font-weight: 700;
    color: @accent;
    background: @surface-2;
    user-select: none;
  }
}

// ============================================================
// 页脚
// ============================================================
.site-footer {
  margin-top: auto;
  background: @surface-2;
  border-top: 1px solid @border;

  &__inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: @sp-6;
    padding-top: @sp-6;
    padding-bottom: @sp-6;

    @media (max-width: @bp-md) {
      flex-direction: column;
      align-items: flex-start;
      gap: @sp-5;
    }
  }

  &__brand {
    max-width: 340px;
  }

  &__name {
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    margin-bottom: @sp-2;
  }

  &__desc {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: @lh-base;
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: @sp-5;

    @media (max-width: @bp-sm) {
      gap: @sp-4;
    }
  }

  &__link {
    font-size: @fs-sm;
    color: @ink-3;
    text-decoration: none;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent;
    }
  }

  &__bottom {
    border-top: 1px solid @border;
    padding: @sp-4 0;
    text-align: center;
    font-size: @fs-xs;
    color: @ink-3;
  }
}

// ============================================================
// 按钮新增：深色样式
// ============================================================
.btn--dark {
  color: @surface;
  background: @ink-1;
  border-color: @ink-1;

  &:hover {
    color: @surface;
    background: lighten(@ink-1, 10%);
    border-color: lighten(@ink-1, 10%);
  }
}
</style>
