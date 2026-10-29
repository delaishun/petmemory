<!-- app/pages/petadm/index.vue -->
<script setup lang="ts">
import { showToast } from 'vant'
import type { AuthUser } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 初始化与类型
// ============================================================
const { t, locale } = useI18n()
const { $api } = useNuxtApp()
const user = useState<AuthUser | null>('auth:user', () => null)

// 权限判断
const isAdmin = computed(() => !!user.value && user.value.isAdmin)

// 侧边栏菜单配置（未来可扩展用户管理、订单管理等）
const menuItems = computed(() => [
  { key: 'articles', label: t('admin_menu_articles'), icon: 'notes-o' },
  // { key: 'users', label: t('admin_menu_users'), icon: 'friends-o' },
  // { key: 'orders', label: t('admin_menu_orders'), icon: 'orders-o' },
])

const activeMenu = ref('articles')

// ============================================================
// 文章列表数据
// ============================================================
interface AdminArticleItem {
  id: number
  slug: string
  title: string
  imageUrl: string
  isPublished: number
  createdAt: string
}

interface AdminArticleListResponse {
  items: AdminArticleItem[]
  total: number
}

const articles = ref<AdminArticleItem[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const PAGE_SIZE = 10

// 获取文章列表
async function loadArticles() {
  if (!isAdmin.value) return
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * PAGE_SIZE
    const res = await $api<AdminArticleListResponse>(
      `/api/articles/admin/list?limit=${PAGE_SIZE}&offset=${offset}`
    )
    articles.value = res.items
    total.value = res.total
  } catch (err: any) {
    showToast(err?.data?.error || '加载文章列表失败')
  } finally {
    loading.value = false
  }
}

// 分页切换
function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadArticles()
}

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

// 初始化加载
onMounted(() => {
  loadArticles()
})

