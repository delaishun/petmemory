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
  isVip?: boolean // 补充 isVip 字段
}

interface PetListItem {
  id: number
  slug: string
  name: string
  species: string
  breed: string
  birthday: string | null
  avatarUrl: string
  updatedAt: string
  owner: OwnerBrief
}

interface PetListPage {
  items: PetListItem[]
  total: number
}

// ============================================================
// 数据
// ============================================================

const { $api } = useNuxtApp()

const PAGE_SIZE = 20

const pets = ref<PetListItem[]>([])
const total = ref(0)

// 首屏加载
const initialLoading = ref(true)
// 加载更多中
const loadingMore = ref(false)
// 加载更多失败时的提示
const loadMoreError = ref('')

const hasMore = computed(() => pets.value.length < total.value)

// 首屏
const { error: fetchError } = await useAsyncData<PetListPage>(
  'pets:list:first',
  () =>
    $api<PetListPage>(`/api/pets?limit=${PAGE_SIZE}&offset=0`),
  {
    transform: (res) => {
      pets.value = res.items
      total.value = res.total
      initialLoading.value = false
      return res
    },
  },
)

// ============================================================
// 加载更多
// ============================================================

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  if (!pets.value.length && total.value === 0) return

  loadingMore.value = true
  loadMoreError.value = ''

  try {
    const res = await $api<PetListPage>(
      `/api/pets?limit=${PAGE_SIZE}&offset=${pets.value.length}`,
    )
    // 追加
    pets.value = [...pets.value, ...res.items]
    total.value = res.total
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

// useHead(() => ({
//   title: `${t('pets_title')} · ${t('app_name')}`,
// }))
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
</script>

<template>
  <div class="pets-page">
    <div class="container">
      <!-- 页头 -->
      <header class="pets-header">
        <h1 class="pets-header__title serif">{{ t('pets_title') }}</h1>
        <p class="pets-header__subtitle">
          <template v-if="!initialLoading && total > 0">
            {{ t('pets_count_pre') }} <strong>{{ total }}</strong> {{ t('pets_count_suf') }}
          </template>
          <template v-else-if="!initialLoading">
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

      <!-- 首屏骨架屏 -->
      <div v-else-if="initialLoading" class="pet-grid">
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
          <!-- 直接使用 PetCard 组件 -->
          <PetCard v-for="pet in pets" :key="pet.id" :pet="pet" />
        </div>

        <!-- 加载更多 -->
        <div class="pets-more">
          <!-- 有更多 -->
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

          <!-- 已全部加载 -->
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