<!-- app/pages/users/[id].vue -->
<script setup lang="ts">
import { showConfirmDialog, showToast, showImagePreview } from 'vant'
import type { AuthUser, MeResponse } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'
import ManageSubscriptionModal from '~/components/ManageSubscriptionModal.vue'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// 当前登录用户
const me = useState<AuthUser | null>('auth:user', () => null)

// 路由参数
const route = useRoute()
const userId = computed(() => Number(route.params.id))

// 是否本人
const isSelf = computed(
  () => !!me.value && me.value.id === userId.value,
)

// ---------- 类型 ----------
interface PublicUser {
  id: number
  nickname: string
  avatarUrl: string | null
  avatarUpdatedAt: string | null
  email: string
  vipExpiresAt: string | null
  isVip: boolean
  createdAt: string
  bio: string | null
  point?: number
}

interface PetSummary {
  id: number
  slug: string
  name: string
  avatarUrl: string
}

interface GiftPublic {
  id: number
  name: string
  imageUrl: string
}

interface InventoryItem {
  giftId: number
  quantity: number
}

interface UserOrder {
  id: number
  orderNo: string
  planType: 'digital' | 'physical'
  amount: number
  status: number // 0=待发货 1=已发货 2=已取消
  images: string[]
  requirements: string
  shippingAddress: string
  createdAt: string
}

// ---------- 数据 ----------
const { $api } = useNuxtApp()

const { data: user, pending, error, refresh: refreshUser } = await useAsyncData<PublicUser>(
  () => `user:${userId.value}`,
  () => $api<PublicUser>(`/api/users/${userId.value}`),
)

const { data: pets, refresh: refreshPets } = await useAsyncData<PetSummary[]>(
  () => `user:${userId.value}:pets`,
  () => $api<PetSummary[]>(`/api/users/${userId.value}/pets`),
)