// 格式化日期
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// SEO
useHead({
  title: `管理后台 · ${t('app_name')}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }] // 禁止搜索引擎收录后台
})
</script>

<template>
  <!-- 权限拦截：非管理员显示 403 -->
  <div v-if="!isAdmin" class="forbidden-view container">
    <van-icon name="warning-o" size="48" color="#C25A5A" />
    <h1>403 Forbidden</h1>
    <p>您没有权限访问此页面。</p>
    <NuxtLink to="/" class="btn btn--primary mt-4">返回首页</NuxtLink>
  </div>

  <!-- 后台管理主体 -->
  <div v-else class="admin-layout">
    <!-- 左侧侧边栏 -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar__header">
        <h2 class="admin-sidebar__title">{{ t('admin_title') }}</h2>
      </div>
      <nav class="admin-sidebar__nav">
        <button
          v-for="item in menuItems"
          :key="item.key"
          class="admin-sidebar__item"
          :class="{ 'is-active': activeMenu === item.key }"
          @click="activeMenu = item.key"
        >
          <van-icon :name="item.icon" class="admin-sidebar__icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- 右侧主内容区 -->
    <main class="admin-main">
      <!-- 顶部操作栏 -->
      <header class="admin-header">
        <div class="admin-header__left">
          <h1 class="admin-header__page-title">{{ t('admin_menu_articles') }}</h1>
          <span class="admin-header__count">共 {{ total }} 篇</span>
        </div>
        <div class="admin-header__right">
          <NuxtLink to="/petadm/edit" class="btn btn--primary">
            <van-icon name="plus" />
            {{ t('admin_new_article') }}
          </NuxtLink>
        </div>
      </header>

      <!-- 列表加载中 -->
      <div v-if="loading" class="admin-loading">
        <van-loading type="spinner" color="#A66039" />
      </div>

      <!-- 空状态 -->
      <div v-else-if="articles.length === 0" class="admin-empty">
        <van-icon name="notes-o" size="48" color="#ccc" />
        <p>还没有任何文章，点击右上角新建一篇吧。</p>
      </div>

      <!-- 文章列表 (表格风格) -->
      <div v-else class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th width="80">封面</th>
              <th>标题</th>
              <th width="100">状态</th>
              <th width="120">创建时间</th>
              <th width="120" class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in articles" :key="item.id">
              <td>
                <div class="table-cover">
                  <img v-if="item.imageUrl" :src="item.imageUrl" alt="cover" />
                  <span v-else class="table-cover__empty">无图</span>
                </div>
              </td>
              <td>
                <div class="table-title" :title="item.title">{{ item.title }}</div>
                <div class="table-slug">/{{ item.slug }}</div>
              </td>
              <td>
                <span 
                  class="status-badge" 
                  :class="item.isPublished === 1 ? 'is-published' : 'is-draft'"
                >
                  {{ item.isPublished === 1 ? t('admin_status_published') : t('admin_status_draft') }}
                </span>
              </td>
              <td class="text-mono">{{ formatDate(item.createdAt) }}</td>
              <td class="text-right">
                <NuxtLink :to="`/petadm/edit?id=${item.id}`" class="btn btn--sm">
                  编辑
                </NuxtLink>
                <NuxtLink 
                  v-if="item.isPublished === 1"
                  :to="`/articles/${item.slug}`" 
                  target="_blank"
                  class="btn btn--sm btn--ghost"
                  title="在新窗口预览"
                >
                  预览
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="admin-pagination">
        <button 
          class="btn btn--sm" 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          上一页
        </button>
        <span class="admin-pagination__info">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button 
          class="btn btn--sm" 
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 权限拦截页
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
  background: #f7f8fa; // 略微区分于前台的米白色
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
    width: 60px; // 移动端收起为图标
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
      span { display: none; }
    }
  }

  &__icon {
    font-size: 18px;
  }
}

// ============================================================
// 右侧内容
// ============================================================
.admin-main {
  flex: 1;
  padding: @sp-6;
  overflow-x: auto;

  @media (max-width: @bp-sm) {
    padding: @sp-4;
  }
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: @sp-6;

  &__page-title {
    margin: 0;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }

  &__count {
    font-size: @fs-sm;
    color: @ink-3;
    margin-left: @sp-2;
  }
}

// ============================================================
// 数据表格
// ============================================================
.admin-table-wrap {
  background: @surface;
  border-radius: @radius-lg;
  border: 1px solid @border;
  box-shadow: @shadow-1;
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    background: @surface-2;
    padding: 12px @sp-4;
    font-size: @fs-xs;
    font-weight: 600;
    color: @ink-3;
    text-transform: uppercase;
    border-bottom: 1px solid @border;
  }

  td {
    padding: 12px @sp-4;
    font-size: @fs-sm;
    color: @ink-2;
    border-bottom: 1px solid @border;
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: fade(@surface-2, 50%);
  }

  .text-right { text-align: right; }
  .text-mono { font-family: @font-mono; color: @ink-3; font-size: 13px; }
}

.table-cover {
  width: 60px;
  height: 40px;
  background: @surface-2;
  border-radius: @radius-sm;
  overflow: hidden;
  border: 1px solid @border;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  
  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 10px;
    color: @ink-3;
  }
}

.table-title {
  font-weight: 600;
  color: @ink-1;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-slug {
  font-size: 11px;
  color: @ink-3;
  font-family: @font-mono;
  margin-top: 2px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: @radius-pill;
  font-size: 11px;
  font-weight: 500;

  &.is-published {
    background: fade(@success, 10%);
    color: @success;
  }
  
  &.is-draft {
    background: @surface-2;
    color: @ink-3;
  }
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: @ink-3;
  &:hover {
    background: @surface-2;
    color: @ink-1;
  }
}

// ============================================================
// 空状态与加载与分页
// ============================================================
.admin-loading, .admin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: @sp-8 0;
  color: @ink-3;
  background: @surface;
  border-radius: @radius-lg;
  border: 1px dashed @border;
  
  p { margin-top: @sp-3; font-size: @fs-sm; }
}

.admin-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: @sp-4;
  margin-top: @sp-6;

  &__info {
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }
}
</style>