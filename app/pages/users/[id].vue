<!-- app/pages/users/[id].vue -->
<script setup lang="ts">
import { showConfirmDialog } from 'vant'
import type { AuthUser } from '~/types/auth'
import { useI18n } from '~/composables/useI18n'

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
  // === 积分（后端仅本人返回） ===
  point?: number
}

interface PetSummary {
  id: number
  slug: string
  name: string
  avatarUrl: string
}

// ---------- 数据 ----------
const { $api } = useNuxtApp()

const { data: user, pending, error } = await useAsyncData<PublicUser>(
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
// 只有本人 + (从未上传过 或 距上次超过 7 天) 才能换
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
  // 更新页面数据
  user.value = { ...user.value, ...updated }
  // 同步顶部导航栏的头像 + 全局 point
  if (me.value && me.value.id === updated.id) {
    me.value = {
      ...me.value,
      avatarUrl: updated.avatarUrl,
      avatarUpdatedAt: updated.avatarUpdatedAt,
      // PATCH /api/users/me/avatar 也会返回最新 point，顺手同步，
      // 否则 displayPoint 优先读 me.point 时会读到旧值
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
  // 更新页面数据
  user.value = { ...user.value, nickname: updated.nickname }
  // 同步顶部导航栏的昵称
  if (me.value && me.value.id === updated.id) {
    me.value = { ...me.value, nickname: updated.nickname }
  }
}

// ============================================================
// 积分展示
// - 本人：优先读全局 me.point（宠物页送礼后 refreshMe 会更新它），
//         兜底读本页 user.point（用于 me 尚未恢复时的首屏）
// - 他人：后端 /api/users/:id 不返回 point，一律不展示
// ============================================================
const displayPoint = computed<number | undefined>(() => {
  if (me.value) {
    // 登录态已就绪：非本人不展示；本人 me.point 优先，user.point 兜底
    if (me.value.id !== userId.value) return undefined
    return me.value.point ?? user.value?.point
  }
  // 登录态尚未恢复（auth-init 还没回来）：
  // 后端只在本人访问时返回 point，有值即可信任
  return user.value?.point
})

// ---------- VIP 权益弹窗 ----------
const vipModalVisible = ref(false)

// ---------- 添加宠物 ----------
const addPetModalVisible = ref(false)

function handleAddPet() {
  addPetModalVisible.value = true
}

function onPetCreated() {
  // 创建成功后刷新宠物列表
  refreshPets()
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

      <!-- 用户信息 + 宠物列表 + 操作 -->
      <template v-else>
        <header class="user-hero">
          <!-- 头像 + 编辑图标 -->
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

          <!-- 名字 + VIP 图标 + 修改昵称 -->
          <div class="user-hero__title-wrap">
            <h1 class="user-hero__name">{{ user.nickname }}</h1>
            <van-icon
              v-if="user.isVip"
              name="gem-o"
              class="user-hero__vip-icon"
              @click="vipModalVisible = true"
            />
            <!-- 本人可见：修改昵称 -->
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

          <!-- 本人可见的积分展示（data source 见 displayPoint） -->
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

  // 头像 + 编辑图标的包裹层
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

  // 右下角小圆编辑按钮
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

  // 名字 + 图标的包裹层
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

  // 修改昵称图标
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

  // 积分展示
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
  margin-top: @sp-4;
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
// 本人操作区
// ============================================================
.user-actions {
  display: flex;
  justify-content: center;
  gap: @sp-3;
  margin-top: auto;
  padding-top: @sp-6;
  padding-bottom: @sp-2;
  border-top: 1px solid @border;

  @media (max-width: @bp-sm) {
    flex-direction: column;
    gap: @sp-2;

    .btn { width: 100%; }
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