// ---------- 兜底头像 ----------
const defaultAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
       <rect width="120" height="120" fill="#F5EEE4"/>
       <circle cx="60" cy="48" r="20" fill="#DCD0BF"/>
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/>
     </svg>`
  )

// ---------- 头像编辑 ----------
const AVATAR_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

const canEditAvatar = computed(() => {
  if (!isSelf.value) return false
  if (!user.value) return false
  if (!user.value.avatarUpdatedAt) return true

  const last = new Date(user.value.avatarUpdatedAt).getTime()
  return Date.now() - last >= AVATAR_COOLDOWN_MS
})

const avatarModalVisible = ref(false)

function handleAvatarClick() {
  if (!canEditAvatar.value) return
  avatarModalVisible.value = true
}

function onAvatarUpdated(updated: PublicUser) {
  if (!user.value) return
  user.value = { ...user.value, ...updated }
  if (me.value && me.value.id === updated.id) {
    me.value = {
      ...me.value,
      avatarUrl: updated.avatarUrl,
      avatarUpdatedAt: updated.avatarUpdatedAt,
      ...(updated.point !== undefined ? { point: updated.point } : {}),
    }
  }
}

// ---------- 昵称编辑 ----------
const editNicknameModalVisible = ref(false)

function handleEditNickname() {
  editNicknameModalVisible.value = true
}

function onNicknameUpdated(updated: PublicUser) {
  if (!user.value) return
  user.value = { ...user.value, nickname: updated.nickname }
  if (me.value && me.value.id === updated.id) {
    me.value = { ...me.value, nickname: updated.nickname }
  }
}

// ============================================================
// 积分展示
// ============================================================
const displayPoint = computed<number | undefined>(() => {
  if (me.value) {
    if (me.value.id !== userId.value) return undefined
    return me.value.point ?? user.value?.point
  }
  return user.value?.point
})

// ---------- VIP 权益说明弹窗 ----------
const vipModalVisible = ref(false)

// ---------- VIP 升级 / 续费 ----------
const upgradeVipModalVisible = ref(false)
const manageSubModalVisible = ref(false) 

async function onUpgradeVipSuccess() {
  showToast({
    type: 'success',
    message: t('vip_subscribe_success') || '支付成功！正在同步 VIP 状态...',
    duration: 3000
  })
  setTimeout(async () => {
    await Promise.all([refreshMe(), refreshUser()])
  }, 2500)
}

// ---------- 添加宠物 ----------
const addPetModalVisible = ref(false)

function handleAddPet() {
  addPetModalVisible.value = true
}

function onPetCreated() {
  refreshPets()
}

// ============================================================
// 购买礼物 & 礼物仓库
// ============================================================
const buyGiftModalVisible = ref(false)

function handleBuyGift() {
  buyGiftModalVisible.value = true
}

// 仓库数据
const allGifts = ref<GiftPublic[]>([])
const inventory = ref<InventoryItem[]>([])

async function loadInventoryAndGifts() {
  if (!isSelf.value) return
  try {
    const [inv, gifts] = await Promise.all([
      $api<InventoryItem[]>('/api/users/me/inventory'),
      $api<GiftPublic[]>('/api/gifts')
    ])
    inventory.value = inv
    allGifts.value = gifts
  } catch (e) {
    // 静默失败
  }
}

const mergedInventory = computed(() => {
  return inventory.value
    .map(inv => {
      const gift = allGifts.value.find(g => g.id === inv.giftId)
      return { ...inv, gift }
    })
    .filter(item => item.gift && item.quantity > 0)
})

async function onBuyGiftSuccess() {
  showToast({ 
    type: 'success', 
    message: t('msg_buy_success_refresh'),
    duration: 3000
  })
  setTimeout(async () => {
    await refreshMe()
    await loadInventoryAndGifts()
  }, 2500)
}

// ============================================================
// 我的订单
// ============================================================
const orders = ref<UserOrder[]>([])
const ordersLoading = ref(false)

async function loadOrders() {
  if (!isSelf.value) return
  ordersLoading.value = true
  try {
    orders.value = await $api<UserOrder[]>('/api/users/me/orders')
  } catch (e) {
    // 静默失败
  } finally {
    ordersLoading.value = false
  }
}

function getOrderStatusText(status: number) {
  if (status === 0) return t('order_status_pending') || '待发货'
  if (status === 1) return t('order_status_shipped') || '已发货'
  return t('order_status_canceled') || '已取消'
}

function getOrderStatusClass(status: number) {
  if (status === 0) return 'is-pending'
  if (status === 1) return 'is-shipped'
  return 'is-canceled'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 监听加载
onMounted(() => {
  if (isSelf.value) {
    loadInventoryAndGifts()
    loadOrders()
  }
})
watch(isSelf, (val) => {
  if (val) {
    loadInventoryAndGifts()
    loadOrders()
  } else {
    inventory.value = []
    orders.value = []
  }
})

async function refreshMe() {
  try {
    const res = await $api<MeResponse>('/api/auth/me')
    if (res?.user) me.value = res.user
  } catch {}
}

// ---------- 退出登录 ----------
const token = useCookie<string | null>('token')

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: t('user_logout_confirm_title'),
      message: t('user_logout_confirm_desc'),
      confirmButtonText: t('btn_logout'),
      cancelButtonText: t('btn_cancel'),
    })
  } catch {
    return
  }

  token.value = null
  me.value = null
  await navigateTo('/')
}

useHead(() => ({
  title: user.value ? `${user.value.nickname} · ${t('app_name')}` : `${t('user_profile')} · ${t('app_name')}`,
}))
</script>

<template>
  <div class="page">
    <div class="container section user-page">
      <!-- 加载中 -->
      <div v-if="pending" class="user-hero user-hero--skeleton">
        <div class="skeleton user-hero__avatar-skeleton" />
        <div class="skeleton user-hero__name-skeleton" />
      </div>

      <!-- 加载失败 -->
      <div v-else-if="error || !user" class="empty">
        <p class="empty__title">{{ t('user_not_found') }}</p>
        <p class="empty__desc">{{ t('user_not_found_desc') }}</p>
        <NuxtLink to="/" class="btn btn--primary mt-4">{{ t('btn_back_home') }}</NuxtLink>
      </div>

      <template v-else>
        <header class="user-hero">
          <div class="user-hero__avatar-wrap">
            <img
              class="user-hero__avatar"
              :src="user.avatarUrl || defaultAvatar"
              :alt="user.nickname"
            />
            <button
              v-if="canEditAvatar"
              type="button"
              class="user-hero__avatar-edit"
              :aria-label="t('user_change_avatar')"
              @click="handleAvatarClick"
            >
              <van-icon name="edit" />
            </button>
          </div>

          <div class="user-hero__title-wrap">
            <h1 class="user-hero__name">{{ user.nickname }}</h1>
            <van-icon
              v-if="user.isVip"
              name="gem-o"
              class="user-hero__vip-icon"
              @click="vipModalVisible = true"
            />
            <button
              v-if="isSelf"
              type="button"
              class="user-hero__edit-nickname"
              :aria-label="t('user_change_nickname')"
              @click="handleEditNickname"
            >
              <van-icon name="edit" />
            </button>
          </div>

          <div v-if="displayPoint !== undefined" class="user-hero__points">
            <van-icon name="gold-coin-o" />
            <span>{{ t('user_points') }}: {{ displayPoint }}</span>
          </div>

          <p v-if="user.bio" class="user-hero__bio">{{ user.bio }}</p>
        </header>

        <!-- 宠物列表 -->
        <section v-if="pets && pets.length > 0" class="pets-section">
          <h2 class="pets-section__title">
            {{ isSelf ? t('user_my_pets') : t('user_pets') }}
          </h2>
          <div class="pet-grid">
            <NuxtLink
              v-for="pet in pets"
              :key="pet.id"
              :to="`/pets/${pet.slug}`"
              class="pet-item"
            >
              <img
                class="pet-item__avatar"
                :src="pet.avatarUrl"
                :alt="pet.name"
                loading="lazy"
              />
              <span class="pet-item__name">{{ pet.name }}</span>
            </NuxtLink>
          </div>
        </section>

        <!-- 我的礼物仓库 (仅本人可见) -->
        <section v-if="isSelf && mergedInventory.length > 0" class="inventory-section">
          <h2 class="inventory-section__title">
            {{ t('user_my_inventory') }}
          </h2>
          <div class="inventory-grid">
            <div 
              v-for="item in mergedInventory" 
              :key="item.giftId" 
              class="inventory-item"
              :title="`${item.gift!.name} x ${item.quantity}`"
            >
              <div class="inventory-item__img-wrap">
                <img :src="item.gift!.imageUrl" :alt="item.gift!.name" />
                <span class="inventory-item__count">x{{ item.quantity }}</span>
              </div>
              <span class="inventory-item__name">{{ item.gift!.name.split('/')[0] }}</span>
            </div>
          </div>
        </section>

        <!-- 我的订单 (仅本人可见) -->
        <section v-if="isSelf && orders.length > 0" class="orders-section">
          <h2 class="orders-section__title">{{ t('user_my_orders') || '我的订单' }}</h2>
          <div class="order-list">
            <div v-for="order in orders" :key="order.id" class="order-card">
              <div class="order-card__header">
                <span class="order-card__time">{{ formatDate(order.createdAt) }}</span>
                <span class="order-card__status" :class="getOrderStatusClass(order.status)">
                  {{ getOrderStatusText(order.status) }}
                </span>
              </div>
              
              <div class="order-card__body">
                <div class="order-card__info">
                  <div class="order-card__row">
                    <span class="order-card__plan">
                      {{ order.planType === 'digital' ? (t('order_plan_digital') || '电子版绘画') : (t('order_plan_physical') || '实物版绘画') }}
                    </span>
                    <span class="order-card__amount">${{ order.amount }}</span>
                  </div>
                  <p v-if="order.requirements" class="order-card__req">
                    <strong>{{ t('order_requirements_label') || '要求：' }}</strong>{{ order.requirements }}
                  </p>
                  <p v-if="order.planType === 'physical' && order.shippingAddress" class="order-card__address">
                    <strong>{{ t('order_address_label') || '邮寄地址：' }}</strong>{{ order.shippingAddress }}
                  </p>
                </div>
                
                <div v-if="order.images && order.images.length" class="order-card__images">
                  <img 
                    v-for="(img, i) in order.images" 
                    :key="i" 
                    :src="img" 
                    class="order-card__img" 
                    @click="showImagePreview({ images: order.images, startPosition: i })"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 本人操作区 -->
        <div v-if="isSelf" class="user-actions">
          <button
            type="button"
            class="btn btn--primary btn--lg"
            @click="handleAddPet"
          >
            {{ t('user_add_pet') }}
          </button>
          
          <button
            type="button"
            class="btn btn--gold btn--lg"
            @click="handleBuyGift"
          >
            {{ t('user_buy_gift') }}
          </button>

          <!-- VIP 按钮逻辑 -->
          <button
            v-if="!user.isVip"
            type="button"
            class="btn btn--gold btn--lg"
            @click="upgradeVipModalVisible = true"
          >
            {{ t('user_upgrade_vip') }}
          </button>
          <button
            v-else
            type="button"
            class="btn btn--gold btn--lg"
            @click="manageSubModalVisible = true"
          >
            {{ t('manage_sub_btn') }}
          </button>

          <button
            type="button"
            class="btn btn--lg"
            @click="handleLogout"
          >
            {{ t('user_logout') }}
          </button>
        </div>
      </template>
    </div>

    <!-- 添加宠物弹窗 -->
    <AddPetModal
      v-model="addPetModalVisible"
      @success="onPetCreated"
    />

    <!-- 头像上传弹窗 -->
    <AvatarUploadModal
      v-model="avatarModalVisible"
      @success="onAvatarUpdated"
    />

    <!-- 修改昵称弹窗 -->
    <EditNicknameModal
      v-if="user"
      v-model="editNicknameModalVisible"
      :current-nickname="user.nickname"
      @success="onNicknameUpdated"
    />

    <!-- 购买礼物弹窗 -->
    <BuyGiftModal
      v-model="buyGiftModalVisible"
      @success="onBuyGiftSuccess"
    />

    <!-- 升级 VIP 弹窗 -->
    <UpgradeVipModal
      v-model="upgradeVipModalVisible"
      @success="onUpgradeVipSuccess"
    />

    <!-- 管理订阅弹窗 -->
    <ManageSubscriptionModal
      v-model="manageSubModalVisible"
    />

    <!-- VIP 权益说明弹窗 -->
    <van-popup
      v-model:show="vipModalVisible"
      round
      :style="{ width: 'min(340px, 85%)' }"
      teleport="body"
    >
      <div class="vip-popup">
        <div class="vip-popup__header">
          <van-icon name="gem-o" class="vip-popup__icon" />
          <h3 class="vip-popup__title">{{ t('user_vip_title') }}</h3>
        </div>
        
        <ul class="vip-popup__list">
          <li class="vip-popup__item">
            <van-icon name="chat-o" class="vip-popup__item-icon" />
            <span>{{ t('user_vip_desc_1') }}</span>
          </li>
          <li class="vip-popup__item">
            <van-icon name="photo-o" class="vip-popup__item-icon" />
            <span>{{ t('user_vip_desc_2') }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="btn btn--primary vip-popup__close"
          @click="vipModalVisible = false"
        >
          {{ t('btn_i_know') }}
        </button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 页面骨架
// ============================================================
.page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 64px);
}

.user-page {
  flex: 1;
  display: flex;
  flex-direction: column;
}

// ============================================================
// 用户头部
// ============================================================
.user-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: @sp-7 @sp-4 @sp-6;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4;
  }

  &__avatar-wrap {
    position: relative;
    display: inline-block;
  }

  &__avatar {
    display: block;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    box-shadow:
      0 0 0 4px @surface,
      0 0 0 5px @accent-soft,
      0 8px 24px rgba(93, 71, 55, .12);
  }

  &__avatar-edit {
    position: absolute;
    right: 0;
    bottom: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 15px;
    color: @surface;
    background: @accent;
    border: 2px solid @surface;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: @shadow-1;
    transition: background @dur-fast ease, transform @dur-fast ease,
      box-shadow @dur-fast ease;

    &:hover {
      background: @accent-hover;
      transform: scale(1.06);
      box-shadow: @shadow-2;
    }

    &:active {
      transform: scale(.96);
    }
  }

  &__title-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: @sp-2;
    margin: @sp-4 0 0;
  }

  &__name {
    margin: 0; 
    font-family: @font-serif;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
    line-height: 1.2;
  }

  &__vip-icon {
    font-size: 26px;
    color: #f1c40f;
    cursor: pointer;
    filter: drop-shadow(0 2px 4px rgba(241, 196, 15, 0.4));
    transition: transform @dur-fast ease;

    &:hover {
      transform: scale(1.1) rotate(5deg);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }

  &__edit-nickname {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 14px;
    color: @ink-3;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all @dur-fast ease;

    &:hover {
      color: @accent;
      background: @accent-soft;
    }

    &:active {
      transform: scale(.92);
    }
  }

  &__points {
    display: inline-flex;
    align-items: center;
    gap: @sp-1;
    margin-top: @sp-3;
    padding: 4px 14px;
    background: @gold-soft;
    color: darken(@gold, 20%);
    border-radius: @radius-pill;
    font-size: @fs-sm;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  &__bio {
    margin: @sp-3 0 0;
    max-width: 480px;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-base;
    .line-2();
  }

  &--skeleton {
    gap: @sp-4;
  }

  &__avatar-skeleton {
    width: 120px;
    height: 120px;
    border-radius: 50%;
  }

  &__name-skeleton {
    width: 160px;
    height: 28px;
    border-radius: @radius-sm;
  }
}

// ============================================================
// 宠物列表区
// ============================================================
.pets-section {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  &__title {
    margin: 0 0 @sp-5;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    text-align: center;
  }
}

.pet-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: @sp-6 @sp-5;

  @media (max-width: @bp-sm) {
    gap: @sp-5 @sp-4;
  }
}

.pet-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-3;
  width: 140px;
  text-decoration: none;
  color: inherit;
  transition: transform @dur-fast ease;

  &:hover {
    transform: translateY(-2px);

    .pet-item__avatar {
      box-shadow:
        0 0 0 4px @surface,
        0 0 0 5px @accent,
        0 8px 20px rgba(93, 71, 55, .18);
    }
  }

  &__avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    box-shadow:
      0 0 0 4px @surface,
      0 0 0 5px @accent-soft,
      0 8px 24px rgba(93, 71, 55, .10);
    transition: box-shadow @dur-fast ease;
  }

  &__name {
    width: 100%;
    font-size: @fs-sm;
    font-weight: 500;
    color: @ink-1;
    text-align: center;
    .line-1();
  }
}

// ============================================================
// 礼物仓库区
// ============================================================
.inventory-section {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  &__title {
    margin: 0 0 @sp-4;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    text-align: center;
  }
}

.inventory-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: @sp-4;
}

.inventory-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-2;
  width: 72px;

  &__img-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    padding: 8px;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: @shadow-1;
    transition: transform @dur-fast ease, border-color @dur-fast ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    &:hover {
      transform: translateY(-2px);
      border-color: @accent;
    }
  }

  &__count {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: @danger;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    font-family: @font-mono;
    padding: 2px 6px;
    border-radius: @radius-pill;
    border: 2px solid @surface;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &__name {
    font-size: @fs-xs;
    color: @ink-2;
    text-align: center;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// ============================================================
// 我的订单区
// ============================================================
.orders-section {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  &__title {
    margin: 0 0 @sp-4;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
    text-align: center;
  }
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
}

.order-card {
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  padding: @sp-4;
  box-shadow: @shadow-1;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: @sp-3;
    padding-bottom: @sp-2;
    border-bottom: 1px dashed @border;
  }

  &__time {
    font-size: @fs-xs;
    color: @ink-3;
    font-family: @font-mono;
  }

  &__status {
    font-size: @fs-xs;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: @radius-pill;

    &.is-pending {
      color: @warning;
      background: fade(@warning, 10%);
    }
    &.is-shipped {
      color: @success;
      background: fade(@success, 10%);
    }
    &.is-canceled {
      color: @ink-3;
      background: @surface-2;
    }
  }

  &__body {
    display: flex;
    justify-content: space-between;
    gap: @sp-4;
    flex-wrap: wrap;
  }

  &__info {
    flex: 1;
    min-width: 200px;
  }

  &__row {
    display: flex;
    align-items: baseline;
    gap: @sp-3;
    margin-bottom: @sp-2;
  }

  &__plan {
    font-size: @fs-base;
    font-weight: 600;
    color: @ink-1;
  }

  &__amount {
    font-size: @fs-base;
    font-weight: 700;
    color: @accent;
    font-family: @font-mono;
  }

  &__req,
  &__address {
    margin: 0 0 @sp-1;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: 1.5;

    strong {
      color: @ink-3;
      font-weight: normal;
    }
  }

  &__images {
    display: flex;
    gap: @sp-2;
    flex-wrap: wrap;
  }

  &__img {
    width: 60px;
    height: 60px;
    border-radius: @radius-sm;
    object-fit: cover;
    border: 1px solid @border;
    cursor: zoom-in;
  }
}

// ============================================================
// 本人操作区
// ============================================================
.user-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: @sp-3;
  margin-top: auto;
  padding-top: @sp-6;
  padding-bottom: @sp-2;
  border-top: 1px solid @border;

  @media (max-width: @bp-sm) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: @sp-2;

    .btn { 
      width: 100%;
      padding-left: @sp-1;
      padding-right: @sp-1;
    }
  }
}

// ============================================================
// VIP 权益弹窗
// ============================================================
.vip-popup {
  display: flex;
  flex-direction: column;
  padding: @sp-6 @sp-5 @sp-5;
  text-align: center;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: @sp-5;
  }

  &__icon {
    font-size: 44px;
    color: #f1c40f;
    margin-bottom: @sp-2;
    filter: drop-shadow(0 2px 6px rgba(241, 196, 15, 0.4));
  }

  &__title {
    margin: 0;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__list {
    list-style: none;
    padding: @sp-4;
    margin: 0 0 @sp-5;
    background: @surface-2;
    border-radius: @radius-lg;
    text-align: left;
    border: 1px solid @border;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: @sp-3;
    font-size: @fs-sm;
    color: @ink-2;
    line-height: @lh-base;

    & + & {
      margin-top: @sp-3;
    }
  }

  &__item-icon {
    color: @accent;
    font-size: 18px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  &__close {
    width: 100%;
  }
}
</style>