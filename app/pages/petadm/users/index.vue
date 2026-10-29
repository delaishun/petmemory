<!-- app/pages/petadm/users/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'

// ============================================================
// 类型
// ============================================================
interface AdminUserItem {
  id: number
  nickname: string
  avatarUrl: string | null
  status: number
  muteUntil: string | null
  createdAt: string
}

interface AdminUserListResponse {
  items: AdminUserItem[]
  total: number
}

// ============================================================
// 状态
// ============================================================
const { $api } = useNuxtApp()
const searchName = ref('')
const users = ref<AdminUserItem[]>([])
const total = ref(0)
const loading = ref(false)

const currentPage = ref(1)
const PAGE_SIZE = 20

// ============================================================
// 数据加载
// ============================================================
async function handleSearch() {
  if (!searchName.value.trim()) {
    showToast('请输入用户昵称')
    return
  }
  loading.value = true
  currentPage.value = 1
  await loadUsers()
}

async function loadUsers() {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * PAGE_SIZE
    const res = await $api<AdminUserListResponse>(
      `/api/users/admin/search?nickname=${encodeURIComponent(searchName.value.trim())}&limit=${PAGE_SIZE}&offset=${offset}`
    )
    users.value = res.items
    total.value = res.total
  } catch (err: any) {
    showToast(err?.data?.error || '搜索用户失败')
  } finally {
    loading.value = false
  }
}

// ============================================================
// 状态与格式化工具
// ============================================================
function isMuted(user: AdminUserItem): boolean {
  if (!user.muteUntil) return false
  return new Date(user.muteUntil) > new Date()
}

function getStatusText(user: AdminUserItem) {
  if (user.status === 0) return '已禁用'
  if (isMuted(user)) return '禁言中'
  return '正常'
}

function getStatusClass(user: AdminUserItem) {
  if (user.status === 0) return 'is-disabled'
  if (isMuted(user)) return 'is-muted'
  return 'is-success'
}

// 格式化日期
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 头像兜底
const defaultAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
       <rect width="40" height="40" fill="#F5EEE4"/>
       <circle cx="20" cy="16" r="7" fill="#DCD0BF"/>
       <path d="M6 40c0-8 6-12 14-12s14 4 14 12z" fill="#DCD0BF"/>
     </svg>`
  )

// ============================================================
// 分页
// ============================================================
const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadUsers()
}

// 初始化清空状态
onMounted(() => {
  searchName.value = ''
  users.value = []
})
</script>

<template>
  <div class="admin-users-page">
    <!-- 顶部标题栏 -->
    <header class="admin-header">
      <div class="admin-header__left">
        <h1 class="admin-header__page-title">用户管理</h1>
      </div>
    </header>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="searchName"
        type="text"
        class="input"
        placeholder="输入用户昵称搜索..."
        @keyup.enter="handleSearch"
      />
      <button class="btn btn--primary" :disabled="loading" @click="handleSearch">
        搜索
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="users.length === 0 && searchName" class="admin-empty">
      <van-icon name="search" size="48" color="#ccc" />
      <p>没有找到匹配的用户</p>
    </div>

    <!-- 数据表格 -->
    <div v-else-if="users.length > 0" class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th width="60">头像</th>
            <th>昵称 / ID</th>
            <th width="100">状态</th>
            <th width="120">注册时间</th>
            <th width="120" class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <img
                :src="user.avatarUrl || defaultAvatar"
                class="table-avatar"
                alt="avatar"
              />
            </td>
            <td>
              <div class="font-bold">{{ user.nickname }}</div>
              <div class="table-sub">ID: {{ user.id }}</div>
            </td>
            <td>
              <span
                class="status-badge"
                :class="getStatusClass(user)"
              >
                {{ getStatusText(user) }}
              </span>
            </td>
            <td class="text-mono">{{ formatDate(user.createdAt) }}</td>
            <td class="text-right">
              <NuxtLink :to="`/petadm/users/${user.id}`" class="btn btn--sm">
                管理
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
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 顶部标题栏
// ============================================================
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: @sp-5;

  &__page-title {
    margin: 0;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }
}

// ============================================================
// 搜索栏
// ============================================================
.search-bar {
  display: flex;
  gap: @sp-3;
  margin-bottom: @sp-6;
  max-width: 480px;

  .input {
    flex: 1;
    height: 40px;
    padding: 0 @sp-3;
    font-size: @fs-sm;
    color: @ink-1;
    background: @surface;
    border: 1px solid @border-strong;
    border-radius: @radius;
    outline: none;
    transition: border-color @dur-fast ease;

    &:focus {
      border-color: @accent;
    }
  }

  .btn {
    height: 40px;
    padding: 0 @sp-5;
    flex-shrink: 0;
  }
}

// ============================================================
// 加载中与空状态
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
  
  p { 
    margin-top: @sp-3; 
    font-size: @fs-sm; 
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

  .text-right { 
    text-align: right; 
  }
  
  .text-mono {
    font-family: @font-mono;
    color: @ink-3;
    font-size: 13px;
  }
}

// ============================================================
// 表格内部元素
// ============================================================
.table-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: @surface-2;
  border: 1px solid @border;
  display: block;
}

.font-bold {
  font-weight: 600;
  color: @ink-1;
}

.table-sub {
  font-size: 11px;
  color: @ink-3;
  font-family: @font-mono;
  margin-top: 2px;
}

// 状态徽章
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: @radius-pill;
  font-size: 11px;
  font-weight: 500;

  &.is-success {
    background: fade(@success, 10%);
    color: @success;
  }
  
  &.is-muted {
    background: fade(@danger, 10%);
    color: @danger;
  }
  
  &.is-disabled {
    background: @surface-2;
    color: @ink-3;
  }
}

// ============================================================
// 分页
// ============================================================
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