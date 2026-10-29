<!-- app/pages/petadm/pets/[id].vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '~/composables/useI18n'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const petId = Number(route.params.id)

const pet = ref<any>(null)
const loading = ref(false)
const updating = ref(false)

async function loadPet() {
  loading.value = true
  try {
    pet.value = await $api(`/api/pets/admin/${petId}`)
  } catch (err: any) {
    showToast(err?.data?.error || '加载失败')
    router.push('/petadm/pets')
  } finally {
    loading.value = false
  }
}

// 修改状态
async function updateStatus(newStatus: number) {
  if (updating.value || pet.value.status === newStatus) return
  updating.value = true
  try {
    await $api(`/api/pets/admin/${petId}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    pet.value.status = newStatus
    showToast({ type: 'success', message: '状态已更新' })
  } catch (err: any) {
    showToast(err?.data?.error || '修改失败')
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  loadPet()
})
</script>

<template>
  <div class="admin-pet-detail">
    <header class="admin-header">
      <div class="admin-header__left">
        <NuxtLink to="/petadm/pets" class="btn btn--sm btn--ghost">
          <van-icon name="arrow-left" /> 返回列表
        </NuxtLink>
        <h1 class="admin-header__page-title">宠物详情管理</h1>
      </div>
    </header>

    <div v-if="loading" class="admin-loading">
      <van-loading type="spinner" color="#A66039" />
    </div>

    <div v-else-if="pet" class="detail-card">
      <!-- 基础信息 -->
      <div class="pet-info">
        <img :src="pet.avatarUrl" class="pet-avatar" />
        <div class="pet-text">
          <h2>{{ pet.name }} (ID: {{ pet.id }})</h2>
          <p>物种：{{ pet.species }} / {{ pet.breed || '未填' }}</p>
          <p>主人：{{ pet.owner.nickname }} (ID: {{ pet.owner.id }})</p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- 状态管理 -->
      <div class="status-manage">
        <h3 class="section-title">状态设置</h3>
        <p class="section-desc">封禁后，宠物将从公共列表消失，且主人无法自行解除，无法在页面进行操作。</p>
        
        <div class="status-options">
          <button 
            class="status-btn" 
            :class="{ 'is-active': pet.status === 1 }"
            @click="updateStatus(1)"
            :disabled="updating"
          >
            <span class="dot is-green"></span> 正常
          </button>
          
          <button 
            class="status-btn" 
            :class="{ 'is-active': pet.status === 0 }"
            @click="updateStatus(0)"
            :disabled="updating"
          >
            <span class="dot is-gray"></span> 隐藏
          </button>

          <button 
            class="status-btn" 
            :class="{ 'is-active': pet.status === 2 }"
            @click="updateStatus(2)"
            :disabled="updating"
          >
            <span class="dot is-red"></span> 封禁
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

.admin-pet-detail {
  max-width: 800px;
}

.detail-card {
  background: @surface;
  border-radius: @radius-lg;
  border: 1px solid @border;
  padding: @sp-5;
  box-shadow: @shadow-1;
}

.pet-info {
  display: flex;
  align-items: center;
  gap: @sp-4;
  
  .pet-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid @border;
  }
  
  .pet-text h2 {
    margin: 0 0 8px;
    color: @ink-1;
  }
  
  .pet-text p {
    margin: 4px 0;
    color: @ink-2;
    font-size: @fs-sm;
  }
}

.divider {
  height: 1px;
  background: @border;
  margin: @sp-6 0;
}

.status-manage {
  .section-title {
    margin: 0 0 8px;
    font-size: @fs-lg;
    color: @ink-1;
  }
  
  .section-desc {
    color: @ink-3;
    font-size: @fs-sm;
    margin-bottom: @sp-4;
  }
}

.status-options {
  display: flex;
  gap: @sp-3;
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
  transition: all 0.2s;

  &:hover {
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
    
    &.is-green { background: #5D8A66; }
    &.is-gray { background: #999; }
    &.is-red { background: @danger; }
  }
}
</style>
