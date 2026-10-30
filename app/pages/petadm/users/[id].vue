<!-- app/pages/petadm/users/[id].vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const userId = Number(route.params.id)

// ============================================================
// 类型
// ============================================================
interface AdminUserDetail {
  id: number
  nickname: string
  avatarUrl: string | null
  email: string
  status: number
  isVip: boolean
  vipExpiresAt: string | null
  muteUntil: string | null
  point: number
  createdAt: string
}

// ============================================================
// 状态
// ============================================================
const user = ref<AdminUserDetail | null>(null)
const loading = ref(false)
const updating = ref(false)

// 禁言日期选择器
const showMuteDatePicker = ref(false)
const muteDatePickerValue = ref<string[]>([])
const minMuteDate = new Date()

// VIP 日期选择器
const showVipDatePicker = ref(false)
const vipDatePickerValue = ref<string[]>([])
const minVipDate = new Date()

// 积分输入框
const pointAmount = ref<number | ''>('')

// ============================================================
// 初始化加载
// ============================================================
async function loadUser() {
  loading.value = true
  try {
    user.value = await $api<AdminUserDetail>(`/api/users/admin/${userId}`)
  } catch (err: any) {
    showToast(err?.data?.error || '加载用户信息失败')
    router.push('/petadm/users')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadUser()
})

// ============================================================
// 工具：日期格式化
// ============================================================
function formatDateTime(iso: string | null) {
  if (!iso) return '未设置'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isMuted() {
  if (!user.value?.muteUntil) return false
  return new Date(user.value.muteUntil) > new Date()
}

// ============================================================
// 1. 禁言控制
// ============================================================
async function quickMute(days: number) {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  targetDate.setHours(23, 59, 59, 999)
  await submitMute(targetDate.toISOString())
}

function openMuteDatePicker() {
  if (user.value?.muteUntil) {
    const d = new Date(user.value.muteUntil)
    muteDatePickerValue.value = [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')]
  } else {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    muteDatePickerValue.value = [String(tomorrow.getFullYear()), String(tomorrow.getMonth() + 1).padStart(2, '0'), String(tomorrow.getDate()).padStart(2, '0')]
  }
  showMuteDatePicker.value = true
}

async function onMuteDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  showMuteDatePicker.value = false
  const dateStr = `${selectedValues[0]}-${selectedValues[1]}-${selectedValues[2]}T23:59:59`
  const targetDate = new Date(dateStr)
  if (targetDate.getTime() <= Date.now()) return showToast('截止时间必须大于当前时间')
  await submitMute(targetDate.toISOString())
}

async function handleUnmute() {
  try {
    await showConfirmDialog({ title: '确认解除禁言', message: '解除后该用户可以立即恢复留言功能。' })
  } catch { return }
  await submitMute(null)
}

async function submitMute(muteUntil: string | null) {
  if (updating.value) return
  updating.value = true
  try {
    await $api(`/api/users/admin/${userId}/mute`, { method: 'PATCH', body: { muteUntil } })
    showToast({ type: 'success', message: muteUntil ? '已设置禁言' : '已解除禁言' })
    await loadUser()
  } catch (err: any) {
    showToast(err?.data?.error || '操作失败')
  } finally {
    updating.value = false
  }
}

// ============================================================
// 2. VIP 控制
// ============================================================
async function quickVip(days: number) {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + days)
  await submitVip(targetDate.toISOString())
}

function openVipDatePicker() {
  if (user.value?.vipExpiresAt) {
    const d = new Date(user.value.vipExpiresAt)
    vipDatePickerValue.value = [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')]
  } else {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1) // 默认一年后
    vipDatePickerValue.value = [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')]
  }
  showVipDatePicker.value = true
}

async function onVipDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  showVipDatePicker.value = false
  const dateStr = `${selectedValues[0]}-${selectedValues[1]}-${selectedValues[2]}T23:59:59`
  await submitVip(new Date(dateStr).toISOString())
}

async function handleCancelVip() {
  try {
    await showConfirmDialog({ title: '取消 VIP', message: '确定要取消该用户的 VIP 吗？' })
  } catch { return }
  await submitVip(null)
}

