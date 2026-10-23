<!-- app/pages/index.vue -->
<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'

// ============================================================
// 类型
// ============================================================

interface HomePet {
  id: number;
  slug: string;
  name: string;
  species: string;
  breed: string;
  birthday: string | null;
  avatarUrl: string;
  updatedAt: string;
  owner: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
    isVip?: boolean;
  };
}

interface HomeGift {
  id: number;
  createdAt: string;
  gift: {
    code: string;
    name: string;
    imageUrl: string;
  };
  pet: {
    id: number;
    slug: string;
    name: string;
    avatarUrl: string;
  };
  sender: {
    id: number | null;
    nickname: string;
    avatarUrl: string | null;
  };
}

interface HomeMessage {
  id: number;
  content: string;
  createdAt: string;
  pet: {
    id: number;
    slug: string;
    name: string;
    avatarUrl: string;
  };
  author: {
    id: number | null;
    nickname: string;
    avatarUrl: string | null;
  };
}

// ============================================================
// 国际化
// ============================================================
const { t, locale } = useI18n()

// ============================================================
// 数据（三个请求并行）
// ============================================================

const { $api } = useNuxtApp();

const HOME_LIMIT = 10;

const { data: recentPets, pending: petsPending } = await useAsyncData<HomePet[]>(
  "home:pets",
  () => $api<HomePet[]>(`/api/home/pets?limit=${HOME_LIMIT}`)
);

const { data: recentGifts, pending: giftsPending } = await useAsyncData<HomeGift[]>(
  "home:gifts",
  () => $api<HomeGift[]>(`/api/home/gifts?limit=${HOME_LIMIT}`)
);

const { data: recentMessages, pending: messagesPending } = await useAsyncData<
  HomeMessage[]
>("home:messages", () => $api<HomeMessage[]>(`/api/home/messages?limit=${HOME_LIMIT}`));

// ============================================================
// 兜底头像（仅留言、礼物弹窗使用）
// ============================================================

const defaultPetAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
       <rect width="120" height="120" fill="#F5EEE4"/>
       <circle cx="60" cy="52" r="22" fill="#DCD0BF"/>
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/>
     </svg>`
  );

const defaultUserAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
       <rect width="40" height="40" fill="#F5EEE4"/>
       <circle cx="20" cy="16" r="7" fill="#DCD0BF"/>
       <path d="M6 40c0-8 6-12 14-12s14 4 14 12z" fill="#DCD0BF"/>
     </svg>`
  );

// ============================================================
// 礼物弹窗
// ============================================================

const giftModalVisible = ref(false);
const currentGift = ref<HomeGift | null>(null);

function handleGiftClick(gift: HomeGift) {
  currentGift.value = gift;
  giftModalVisible.value = true;
}

