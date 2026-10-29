<!-- app/pages/petadm/pets/index.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'

interface AdminPetItem {
  id: number
  name: string
  species: string
  status: number
  avatarUrl: string
  owner: { id: number; nickname: string }
}

const { $api } = useNuxtApp()
const searchName = ref('')
const pets = ref<AdminPetItem[]>([])
const loading = ref(false)

async function handleSearch() {
  if (!searchName.value.trim()) {
    showToast('请输入宠物名字')
    return
  }
  loading.value = true
  try {
    pets.value = await $api<AdminPetItem[]>(`/api/pets/admin/search?name=${encodeURIComponent(searchName.value.trim())}`)
  } catch (err: any) {
    showToast(err?.data?.error || '搜索失败')
  } finally {
    loading.value = false
  }
}

function getStatusText(status: number) {
  if (status === 1) return '正常'
  if (status === 0) return '隐藏'
  return '已封禁'
}

function getStatusClass(status: number) {
  if (status === 1) return 'is-success'
  if (status === 0) return 'is-warning'
  return 'is-danger'
}

// 初始加载一些宠物（可选，这里做个演示就空着）
onMounted(() => {
  searchName.value = ''
})
</script>

<template>
  <div class="admin-pets-page">
    <header class="admin-header">
      <div class="admin-header__left">
        <h1 class="admin-header__page-title">宠物管理</h1>
      </div>
    </header>

    <!-- 搜索框 -->
    <div class="search-bar">
      <input
        v-model="searchName"
        type="text"
        class="input"
        placeholder="输入宠物名字搜索..."
        @keyup.enter="handleSearch"
      />
      <button class="btn btn--primary" :disabled="loading" @click="handleSearch">
        搜索
      </button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>
    <div v-else-if="pets.length > 0" class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th width="60">头像</th>
            <th>名字</th>
            <th>物种</th>
            <th>主人</th>
            <th>状态</th>
            <th width="120" class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pet in pets" :key="pet.id">
            <td>
              <img :src="pet.avatarUrl" class="table-avatar" />
            </td>
            <td class="font-bold">{{ pet.name }}</td>
            <td>{{ pet.species }}</td>
            <td>
              <NuxtLink :to="`/users/${pet.owner.id}`" target="_blank">
                {{ pet.owner.nickname }}
              </NuxtLink>
            </td>
            <td>
              <span class="status-badge" :class="getStatusClass(pet.status)">
                {{ getStatusText(pet.status) }}
              </span>
            </td>
            <td class="text-right">
              <NuxtLink :to="`/petadm/pets/${pet.id}`" class="btn btn--sm">
                管理
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else-if="!loading && searchName" class="admin-empty">
      <van-icon name="search" size="48" color="#ccc" />
      <p>没有找到匹配的宠物</p>
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
}

// ============================================================
// 表格内部元素
// ============================================================
.table-avatar {
  width: 44px;
  height: 44px;
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
  
  &.is-warning {
    background: fade(@warning, 10%);
    color: @warning;
  }
  
  &.is-danger {
    background: fade(@danger, 10%);
    color: @danger;
  }
}
</style>
