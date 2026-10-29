<!-- app/pages/petadm/orders/[id].vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showImagePreview } from 'vant'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const orderId = Number(route.params.id)

// ============================================================
// 类型
// ============================================================
interface AdminOrderDetail {
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

// ============================================================
// 状态
// ============================================================
const order = ref<AdminOrderDetail | null>(null)
const loading = ref(false)
const updating = ref(false)

// ============================================================
// 初始化加载
// ============================================================
async function loadOrder() {
  loading.value = true
  try {
    order.value = await $api<AdminOrderDetail>(`/api/admin/orders/${orderId}`)
  } catch (err: any) {
    showToast(err?.data?.error || '加载订单信息失败')
    router.push('/petadm/orders')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrder()
})

// ============================================================
// 状态修改
// ============================================================
async function updateStatus(newStatus: number) {
  if (!order.value || updating.value || order.value.status === newStatus) return
  updating.value = true
  try {
    await $api(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    order.value.status = newStatus
    showToast({ type: 'success', message: '订单状态已更新' })
  } catch (err: any) {
    showToast(err?.data?.error || '修改状态失败')
  } finally {
    updating.value = false
  }
}

// ============================================================
// 工具函数
// ============================================================
function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getPlanTypeText(type: string) {
  return type === 'digital' ? '电子版' : '实物版'
}

// 查看大图
function handleImagePreview(index: number) {
  if (!order.value?.images?.length) return
  showImagePreview({
    images: order.value.images,
    startPosition: index,
    closeable: true,
  })
}
</script>

<template>
  <div class="admin-order-detail">
    <!-- 顶部导航 -->
    <header class="admin-header">
      <div class="admin-header__left">
        <NuxtLink to="/petadm/orders" class="btn btn--sm btn--ghost">
          <van-icon name="arrow-left" /> 返回列表
        </NuxtLink>
        <h1 class="admin-header__page-title">订单详情管理</h1>
      </div>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>

    <!-- 详情主体 -->
    <div v-else-if="order" class="detail-card">
      
      <!-- 基础信息区 -->
      <div class="info-grid">
        <div class="info-item">
          <span class="label">订单号：</span>
          <span class="value font-mono">{{ order.orderNo }}</span>
        </div>
        <div class="info-item">
          <span class="label">创建时间：</span>
          <span class="value font-mono">{{ formatDate(order.createdAt) }}</span>
        </div>
        <div class="info-item">
          <span class="label">买家：</span>
          <span class="value">{{ order.userNickname }} (ID: {{ order.userId }})</span>
        </div>
        <div class="info-item">
          <span class="label">类型：</span>
          <span class="value">{{ getPlanTypeText(order.planType) }}</span>
        </div>
        <div class="info-item">
          <span class="label">金额：</span>
          <span class="value font-mono text-accent">${{ order.amount.toFixed(2) }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 绘画要求 -->
      <div class="section-block">
        <h3 class="section-title">绘画要求</h3>
        <div class="content-box">
          {{ order.requirements || '无特殊要求' }}
        </div>
      </div>

      <!-- 实物邮寄地址 (仅实物版显示) -->
      <div v-if="order.planType === 'physical'" class="section-block">
        <h3 class="section-title">邮寄地址</h3>
        <div class="content-box">
          {{ order.shippingAddress || '未填写地址' }}
        </div>
      </div>

      <!-- 参考图 -->
      <div class="section-block" v-if="order.images && order.images.length">
        <h3 class="section-title">参考图片</h3>
        <div class="image-grid">
          <img
            v-for="(img, i) in order.images"
            :key="i"
            :src="img"
            class="ref-image"
            @click="handleImagePreview(i)"
          />
        </div>
      </div>

      <div class="divider"></div>

      <!-- 状态管理区 -->
      <div class="status-manage">
        <div class="section-title">
          <h3>订单状态管理</h3>
          <span class="section-desc">请根据实际处理进度更新订单状态。</span>
        </div>

        <div class="status-options">
          <button 
            class="status-btn" 
            :class="{ 'is-active': order.status === 0 }"
            @click="updateStatus(0)"
            :disabled="updating"
          >
            <span class="dot is-warning"></span> 待发货
          </button>
          
          <button 
            class="status-btn" 
            :class="{ 'is-active': order.status === 1 }"
            @click="updateStatus(1)"
            :disabled="updating"
          >
            <span class="dot is-success"></span> 已发货
          </button>

          <button 
            class="status-btn" 
            :class="{ 'is-active': order.status === 2 }"
            @click="updateStatus(2)"
            :disabled="updating"
          >
            <span class="dot is-gray"></span> 已取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.admin-order-detail {
  max-width: 900px;
}

// ============================================================
// 顶部导航
// ============================================================
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: @sp-5;

  &__left {
    display: flex;
    align-items: center;
    gap: @sp-3;
  }

  &__page-title {
    margin: 0;
    font-size: @fs-xl;
    font-weight: 700;
    color: @ink-1;
  }
}

// ============================================================
// 卡片主体
// ============================================================
.detail-card {
  background: @surface;
  border-radius: @radius-lg;
  border: 1px solid @border;
  padding: @sp-6;
  box-shadow: @shadow-1;
}

.font-mono {
  font-family: @font-mono;
}

.text-accent {
  color: @accent;
  font-weight: 700;
  font-size: @fs-lg;
}

// ============================================================
// 基础信息网格
// ============================================================
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: @sp-4;

  .info-item {
    display: flex;
    align-items: center;
    font-size: @fs-sm;

    .label {
      color: @ink-3;
      width: 80px;
      flex-shrink: 0;
    }
    .value {
      color: @ink-1;
      font-weight: 500;
      word-break: break-all;
    }
  }
}

.divider {
  height: 1px;
  background: @border;
  margin: @sp-6 0;
}

// ============================================================
// 区块
// ============================================================
.section-block {
  margin-bottom: @sp-5;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 @sp-2;
    font-size: @fs-base;
    font-weight: 600;
    color: @ink-1;
  }

  .content-box {
    padding: @sp-3 @sp-4;
    background: @surface-2;
    border-radius: @radius;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.6;
    white-space: pre-wrap; // 保留换行
  }
}

// ============================================================
// 图片网格
// ============================================================
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: @sp-3;

  .ref-image {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: @radius;
    border: 1px solid @border;
    cursor: zoom-in;
    transition: transform 0.2s;
    background: @surface-2;

    &:hover {
      transform: scale(1.05);
    }
  }
}

// ============================================================
// 状态管理区
// ============================================================
.status-manage {
  .section-title {
    margin-bottom: @sp-4;

    h3 {
      margin: 0 0 4px;
      font-size: @fs-lg;
      color: @ink-1;
    }
    .section-desc {
      color: @ink-3;
      font-size: @fs-sm;
    }
  }
}

.status-options {
  display: flex;
  gap: @sp-3;
  flex-wrap: wrap;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid @border;
  background: @surface;
  border-radius: @radius;
  cursor: pointer;
  font-size: @fs-base;
  color: @ink-2;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: @surface-2;
  }

  &.is-active {
    border-color: @accent;
    background: @accent-soft;
    color: @accent;
    font-weight: 600;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    
    &.is-warning { background: @warning; }
    &.is-success { background: @success; }
    &.is-gray { background: @ink-3; }
  }
}
</style>