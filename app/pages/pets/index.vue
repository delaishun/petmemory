<!-- app/pages/pets/index.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 国际化
// ============================================================
const { t } = useI18n()

// ============================================================
// 类型
// ============================================================

interface OwnerBrief {
  id: number
  nickname: string
  avatarUrl: string | null
  isVip?: boolean
  isLifetimeVip?: boolean     // 👈 必须补上
  vipExpiresAt?: string | null // 👈 必须补上
}

interface PetListItem {
  id: number
  slug: string
  name: string
  species: string
  breed: string
  birthday: string | null
  leaveDate: string | null   // 👈 新增：传给 PetCard 用于忌日特效
  avatarUrl: string
  updatedAt: string
  owner: OwnerBrief
}

interface PetListPage {
  items: PetListItem[]
  total: number
}

// ============================================================
// 数据获取与分页逻辑
// ============================================================

const { $api } = useNuxtApp()

const PAGE_SIZE = 20

// 1. 使用 useAsyncData 获取首屏数据，直接解构出 pending 和 error
const { data: firstPage, pending, error: fetchError } = await useAsyncData<PetListPage>(
  'pets:list:first',
  () => $api<PetListPage>(`/api/pets?limit=${PAGE_SIZE}&offset=0`)
)

// 2. 用于存放“加载更多”的额外数据
const extraPets = ref<PetListItem[]>([])
const extraTotal = ref(0)

// 3. 组合所有宠物列表
const pets = computed(() => {
  const firstItems = firstPage.value?.items || []
  return [...firstItems, ...extraPets.value]
})

// 4. 组合总数量
const total = computed(() => {
  // 如果加载过更多，用最新的 total，否则用首屏的 total
  return extraTotal.value || firstPage.value?.total || 0
})

// 5. 是否有更多数据
const hasMore = computed(() => pets.value.length < total.value)

// 加载更多相关状态
const loadingMore = ref(false)
const loadMoreError = ref('')

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  if (!pets.value.length && total.value === 0) return

  loadingMore.value = true
  loadMoreError.value = ''

  try {
    const res = await $api<PetListPage>(
      `/api/pets?limit=${PAGE_SIZE}&offset=${pets.value.length}`,
    )
    // 追加数据
    extraPets.value = [...extraPets.value, ...res.items]
    extraTotal.value = res.total
  } catch (err: any) {
    loadMoreError.value =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      `${t('common_load_failed')}，${t('common_retry_later')}`
  } finally {
    loadingMore.value = false
  }
}

// ============================================================
// 标题
// ============================================================

useSeoMeta({
  title: 'All Pet Memorials',
  description:
    'Browse all beloved pets remembered on PetMemory. Visit their memorial pages, leave messages, and share in their memory.',
  ogTitle: 'All Pet Memorials - PetMemory',
  ogDescription: 'Browse all beloved pets remembered on PetMemory.',
  ogImage: 'https://music.petmemory.me/og-cover.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 600,
  ogType: 'website',
  ogUrl: 'https://www.petmemory.me/pets',
  twitterCard: 'summary_large_image',
  twitterTitle: 'All Pet Memorials - PetMemory',
  twitterDescription: 'Browse all beloved pets remembered on PetMemory.',
  twitterImage: 'https://music.petmemory.me/og-cover.jpg',
})
useHead({
  link: [
    { rel: 'canonical', href: 'https://www.petmemory.me/pets' }
  ]
})
</script>

<template>
  <div class="pets-page">
    <div class="container">
      <!-- 页头 -->
      <header class="pets-header">
        <h1 class="pets-header__title serif">{{ t('pets_title') }}</h1>
        <p class="pets-header__subtitle">
          <!-- 👇 用 pending 替代 initialLoading -->
          <template v-if="!pending && total > 0">
            {{ t('pets_count_pre') }} <strong>{{ total }}</strong> {{ t('pets_count_suf') }}
          </template>
          <template v-else-if="!pending">
            {{ t('home_empty_pets') }}
          </template>
          <template v-else>&nbsp;</template>
        </p>
      </header>

      <!-- 加载失败（首屏） -->
      <div v-if="fetchError" class="empty">
        <p class="empty__title">{{ t('common_load_failed') }}</p>
        <p class="empty__desc">{{ t('common_retry_later') }}</p>
      </div>

      <!-- 首屏骨架屏 👇 用 pending 替代 initialLoading -->
      <div v-else-if="pending" class="pet-grid">
        <div
          v-for="i in 4"
          :key="i"
          class="pet-card-skeleton"
        >
          <div class="skeleton pet-card-skeleton__avatar" />
          <div class="skeleton pet-card-skeleton__name" />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="pets.length === 0" class="empty">
        <p class="empty__title">{{ t('pets_empty') }}</p>
        <p class="empty__desc">{{ t('pets_empty_desc') }}</p>
        <NuxtLink to="/" class="btn btn--primary mt-4">{{ t('btn_back_home') }}</NuxtLink>
      </div>

      <!-- 宠物网格 -->
      <template v-else>
        <div class="pet-grid">
          <PetCard v-for="pet in pets" :key="pet.id" :pet="pet" />
        </div>

        <!-- 加载更多 -->
        <div class="pets-more">
          <template v-if="hasMore">
            <button
              type="button"
              class="btn btn--lg"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? t('pets_loading') : t('pets_load_more') }}
            </button>
            <p v-if="loadMoreError" class="pets-more__error">
              {{ loadMoreError }}
            </p>
          </template>

          <p v-else class="pets-more__end">{{ t('pets_no_more') }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 页面骨架
// ============================================================
.pets-page {
  padding-bottom: @sp-8;
}

// ============================================================
// 页头
// ============================================================
.pets-header {
  text-align: center;
  padding: @sp-7 @sp-4 @sp-5;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4 @sp-4;
  }

  &__title {
    margin: 0;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
    letter-spacing: .04em;
  }

  &__subtitle {
    margin: @sp-3 0 0;
    font-size: @fs-sm;
    color: @ink-3;
    line-height: @lh-base;

    strong {
      color: @accent;
      font-weight: 700;
      margin: 0 2px;
    }
  }
}

// ============================================================
// 宠物网格 (仅保留网格布局)
// ============================================================
.pet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: @sp-5;

  @media (max-width: @bp-sm) {
    grid-template-columns: 1fr;
    gap: @sp-4;
  }
}

// ============================================================
// 骨架屏 (保留在页面中，因为它是页面加载状态)
// ============================================================
.pet-card-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: @sp-4;
  padding: @sp-5 @sp-4;
  min-height: 240px;
  background-color: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  pointer-events: none;

  &__avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-bottom: @sp-2;
  }

  &__name {
    width: 60%;
    height: 20px;
    border-radius: @radius-sm;
  }
}

// ============================================================
// 加载更多区
// ============================================================
.pets-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-3;
  margin-top: @sp-7;
  padding-top: @sp-5;

  &__error {
    margin: 0;
    font-size: @fs-sm;
    color: @danger;
  }

  &__end {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
    letter-spacing: .04em;

    &::before,
    &::after {
      content: '·';
      padding: 0 @sp-2;
      color: @border-strong;
    }
  }
}
</style>