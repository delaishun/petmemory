<!-- app/pages/petadm.vue -->
<script setup lang="ts">
import type { AuthUser } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'

const { t } = useI18n()
const user = useState<AuthUser | null>('auth:user', () => null)
const isAdmin = computed(() => !!user.value && user.value.isAdmin)

// 👇 修改：菜单配置加入用户管理
const menuItems = computed(() => [
  { key: 'articles', label: '文章管理', icon: 'notes-o', to: '/petadm' },
  { key: 'pets', label: '宠物管理', icon: 'friends-o', to: '/petadm/pets' },
  { key: 'users', label: '用户管理', icon: 'manager-o', to: '/petadm/users' }, 
])

const route = useRoute()

// 👇 修改：优化当前激活菜单的判断逻辑
const currentMenu = computed(() => {
  if (route.path.includes('/petadm/users')) return 'users'
  if (route.path.includes('/petadm/pets')) return 'pets'
  return 'articles'
})

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
</script>

<template>
  <div v-if="!isAdmin" class="forbidden-view container">
    <van-icon name="warning-o" size="48" color="#C25A5A" />
    <h1>403 Forbidden</h1>
    <p>您没有权限访问此页面。</p>
    <NuxtLink to="/" class="btn btn--primary mt-4">返回首页</NuxtLink>
  </div>

  <div v-else class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar__header">
        <h2 class="admin-sidebar__title">管理控制台</h2>
      </div>
      <nav class="admin-sidebar__nav">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.key"
          :to="item.to"
          class="admin-sidebar__item"
          :class="{ 'is-active': currentMenu === item.key }"
        >
          <van-icon :name="item.icon" class="admin-sidebar__icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <!-- 右侧内容区 -->
    <main class="admin-main">
      <NuxtPage />
    </main>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 权限拦截页 (403)
// ============================================================
.forbidden-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: @sp-8 0;
  text-align: center;
  min-height: 60vh;

  h1 {
    font-size: @fs-xl;
    color: @ink-1;
    margin: @sp-3 0 @sp-1;
  }
  p {
    color: @ink-3;
    margin-bottom: @sp-4;
  }
}

// ============================================================
// 布局骨架 (左侧边栏 + 右侧内容)
// ============================================================
.admin-layout {
  display: flex;
  min-height: calc(100vh - 64px);
  background: #f7f8fa; 
}

// ============================================================
// 左侧边栏
// ============================================================
.admin-sidebar {
  width: 240px;
  background: @surface;
  border-right: 1px solid @border;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: @bp-md) {
    width: 64px; 
  }

  &__header {
    padding: @sp-5 @sp-4;
    border-bottom: 1px solid @border;
    
    @media (max-width: @bp-md) {
      display: none;
    }
  }

  &__title {
    font-size: @fs-lg;
    font-family: @font-serif;
    font-weight: 700;
    color: @ink-1;
    margin: 0;
  }

  &__nav {
    padding: @sp-3 @sp-2;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: @sp-2;
    width: 100%;
    padding: 12px @sp-3;
    border: none;
    background: transparent;
    color: @ink-2;
    font-size: @fs-sm;
    font-weight: 500;
    border-radius: @radius;
    cursor: pointer;
    text-align: left;
    text-decoration: none; 
    transition: all @dur-fast ease;

    &:hover {
      background: @surface-2;
      color: @ink-1;
    }

    &.is-active {
      background: @accent-soft;
      color: @accent;
      font-weight: 600;
    }

    @media (max-width: @bp-md) {
      justify-content: center;
      padding: 12px 0;
      
      span {
        display: none;
      }
    }
  }

  &__icon {
    font-size: 18px;
  }
}

// ============================================================
// 右侧内容区
// ============================================================
.admin-main {
  flex: 1;
  min-width: 0; 
  padding: @sp-6;
  overflow-x: auto;

  @media (max-width: @bp-sm) {
    padding: @sp-4;
  }
}
</style>