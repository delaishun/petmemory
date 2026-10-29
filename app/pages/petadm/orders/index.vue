<!-- app/pages/petadm/orders/index.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'

// ============================================================
// 类型
// ============================================================
interface AdminOrderItem {
  id: number
  orderNo: string
  userId: number
  userNickname: string
  planType: 'digital' | 'physical'
  amount: number
  status: number
  images: string[]
  requirements: string
  shippingAddress: string
  createdAt: string
}

interface AdminOrderListResponse {
  items: AdminOrderItem[]
  total: number
}

// ============================================================
// 状态
// ============================================================
const { $api } = useNuxtApp()
const orders = ref<AdminOrderItem[]>([])
const total = ref(0)
const loading = ref(false)

const currentPage = ref(1)
const PAGE_SIZE = 20

// ============================================================
// 数据加载
// ============================================================
async function loadOrders() {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * PAGE_SIZE
    const res = await $api<AdminOrderListResponse>(
      `/api/admin/orders?limit=${PAGE_SIZE}&offset=${offset}`
    )
    orders.value = res.items
    total.value = res.total
  } catch (err: any) {
    showToast(err?.data?.error || '加载订单列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrders()
})

// ============================================================
// 工具函数
// ============================================================
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getPlanTypeText(type: string) {
  if (type === 'digital') return '电子版'
  if (type === 'physical') return '实物版'
  return type
}

function getStatusText(status: number) {
  if (status === 0) return '待发货'
  if (status === 1) return '已发货'
  if (status === 2) return '已取消'
  return '未知'
}

function getStatusClass(status: number) {
  if (status === 0) return 'is-pending'
  if (status === 1) return 'is-shipped'
  if (status === 2) return 'is-canceled'
  return ''
}

// ============================================================
// 分页
// ============================================================
const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  loadOrders()
}
</script>

<template>
  <div class="admin-orders-page">
    <!-- 顶部标题栏 -->
    <header class="admin-header">
      <div class="admin-header__left">
        <h1 class="admin-header__page-title">订单管理</h1>
        <span class="admin-header__count">共 {{ total }} 笔</span>
      </div>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="orders.length === 0" class="admin-empty">
      <van-icon name="orders-o" size="48" color="#ccc" />
      <p>目前还没有任何订单。</p>
    </div>

    <!-- 数据表格 -->
    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>订单号 / 买家</th>
            <th width="100">类型</th>
            <th width="100">金额</th>
            <th width="100">状态</th>
            <th width="150">创建时间</th>
            <th width="100" class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <div class="font-bold">{{ order.orderNo }}</div>
              <div class="table-sub">{{ order.userNickname }} (ID: {{ order.userId }})</div>
            </td>
            <td>{{ getPlanTypeText(order.planType) }}</td>
            <td class="text-mono">${{ order.amount.toFixed(2) }}</td>
            <td>
              <span class="status-badge" :class="getStatusClass(order.status)">
                {{ getStatusText(order.status) }}
              </span>
            </td>
            <td class="text-mono">{{ formatDate(order.createdAt) }}</td>
            <td class="text-right">
              <NuxtLink :to="`/petadm/orders/${order.id}`" class="btn btn--sm">
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

  &__count {
    font-size: @fs-sm;
    color: @ink-3;
    margin-left: @sp-2;
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
.font-bold {
  font-weight: 600;
  color: @ink-1;
}

.table-sub {
  font-size: 11px;
  color: @ink-3;
  margin-top: 2px;
}

// 状态徽章
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: @radius-pill;
  font-size: 11px;
  font-weight: 500;

  &.is-pending {
    background: fade(@warning, 10%);
    color: @warning;
  }
  
  &.is-shipped {
    background: fade(@success, 10%);
    color: @success;
  }
  
  &.is-canceled {
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