async function submitVip(vipExpiresAt: string | null) {
  if (updating.value) return
  updating.value = true
  try {
    await $api(`/api/users/admin/${userId}/vip`, { method: 'PATCH', body: { vipExpiresAt } })
    showToast({ type: 'success', message: 'VIP 状态已更新' })
    await loadUser()
  } catch (err: any) {
    showToast(err?.data?.error || '操作失败')
  } finally {
    updating.value = false
  }
}

// ============================================================
// 3. 积分控制
// ============================================================
async function handleAddPoints() {
  if (!pointAmount.value || isNaN(Number(pointAmount.value))) return showToast('请输入有效积分')
  if (updating.value) return
  updating.value = true
  try {
    await $api(`/api/users/admin/${userId}/points`, {
      method: 'PATCH',
      body: { amount: Number(pointAmount.value) },
    })
    showToast({ type: 'success', message: '积分已更新' })
    pointAmount.value = ''
    await loadUser()
  } catch (err: any) {
    showToast(err?.data?.error || '操作失败')
  } finally {
    updating.value = false
  }
}

// 头像兜底
const defaultAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#F5EEE4"/><circle cx="20" cy="16" r="7" fill="#DCD0BF"/><path d="M6 40c0-8 6-12 14-12s14 4 14 12z" fill="#DCD0BF"/></svg>`)
</script>

<template>
  <div class="admin-user-detail">
    <header class="admin-header">
      <div class="admin-header__left">
        <NuxtLink to="/petadm/users" class="btn btn--sm btn--ghost">
          <van-icon name="arrow-left" /> 返回列表
        </NuxtLink>
        <h1 class="admin-header__page-title">用户详情管理</h1>
      </div>
    </header>

    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>

    <div v-else-if="user" class="detail-card">
      
      <!-- 警告横幅 -->
      <div v-if="isMuted()" class="alert-banner is-danger">
        <van-icon name="warning-o" /> 该用户目前处于禁言状态，截止时间：{{ formatDateTime(user.muteUntil) }}
      </div>

      <!-- 基础信息 -->
      <div class="user-info">
        <img :src="user.avatarUrl || defaultAvatar" class="user-avatar" />
        <div class="user-text">
          <h2>
            {{ user.nickname }}
            <span v-if="user.status === 0" class="status-badge is-disabled">已禁用</span>
            <span v-else-if="user.isVip" class="status-badge is-vip">VIP</span>
          </h2>
          <p>ID: {{ user.id }} · 当前积分: <strong class="text-accent">{{ user.point }}</strong></p>
          <p>邮箱: {{ user.email || '未绑定' }}</p>
          <p>注册时间: {{ formatDateTime(user.createdAt) }}</p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 1. 禁言管理区 -->
      <div class="manage-section">
        <div class="section-title">
          <h3>禁言管理</h3>
          <span class="section-desc">被禁言的用户将无法在他人的宠物页面留言。</span>
        </div>

        <div class="status-box">
          <div class="status-text">
            当前状态：
            <strong v-if="isMuted()" class="text-danger">禁言中 (至 {{ formatDateTime(user.muteUntil) }})</strong>
            <strong v-else class="text-success">正常</strong>
          </div>
          <button v-if="isMuted()" class="btn btn--sm btn--primary" :disabled="updating" @click="handleUnmute">
            解除禁言
          </button>
        </div>

        <div class="action-group">
          <button class="btn btn--sm" :disabled="updating" @click="quickMute(3)">禁言 3 天</button>
          <button class="btn btn--sm" :disabled="updating" @click="quickMute(7)">禁言 7 天</button>
          <button class="btn btn--sm" :disabled="updating" @click="openMuteDatePicker">自定义时间</button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 2. VIP 管理区 -->
      <div class="manage-section">
        <div class="section-title">
          <h3>VIP 管理</h3>
          <span class="section-desc">直接赋予用户 VIP 特权。</span>
        </div>

        <div class="status-box">
          <div class="status-text">
            当前到期时间：
            <strong :class="user.isVip ? 'text-success' : 'text-ink'">{{ formatDateTime(user.vipExpiresAt) }}</strong>
          </div>
          <button v-if="user.isVip" class="btn btn--sm btn--ghost" style="color: red;" :disabled="updating" @click="handleCancelVip">
            取消 VIP
          </button>
        </div>

        <div class="action-group">
          <button class="btn btn--sm" :disabled="updating" @click="quickVip(30)">VIP 1 个月</button>
          <button class="btn btn--sm" :disabled="updating" @click="quickVip(365)">VIP 1 年</button>
          <button class="btn btn--sm" :disabled="updating" @click="openVipDatePicker">自定义到期</button>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 3. 积分管理区 -->
      <div class="manage-section">
        <div class="section-title">
          <h3>积分管理</h3>
          <span class="section-desc">增加或扣除用户积分（输入负数即可扣除）。</span>
        </div>

        <div class="action-group point-group">
          <input 
            v-model="pointAmount"
            type="number"
            class="input point-input" 
            placeholder="如：100 或 -50" 
            :disabled="updating"
          />
          <button class="btn btn--primary" :disabled="updating || !pointAmount" @click="handleAddPoints">
            确认调整
          </button>
        </div>
      </div>

    </div>

    <!-- 禁言日期选择器 -->
    <van-popup v-model:show="showMuteDatePicker" position="bottom" round teleport="body">
      <van-date-picker
        v-model="muteDatePickerValue"
        title="选择禁言截止日期"
        :min-date="minMuteDate"
        @confirm="onMuteDateConfirm"
        @cancel="showMuteDatePicker = false"
      />
    </van-popup>

    <!-- VIP 日期选择器 -->
    <van-popup v-model:show="showVipDatePicker" position="bottom" round teleport="body">
      <van-date-picker
        v-model="vipDatePickerValue"
        title="选择 VIP 截止日期"
        :min-date="minVipDate"
        @confirm="onVipDateConfirm"
        @cancel="showVipDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.admin-user-detail {
  max-width: 800px;
}

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