// ============================================================
// 时间格式化
// ============================================================

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return t('time_just_now');
  if (diff < hour) return t('time_mins_ago', { n: Math.floor(diff / minute) });
  if (diff < day) return t('time_hours_ago', { n: Math.floor(diff / hour) });
  if (diff < 7 * day) return t('time_days_ago', { n: Math.floor(diff / day) });

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatFullTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${dd} ${hh}:${mm}`;
}

// ============================================================
// 标题 & SEO
// ============================================================

useHead(() => ({
  title: `${t('app_name')} · ${t('home_slogan')}`,
  meta: [
    {
      name: 'description',
      content: t('home_seo_desc'),
    },
  ],
}));
</script>

<template>
  <div class="home-page">
    <div class="container">
      <!-- 首屏欢迎语 (Banner) -->
      <header class="home-hero">
        <h1 class="home-hero__title">{{ t('app_name') }}</h1>
      </header>

      <!-- ============================================ -->
      <!-- 关于宠忆 (移动到 Banner 下方)                  -->
      <!-- ============================================ -->
      <section class="home-section">
        <div class="section-title">
          <div class="section-title__left">
            <h2 class="section-title__main">{{ t('home_about_title') }}</h2>
          </div>
        </div>
        <div class="home-about">
          <p class="home-about__desc">{{ t('home_seo_desc') }}</p>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- 1. 最近更新的宠物                             -->
      <!-- ============================================ -->
      <section class="home-section">
        <div class="section-title">
          <div class="section-title__left">
            <h2 class="section-title__main">{{ t('home_recent_pets') }}</h2>
          </div>
          <NuxtLink to="/pets" class="section-title__more">{{ t('home_all_pets') }}</NuxtLink>
        </div>

        <!-- 加载中 -->
        <div v-if="petsPending" class="pet-grid">
          <div v-for="i in 4" :key="i" class="pet-card pet-card--skeleton">
            <div class="skeleton pet-card__avatar-skeleton" />
            <div class="skeleton pet-card__name-skeleton" />
          </div>
        </div>

        <!-- 有数据（直接使用 PetCard 组件） -->
        <div v-else-if="recentPets && recentPets.length" class="pet-grid">
          <PetCard v-for="pet in recentPets" :key="pet.id" :pet="pet" />
        </div>

        <!-- 空状态 -->
        <div v-else class="home-section__empty">
          <p>{{ t('home_empty_pets') }}</p>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- 2. 最近送出的礼物                             -->
      <!-- ============================================ -->
      <section class="home-section">
        <div class="section-title">
          <div class="section-title__left">
            <h2 class="section-title__main">{{ t('home_recent_gifts') }}</h2>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="giftsPending" class="gift-strip">
          <div v-for="i in 6" :key="i" class="skeleton gift-chip-skeleton" />
        </div>

        <!-- 有数据 -->
        <div v-else-if="recentGifts && recentGifts.length" class="gift-strip">
          <button
            v-for="item in recentGifts"
            :key="item.id"
            type="button"
            class="gift-chip"
            :title="t('home_gift_tooltip', { sender: item.sender.nickname, pet: item.pet.name })"
            @click="handleGiftClick(item)"
          >
            <img
              class="gift-chip__img"
              :src="item.gift.imageUrl"
              :alt="item.gift.name"
              loading="lazy"
            />
            <span class="gift-chip__pet">
              <img
                :src="item.pet.avatarUrl || defaultPetAvatar"
                :alt="item.pet.name"
                loading="lazy"
              />
            </span>
          </button>
        </div>

        <!-- 空状态 -->
        <div v-else class="home-section__empty">
          <p>{{ t('home_empty_gifts') }}</p>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- 3. 最近的留言                                 -->
      <!-- ============================================ -->
      <section class="home-section">
        <div class="section-title">
          <div class="section-title__left">
            <h2 class="section-title__main">{{ t('home_recent_messages') }}</h2>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="messagesPending" class="msg-list">
          <div v-for="i in 3" :key="i" class="msg-skeleton">
            <div class="skeleton msg-skeleton__avatar" />
            <div class="msg-skeleton__main">
              <div class="skeleton msg-skeleton__line" />
              <div class="skeleton msg-skeleton__line msg-skeleton__line--short" />
            </div>
          </div>
        </div>

        <!-- 有数据 -->
        <div v-else-if="recentMessages && recentMessages.length" class="msg-list">
          <div v-for="msg in recentMessages" :key="msg.id" class="msg-item">
            <!-- 宠物头像 -->
            <NuxtLink
              :to="`/pets/${msg.pet.slug}`"
              class="msg-item__pet"
              :aria-label="`访问 ${msg.pet.name} 的主页`"
            >
              <img
                :src="msg.pet.avatarUrl || defaultPetAvatar"
                :alt="msg.pet.name"
                loading="lazy"
              />
            </NuxtLink>

            <div class="msg-item__main">
              <div class="msg-item__head">
                <NuxtLink
                  v-if="msg.author.id"
                  :to="`/users/${msg.author.id}`"
                  class="msg-item__author"
                >
                  {{ msg.author.nickname }}
                </NuxtLink>
                <span v-else class="msg-item__author">
                  {{ msg.author.nickname }}
                </span>

                <span class="msg-item__action">{{ t('msg_to') }}</span>

                <NuxtLink :to="`/pets/${msg.pet.slug}`" class="msg-item__pet-name">
                  {{ msg.pet.name }}
                </NuxtLink>

                <span class="msg-item__action">{{ t('msg_action') }}</span>
                <span class="msg-item__time">
                  {{ formatTime(msg.createdAt) }}
                </span>
              </div>
              <p class="msg-item__content">{{ msg.content }}</p>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="home-section__empty">
          <p>{{ t('home_empty_messages') }}</p>
        </div>
      </section>

      <!-- ============================================ -->
      <!-- 4. 宠物手绘                                   -->
      <!-- ============================================ -->
      <section class="home-section">
        <div class="section-title">
          <div class="section-title__left">
            <h2 class="section-title__main">{{ t('home_drawing_title') }}</h2>
          </div>
        </div>
        <div class="home-drawing">
          <div class="home-drawing__info">
            <p class="home-drawing__desc">{{ t('home_drawing_desc') }}</p>
            <!-- 新增：定制链接 -->
            <NuxtLink to="/contact" class="home-drawing__link">
              {{ t('home_drawing_cta') }} &rarr;
            </NuxtLink>
          </div>
          <div class="home-drawing__gallery">
            <!-- 示例图 -->
            <figure class="home-drawing__item">
              <img 
                src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/example1.jpg" 
                alt="Hand-drawn example" 
                loading="lazy" 
              />
              <figcaption>{{ t('home_drawing_example_label') }}</figcaption>
            </figure>
            <!-- 作者图 -->
            <figure class="home-drawing__item">
              <!-- 此处替换为真实的作者图片 URL -->
              <img 
                src="https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/66.jpg" 
                alt="Artist" 
                loading="lazy" 
              />
              <figcaption>{{ t('home_drawing_artist_label') }}</figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>

    <!-- ============================================ -->
    <!-- 礼物明细弹窗                                   -->
    <!-- ============================================ -->
    <van-popup
      v-model:show="giftModalVisible"
      round
      :style="{ width: 'min(360px, 90%)' }"
      teleport="body"
    >
      <div v-if="currentGift" class="gift-record">
        <div class="gift-record__icon">
          <img :src="currentGift.gift.imageUrl" :alt="currentGift.gift.name" />
        </div>
        <p class="gift-record__label">
          {{ t('gift_record_label') }}<strong>{{ currentGift.gift.name }}</strong>
        </p>

        <div class="gift-record__divider" />

        <p class="gift-record__from">{{ t('gift_record_from') }}</p>

        <NuxtLink
          v-if="currentGift.sender.id"
          :to="`/users/${currentGift.sender.id}`"
          class="gift-record__sender"
          @click="giftModalVisible = false"
        >
          <img
            class="gift-record__avatar"
            :src="currentGift.sender.avatarUrl || defaultUserAvatar"
            :alt="currentGift.sender.nickname"
          />
          <span class="gift-record__name">
            {{ currentGift.sender.nickname }}
          </span>
        </NuxtLink>
        <div v-else class="gift-record__sender gift-record__sender--anon">
          <img class="gift-record__avatar" :src="defaultUserAvatar" alt="anon" />
          <span class="gift-record__name">
            {{ currentGift.sender.nickname || t('gift_record_anon') }}
          </span>
        </div>

        <p class="gift-record__to">{{ t('gift_record_to') }}</p>
        <NuxtLink
          :to="`/pets/${currentGift.pet.slug}`"
          class="gift-record__sender"
          @click="giftModalVisible = false"
        >
          <img
            class="gift-record__avatar"
            :src="currentGift.pet.avatarUrl || defaultPetAvatar"
            :alt="currentGift.pet.name"
          />
          <span class="gift-record__name">
            {{ currentGift.pet.name }}
          </span>
        </NuxtLink>

        <p class="gift-record__time">
          {{ formatFullTime(currentGift.createdAt) }}
        </p>

        <button
          type="button"
          class="btn btn--primary gift-record__close"
          @click="giftModalVisible = false"
        >
          {{ t('btn_close') }}
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
.home-page {
  padding-bottom: @sp-8;
}

// ============================================================
// 首屏欢迎语（带背景图，无遮罩，文字上移）
// ============================================================
.home-hero {
  position: relative;
  text-align: center;
  padding: @sp-8 @sp-4 160px; 
  min-height: 420px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow: hidden;

  background-image: url('https://cc-ukbucket.oss-eu-west-1.aliyuncs.com/pet_bgs/banner.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center 80%;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100px;
    background: linear-gradient(to bottom, transparent, @paper);
    z-index: 0;
    pointer-events: none;
  }

  &__title {
    position: relative;
    z-index: 1;
    margin: 0;
    margin-top: -30px;
    font-size: 52px; 
    font-family: 'Comic Sans MS', 'Chalkboard SE', 'YouYuan', 'PingFang SC', sans-serif;
    font-weight: 800;
    color: @ink-1;
    letter-spacing: 0.08em;
    text-shadow: 0 2px 10px rgba(255, 255, 255, 0.8), 0 1px 2px rgba(255, 255, 255, 0.9);

    @media (max-width: @bp-sm) {
      font-size: 40px;
    }
  }

  @media (max-width: @bp-sm) {
    min-height: 320px;
    padding: @sp-6 @sp-4 100px;
    background-position: center bottom;
  }
}

// ============================================================
// 通用 section
// ============================================================
.home-section {
  margin-top: @sp-7;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  // 👇 新增：专门针对第一个版块（关于宠忆），去掉标题下方的横线
  &:first-of-type {
    .section-title {
      border-bottom: none; 
    }
  }

  // 移除了之前的 first-of-type 负边距，让它自然排在 banner 下方并保留分割线

  .section-title__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  &__empty {
    padding: @sp-7 @sp-4;
    text-align: center;
    color: @ink-3;
    font-size: @fs-sm;
    background: @surface-2;
    border-radius: @radius-lg;
    border: 1px dashed @border;

    p {
      margin: 0;
    }
  }
}

// ============================================================
// 1. 宠物卡片网格
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

.pet-card--skeleton {
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

  .pet-card__avatar-skeleton {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-bottom: @sp-2;
  }

  .pet-card__name-skeleton {
    width: 60%;
    height: 20px;
    border-radius: @radius-sm;
  }
}

// ============================================================
// 2. 礼物条
// ============================================================
.gift-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: @sp-3;

  @media (max-width: @bp-sm) {
    gap: @sp-2;
  }
}

.gift-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  padding: 8px;
  background: @surface-2;
  border: 1px solid @border;
  border-radius: 50%;
  cursor: pointer;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease,
    border-color @dur-fast ease;

  &:hover {
    border-color: @accent;
    box-shadow: @shadow-1;
    transform: translateY(-2px);

    .gift-chip__pet {
      border-color: @accent;
    }
  }

  &:active {
    transform: translateY(0) scale(0.96);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &__pet {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: @surface;
    border: 2px solid @surface;
    box-shadow: 0 0 0 1px @border;
    overflow: hidden;
    transition: border-color @dur-fast ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  @media (max-width: @bp-sm) {
    width: 56px;
    height: 56px;
    padding: 6px;

    &__pet {
      width: 20px;
      height: 20px;
    }
  }
}

.gift-chip-skeleton {
  width: 64px;
  height: 64px;
  border-radius: 50%;

  @media (max-width: @bp-sm) {
    width: 56px;
    height: 56px;
  }
}

// ============================================================
// 3. 留言列表
// ============================================================
.msg-list {
  display: flex;
  flex-direction: column;
  gap: @sp-4;
}

.msg-item {
  display: flex;
  gap: @sp-3;
  padding: @sp-3;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  transition: border-color @dur-fast ease, box-shadow @dur-base ease;

  &:hover {
    border-color: @border-strong;
    box-shadow: @shadow-1;
  }

  &__pet {
    flex-shrink: 0;
    display: inline-block;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    background: @surface-2;
    border: 1px solid @border;
    transition: transform @dur-fast ease, box-shadow @dur-fast ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 3px @accent-soft;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px @sp-1;
    margin-bottom: 4px;
  }

  &__author {
    font-size: @fs-sm;
    font-weight: 600;
    color: @ink-1;
    text-decoration: none;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent;
    }
  }

  &__pet-name {
    font-size: @fs-sm;
    font-weight: 600;
    color: @ink-1;
    text-decoration: none;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent;
    }
  }

  &__action {
    font-size: @fs-xs;
    color: @ink-3;
  }

  &__time {
    margin-left: auto;
    font-size: @fs-xs;
    color: @ink-3;
  }

  &__content {
    margin: 0;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-base;
    word-break: break-word;
    .line-2();
  }
}

.msg-skeleton {
  display: flex;
  gap: @sp-3;
  padding: @sp-3;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;

  &__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: @sp-2;
    padding-top: 4px;
  }

  &__line {
    height: 14px;
    border-radius: @radius-sm;

    &--short {
      width: 60%;
    }
  }
}

// ============================================================
// 4. 关于宠忆
// ============================================================
.home-about {
  padding: @sp-6 @sp-5;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  text-align: center;
  box-shadow: @shadow-1;

  &__desc {
    margin: 0 auto;
    max-width: 700px;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-loose;
    white-space: pre-line; /* 允许换行 */
    text-align: justify; /* 两端对齐更好看 */
    text-justify: inter-ideograph;
    
    @media (max-width: @bp-sm) {
      text-align: left;
    }
  }
}

// ============================================================
// 5. 宠物手绘
// ============================================================
.home-drawing {
  padding: @sp-6;
  background: @surface;
  border: 1px solid @border;
  border-radius: @radius-lg;
  box-shadow: @shadow-1;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: @sp-6;

  @media (max-width: @bp-sm) {
    flex-direction: column;
    padding: @sp-4;
    gap: @sp-4;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__desc {
    margin: 0;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-loose;
    white-space: pre-line;
  }

  &__link {
    display: inline-block;
    margin-top: @sp-4;
    font-size: @fs-base;
    font-weight: 600;
    color: @accent;
    text-decoration: none;
    transition: color @dur-fast ease, transform @dur-fast ease;

    &:hover {
      color: @accent-hover;
      transform: translateX(4px);
    }
  }

  &__gallery {
    display: flex;
    gap: @sp-4;
    flex-shrink: 0;

    @media (max-width: @bp-sm) {
      width: 100%;
      justify-content: space-between;
      gap: @sp-3;
    }
  }

  &__item {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-2;
    width: 180px;

    @media (max-width: @bp-sm) {
      width: 100%;
    }

    img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: @radius;
      border: 1px solid @border;
      box-shadow: @shadow-1;
      transition: transform @dur-base ease, box-shadow @dur-base ease;

      &:hover {
        transform: scale(1.02);
        box-shadow: @shadow-2;
      }
    }

    figcaption {
      font-size: @fs-xs;
      color: @ink-3;
      text-align: center;
    }
  }
}

// ============================================================
// 礼物明细弹窗
// ============================================================
.gift-record {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: @sp-6 @sp-5 @sp-5;
  text-align: center;

  &__icon {
    width: 88px;
    height: 88px;
    padding: @sp-3;
    display: flex;
    align-items: center;
    justify-content: center;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: 50%;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  &__label {
    margin: @sp-3 0 0;
    font-size: @fs-base;
    color: @ink-2;

    strong {
      color: @accent;
      font-weight: 700;
      margin: 0 2px;
    }
  }

  &__divider {
    width: 40px;
    height: 1px;
    margin: @sp-4 0;
    background: @border;
  }

  &__from,
  &__to {
    margin: 0 0 @sp-2;
    font-size: @fs-xs;
    color: @ink-3;
    letter-spacing: 0.1em;
  }

  &__from + .gift-record__sender {
    margin-bottom: @sp-3;
  }

  &__sender {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-2;
    padding: @sp-2 @sp-3;
    text-decoration: none;
    color: inherit;
    border-radius: @radius;
    transition: background @dur-fast ease;

    &:hover:not(&--anon) {
      background: @accent-soft;

      .gift-record__name {
        color: @accent;
      }
    }

    &--anon {
      cursor: default;
    }
  }

  &__avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    border: 2px solid @surface;
    box-shadow: 0 0 0 1px @border;
  }

  &__name {
    font-size: @fs-base;
    font-weight: 500;
    color: @ink-1;
    transition: color @dur-fast ease;
    max-width: 200px;
    .line-1();
  }

  &__time {
    margin: @sp-4 0 0;
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }

  &__close {
    margin-top: @sp-5;
    width: 100%;
  }
}
</style>