.alert-banner {
  display: flex;
  align-items: center;
  gap: @sp-2;
  padding: @sp-3 @sp-4;
  border-radius: @radius;
  font-size: @fs-sm;
  font-weight: 500;
  margin-bottom: @sp-5;

  &.is-danger {
    background: fade(@danger, 10%);
    color: @danger;
    border: 1px solid fade(@danger, 20%);
  }
}

.detail-card {
  background: @surface;
  border-radius: @radius-lg;
  border: 1px solid @border;
  padding: @sp-6;
  box-shadow: @shadow-1;
}

.user-info {
  display: flex;
  align-items: center;
  gap: @sp-5;
  
  .user-avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid @border;
  }
  
  .user-text h2 {
    margin: 0 0 @sp-2;
    color: @ink-1;
    font-size: @fs-xl;
    display: flex;
    align-items: center;
    gap: @sp-2;
  }
  
  .user-text p {
    margin: 4px 0;
    color: @ink-2;
    font-size: @fs-sm;
  }
}

.text-accent {
  color: @accent;
  font-size: @fs-lg;
  font-family: @font-mono;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: @radius-pill;
  font-size: 11px;
  font-weight: 500;

  &.is-vip {
    background: @gold-soft;
    color: darken(@gold, 20%);
  }
  &.is-disabled {
    background: @surface-2;
    color: @ink-3;
  }
}

.divider {
  height: 1px;
  background: @border;
  margin: @sp-6 0;
}

.manage-section {
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

.status-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: @sp-3 @sp-4;
  background: @surface-2;
  border: 1px solid @border;
  border-radius: @radius;
  margin-bottom: @sp-4;

  .status-text {
    font-size: @fs-sm;
    color: @ink-2;

    strong {
      margin-left: 4px;
      &.text-danger { color: @danger; }
      &.text-success { color: @success; }
      &.text-ink { color: @ink-1; }
    }
  }
}

.action-group {
  display: flex;
  gap: @sp-3;
  flex-wrap: wrap;
}

.point-group {
  align-items: center;

  .point-input {
    width: 160px;
    height: 36px;
    padding: 0 @sp-3;
    border: 1px solid @border-strong;
    border-radius: @radius;
    font-size: @fs-sm;
    outline: none;
    
    &:focus {
      border-color: @accent;
    }
  }
}
</style>