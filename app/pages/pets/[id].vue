<!-- app/pages/pets/[id].vue -->
<script setup lang="ts">
import type { AuthUser, MeResponse } from "~/types/auth";
import type { EditablePet } from "~/components/EditPetModal.vue";
import type { PetGiftSummary } from "~/components/GiftModal.vue";
import { showDialog, showConfirmDialog, showToast, showImagePreview } from "vant";
import { useI18n } from '~/composables/useI18n'
import { useEffectBackgrounds } from '~/composables/usePetEffect'

// ============================================================
// 国际化 & 特效逻辑
// ============================================================
const { t, locale } = useI18n()
const { getEffectClass, getEffectStyle } = useEffectBackgrounds()

// ============================================================
// 类型
// ============================================================

interface OwnerBrief {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  isVip?: boolean;
}

interface PetDetail {
  id: number;
  slug: string;
  name: string;
  species: string;
  breed: string;
  gender: number;
  birthday: string | null;
  hometown: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  status: number;
  owner: OwnerBrief;
  // === 新增字段 ===
  moodScore: number;
  currentExpressionUrl: string | null;
  isGenerating?: boolean;
}

interface PetPublic {
  id: number;
  slug: string;
  name: string;
  species: string;
  breed: string;
  gender: number;
  birthday: string | null;
  hometown: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
}

interface PhotoPublic {
  id: number;
  imageUrl: string;
  caption: string;
  sortOrder: number;
  createdAt: string;
}

interface MessagePublic {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: number | null;
    nickname: string;
    avatarUrl: string | null;
    isOwner: boolean;
  };
}

interface MessagePage {
  items: MessagePublic[];
  total: number;
}

/** 礼物明细项 */
interface GiftRecordPublic {
  id: number;
  giftId: number;
  giftCode: string;
  giftName: string;
  giftImageUrl: string;
  sender: {
    id: number | null;
    nickname: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

/** 对话消息结构 */
interface ChatMessagePublic {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/** 主页公开对话返回结构 */
interface PublicChatResponse {
  hasConversation: boolean;
  isPublic: boolean;
  messages: ChatMessagePublic[];
  petName: string;
  ownerNickname: string;
}

// ============================================================
// 数据
// ============================================================

const route = useRoute();
const slug = computed(() => String(route.params.id || ""));

const { $api } = useNuxtApp();

const PAGE_SIZE = 20;

const { data: pet, pending, error, refresh: refreshPet } = await useAsyncData<PetDetail>(
  () => `pet:${slug.value}`,
  () => $api<PetDetail>(`/api/pets/${slug.value}`)
);

const { data: photos, refresh: refreshPhotos } = await useAsyncData<PhotoPublic[]>(
  () => `pet:${slug.value}:photos`,
  () => $api<PhotoPublic[]>(`/api/pets/${slug.value}/photos`)
);

const { data: messages } = await useAsyncData<MessagePage>(
  () => `pet:${slug.value}:messages`,
  () => $api<MessagePage>(`/api/pets/${slug.value}/messages?limit=${PAGE_SIZE}&offset=0`)
);

const { data: giftSummary } = await useAsyncData<PetGiftSummary[]>(
  () => `pet:${slug.value}:gifts`,
  () => $api<PetGiftSummary[]>(`/api/pets/${slug.value}/gifts`)
);

const { data: giftRecords, refresh: refreshGiftRecords } = await useAsyncData<
  GiftRecordPublic[]
>(
  () => `pet:${slug.value}:gift-records`,
  () => $api<GiftRecordPublic[]>(`/api/pets/${slug.value}/gift-records`)
);

// 获取主页公开对话
const { data: publicChat, refresh: refreshPublicChat } = await useAsyncData<
  PublicChatResponse
>(
  () => `pet:${slug.value}:public-chat`,
  () => $api<PublicChatResponse>(`/api/pets/${slug.value}/public-chat`)
);

// 礼物总件数
const totalGiftCount = computed(
  () => giftSummary.value?.reduce((s, g) => s + g.count, 0) ?? 0
);

const giftItems = computed<GiftRecordPublic[]>(() => giftRecords.value ?? []);

// ============================================================
// 心情状态文本
// ============================================================
const moodStatusText = computed(() => {
  if (!pet.value) return ''
  const score = pet.value.moodScore
  if (score > 150) return t('mood_happy')
  if (score > 50) return t('mood_smile')
  return t('mood_calm')
})

// ============================================================
// 登录 & 主人判断
// ============================================================

const me = useState<AuthUser | null>("auth:user", () => null);

const isLoggedIn = computed(() => !!me.value);

const isOwner = computed(
  () => !!me.value && !!pet.value && me.value.id === pet.value.owner.id
);

// 是否是 VIP 宠物面板
const isVipPet = computed(() => {
  if (pet.value?.owner?.isVip !== undefined) {
    return pet.value.owner.isVip;
  }
  return isOwner.value && !!me.value?.isVip;
});

/** 当前登录用户积分（字段名对齐 DB users.point） */
const myPoint = computed<number | undefined>(() => me.value?.point);

// ============================================================
// 轮询 & 生成弹窗控制
// ============================================================
const expressionModalVisible = ref(false);
let pollTimer: any = null;

// 如果一进入就在生成中，立刻弹出提示
watch(
  () => pet.value?.isGenerating,
  (val) => {
    if (val) {
      expressionModalVisible.value = true;
      if (!pollTimer) {
        pollTimer = setInterval(async () => {
          await refreshPet();
          if (!pet.value?.isGenerating) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        }, 4000);
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});

// ============================================================
// 对话可见性控制
// ============================================================

const isChatPublic = ref(true);

watch(
  publicChat,
  (v) => {
    if (v) {
      isChatPublic.value = v.isPublic;
    }
  },
  { immediate: true }
);

async function toggleChatVisibility() {
  if (!pet.value) return;
  try {
    await $api(`/api/pets/${pet.value.slug}/chat/visibility`, {
      method: "PATCH",
      body: { isPublic: !isChatPublic.value },
    });
    isChatPublic.value = !isChatPublic.value;
    showToast({
      type: "success",
      message: isChatPublic.value ? t('chat_visibility_public') : t('chat_visibility_private'),
    });
    await refreshPublicChat();
  } catch (err: any) {
    showToast(err?.data?.error || t('msg_operation_failed'));
  }
}

// ============================================================
// VIP 权益弹窗
// ============================================================
const vipModalVisible = ref(false)

// ============================================================
// 编辑弹窗
// ============================================================

const editPetModalVisible = ref(false);

const editablePet = computed<EditablePet | null>(() => {
  if (!pet.value) return null;
  return {
    id: pet.value.id,
    slug: pet.value.slug,
    name: pet.value.name,
    species: pet.value.species,
    breed: pet.value.breed,
    hometown: pet.value.hometown,
    birthday: pet.value.birthday,
    status: pet.value.status ?? 1,
  };
});

function handleEdit() {
  editPetModalVisible.value = true;
}

function onPetUpdated(updated: PetPublic) {
  if (!pet.value) return;
  pet.value = { ...pet.value, ...updated };
}

// ============================================================
// 相册上传弹窗
// ============================================================

const uploadPhotoModalVisible = ref(false);

function handleUploadPhoto() {
  if (!me.value) {
    showDialog({ message: t('msg_please_login') });
    return;
  }

  if (!me.value.isVip) {
    showDialog({
      title: t('vip_feature_title'),
      message: t('vip_feature_album_desc'),
      confirmButtonText: t('btn_i_know'),
    });
    return;
  }

  uploadPhotoModalVisible.value = true;
}

function onPhotosUploaded(list: PhotoPublic[]) {
  photos.value = list;
}

// ============================================================
// 相册管理态
// ============================================================

const editMode = ref(false);

function toggleEditMode() {
  editMode.value = !editMode.value;
}

watch(
  () => photos.value?.length ?? 0,
  (len) => {
    if (len === 0) editMode.value = false;
  }
);

// ============================================================
// 删除相册照片
// ============================================================

async function handleDeletePhoto(photo: PhotoPublic) {
  if (!pet.value) return;

  try {
    await showConfirmDialog({
      title: t('dialog_delete_photo_title'),
      message: t('dialog_delete_photo_desc'),
      confirmButtonText: t('btn_delete'),
      cancelButtonText: t('btn_cancel'),
      confirmButtonColor: "#C25A5A",
    });
  } catch {
    return;
  }

  try {
    await $api(`/api/pets/${pet.value.slug}/photos/${photo.id}`, {
      method: "DELETE",
    });

    photos.value = (photos.value ?? []).filter((p) => p.id !== photo.id);
    showToast({ type: "success", message: t('msg_deleted') });
  } catch (err: any) {
    showToast(
      err?.data?.error || err?.data?.message || err?.message || t('msg_delete_failed')
    );
  }
}

// ============================================================
// 点击照片看大图
// ============================================================

function handlePhotoClick(photo: PhotoPublic) {
  if (editMode.value) return;
  if (!photos.value || photos.value.length === 0) return;

  showImagePreview({
    images: photos.value.map((p) => p.imageUrl),
    startPosition: photos.value.findIndex((p) => p.id === photo.id),
    closeable: true,
    loop: false,
  });
}

// ============================================================
// 留言弹窗
// ============================================================

const messageModalVisible = ref(false);

function handleMessage() {
  if (!me.value) {
    showDialog({ message: t('msg_please_login') });
    return;
  }
  messageModalVisible.value = true;
}

function onMessageCreated(message: MessagePublic) {
  if (!messages.value) return;
  messages.value = {
    items: [message, ...messages.value.items],
    total: messages.value.total + 1,
  };
}

// ============================================================
// 删除留言（仅主人可操作）
// ============================================================

async function handleDeleteMessage(message: MessagePublic) {
  if (!pet.value) return;

  try {
    await showConfirmDialog({
      title: t('dialog_delete_msg_title'),
      message: t('dialog_delete_msg_desc'),
      confirmButtonText: t('btn_delete'),
      cancelButtonText: t('btn_cancel'),
      confirmButtonColor: "#C25A5A",
    });
  } catch {
    return;
  }

  try {
    await $api(`/api/pets/${pet.value.slug}/messages/${message.id}`, {
      method: "DELETE",
    });

    if (messages.value) {
      messages.value = {
        items: messages.value.items.filter((m) => m.id !== message.id),
        total: messages.value.total - 1,
      };
    }
    showToast({ type: "success", message: t('msg_deleted') });
  } catch (err: any) {
    showToast(
      err?.data?.error || err?.data?.message || err?.message || t('msg_delete_failed')
    );
  }
}

// ============================================================
// 加载更多留言
// ============================================================

const loadingMoreMessages = ref(false);

const hasMoreMessages = computed(
  () => !!messages.value && messages.value.items.length < messages.value.total
);

async function loadMoreMessages() {
  if (!pet.value || !messages.value) return;
  if (loadingMoreMessages.value) return;
  if (!hasMoreMessages.value) return;

  loadingMoreMessages.value = true;
  try {
    const more = await $api<MessagePage>(
      `/api/pets/${pet.value.slug}/messages?limit=${PAGE_SIZE}&offset=${messages.value.items.length}`
    );
    messages.value = {
      items: [...messages.value.items, ...more.items],
      total: more.total,
    };
  } catch (err: any) {
    showToast(err?.data?.error || t('common_load_failed'));
  } finally {
    loadingMoreMessages.value = false;
  }
}

// ============================================================
// 赠礼弹窗
// ============================================================

const giftModalVisible = ref(false);

function handleGift() {
  if (!me.value) {
    showDialog({ message: t('msg_please_login') });
    return;
  }
  giftModalVisible.value = true;
}

/**
 * 送礼成功后会扣减 users.point，但 GiftModal 的 success 只回传 giftSummary，
 * 不会带回剩余积分。这里重新拉一次 /api/auth/me 更新全局 me，
 * 让页面上任何依赖 me.point 的地方（导航栏、操作区积分条）立刻同步。
 * 取数方式与 auth-init.client.ts 保持一致（MeResponse.user）。
 */
async function refreshMe() {
  if (!me.value) return;
  try {
    const res = await $api<MeResponse>("/api/auth/me");
    if (res?.user) me.value = res.user;
  } catch {
    // 静默失败，不影响送礼主流程
  }
}

async function onGiftsSent(summary: PetGiftSummary[]) {
  giftSummary.value = summary;
  // 礼物明细、宠物（含新心情值）、当前用户积分三者互不依赖，并行刷新
  await Promise.all([
    refreshGiftRecords(),
    refreshPet(),
    refreshMe(),
  ]);
}

// ============================================================
// 礼物明细弹窗
// ============================================================

const giftRecordModalVisible = ref(false);
const currentGiftRecord = ref<GiftRecordPublic | null>(null);

function handleGiftClick(record: GiftRecordPublic) {
  currentGiftRecord.value = record;
  giftRecordModalVisible.value = true;
}

// ============================================================
// 宠物对话弹窗
// ============================================================

const chatModalVisible = ref(false);

function handleChat() {
  if (!me.value) {
    showDialog({ message: t('msg_please_login') });
    return;
  }

  if (!isOwner.value) {
    showDialog({ message: t('vip_feature_chat_owner_only') });
    return;
  }

  if (!me.value.isVip) {
    showDialog({
      title: t('vip_feature_title'),
      message: t('vip_feature_chat_desc'),
      confirmButtonText: t('btn_i_know'),
    });
    return;
  }

  chatModalVisible.value = true;
}

watch(chatModalVisible, (visible) => {
  if (!visible) {
    refreshPublicChat();
  }
});

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
// 兜底头像
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

const defaultOwnerAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
       <rect width="40" height="40" fill="#F5EEE4"/>
       <circle cx="20" cy="16" r="7" fill="#DCD0BF"/>
       <path d="M6 40c0-8 6-12 14-12s14 4 14 12z" fill="#DCD0BF"/>
     </svg>`
  );

// ============================================================
// 简介拼接 (支持双语)
// ============================================================

const genderText = computed(() => {
  if (!pet.value) return "";
  return pet.value.gender === 1 ? t('gender_boy') : pet.value.gender === 2 ? t('gender_girl') : "";
});

const introParts = computed(() => {
  if (!pet.value) return [];
  const p = pet.value;
  const parts: string[] = [];

  if (locale.value === 'en') {
    // 英文拼接逻辑
    if (p.species && p.breed) {
      parts.push(`${t('intro_is_a')} ${p.species}${t('intro_breed_is')} ${p.breed}`);
    } else if (p.species) {
      parts.push(`${t('intro_is_a')} ${p.species}`);
    } else if (p.breed) {
      parts.push(`breed ${p.breed}`);
    }
    
    if (genderText.value) parts.push(genderText.value);
    if (p.hometown) parts.push(`${t('from')} ${p.hometown}`);
    if (p.birthday) parts.push(`${t('intro_born_on')} ${p.birthday}`);
  } else {
    // 中文拼接逻辑
    if (p.species && p.breed) {
      parts.push(`${t('intro_is_a')} ${p.species}${t('intro_breed_is')}${p.breed}`);
    } else if (p.species) {
      parts.push(`${t('intro_is_a')} ${p.species}`);
    } else if (p.breed) {
      parts.push(`品种是${p.breed}`);
    }

    if (genderText.value) parts.push(genderText.value);
    if (p.hometown) parts.push(`${t('from')}${p.hometown}`);
    if (p.birthday) parts.push(`${p.birthday} ${t('intro_born_on')}`);
  }
  
  return parts;
});

// ============================================================
// 标题
// ============================================================

useHead(() => ({
  title: pet.value ? `${pet.value.name} · ${t('app_name')}` : `${t('nav_pets')} · ${t('app_name')}`,
}));
</script>

<template>
  <div class="page">
    <div class="container section pet-page">
      <!-- 加载中 -->
      <div v-if="pending" class="pet-hero pet-hero--skeleton">
        <div class="skeleton pet-hero__avatar-skeleton" />
        <div class="skeleton pet-hero__name-skeleton" />
        <div class="skeleton pet-hero__intro-skeleton" />
      </div>

      <!-- 加载失败 -->
      <div v-else-if="error || !pet" class="empty">
        <p class="empty__title">{{ t('pet_not_found') }}</p>
        <p class="empty__desc">{{ t('pet_not_found_desc') }}</p>
        <NuxtLink to="/" class="btn btn--primary mt-4">{{ t('btn_back_home') }}</NuxtLink>
      </div>

      <!-- 宠物主页 -->
      <template v-else>
        <!-- 头部：绑定动态样式和特效类名 -->
        <div 
          class="pet-hero" 
          :style="getEffectStyle(isVipPet)"
          :class="{ 'is-vip-panel': isVipPet }"
        >
          <!-- 头像包裹层：绑定特效类名 (保留原头像) -->
          <div class="pet-hero__avatar-wrap avatar-effect" :class="getEffectClass(isVipPet)">
            <img
              class="pet-hero__avatar"
              :src="pet.avatarUrl || defaultPetAvatar"
              :alt="pet.name"
            />
          </div>

          <!-- 内容包裹层（保证毛玻璃效果） -->
          <div class="pet-hero__content">
            <h1 class="pet-hero__name">
              {{ pet.name }}
              <span v-if="pet.status === 0" class="pet-hero__hidden-tag"> {{ t('pet_hidden') }} </span>
            </h1>

            <!-- 心情值展示 -->
            <div class="pet-mood">
              <div class="pet-mood__label">
                {{ moodStatusText }}
                <span class="pet-mood__score">{{ pet.moodScore }} / 300</span>
              </div>
              <div class="pet-mood__bar">
                <div class="pet-mood__fill" :style="{ width: `${(pet.moodScore / 300) * 100}%` }" />
              </div>
            </div>

            <p v-if="introParts.length" class="pet-hero__intro">
              {{ pet.name
              }}<span v-for="(part, i) in introParts" :key="i"
                >{{ i === 0 ? " " : (locale === 'en' ? ", " : "，") }}{{ part }}</span
              >{{ locale === 'en' ? '.' : '。' }}
            </p>
            <p v-else class="pet-hero__intro pet-hero__intro--empty">
              {{ t('pet_no_bio') }}
            </p>

            <!-- 主人信息区，包含 VIP 图标 -->
            <div class="pet-hero__owner">
              {{ t('pet_owner') }}{{ locale === 'en' ? ': ' : '：' }}
              <NuxtLink :to="`/users/${pet.owner.id}`" class="pet-hero__owner-link">
                {{ pet.owner.nickname }}
              </NuxtLink>
              <van-icon
                v-if="isVipPet"
                name="gem-o"
                class="pet-hero__owner-vip-icon"
                @click="vipModalVisible = true"
              />
            </div>
          </div>
        </div>

        <!-- ============================================ -->
        <!-- 相册区                                       -->
        <!-- ============================================ -->
        <section class="pet-album">
          <div class="section-title">
            <div class="section-title__left">
              <h2 class="section-title__main">{{ t('pet_album') }}</h2>
              <button
                v-if="isOwner && photos && photos.length"
                type="button"
                class="pet-album__edit-btn"
                :class="{ 'is-active': editMode }"
                :aria-label="editMode ? 'Exit Edit' : 'Edit Album'"
                @click="toggleEditMode"
              >
                <van-icon :name="editMode ? 'cross' : 'edit'" />
              </button>
            </div>

            <span v-if="photos && photos.length" class="pet-album__count">
              {{ photos.length }} / 20 {{ locale === 'en' ? 'photos' : '张' }}
            </span>
          </div>

          <div v-if="photos && photos.length" class="photo-grid">
            <div
              v-for="photo in photos"
              :key="photo.id"
              class="photo-item"
              :class="{ 'photo-item--editing': editMode }"
              @click="handlePhotoClick(photo)"
            >
              <img
                :src="photo.imageUrl"
                :alt="photo.caption || pet.name"
                loading="lazy"
              />
              <span v-if="photo.caption" class="photo-item__caption">
                {{ photo.caption }}
              </span>

              <button
                v-if="editMode"
                type="button"
                class="photo-item__remove"
                :aria-label="t('btn_delete')"
                @click.stop="handleDeletePhoto(photo)"
              >
                <van-icon name="close" />
              </button>
            </div>
          </div>

          <div v-else class="pet-album__empty">
            <p class="pet-album__empty-text">
              {{ isOwner ? t('pet_album_empty_owner') : t('pet_album_empty_guest') }}
            </p>
          </div>
        </section>

        <!-- ============================================ -->
        <!-- 礼物陈列区                                    -->
        <!-- ============================================ -->
        <section v-if="giftItems.length" class="pet-gifts">
          <div class="section-title">
            <div class="section-title__left">
              <h2 class="section-title__main">{{ t('pet_gifts') }}</h2>
            </div>
            <span class="pet-gifts__total"> {{ t('pet_gifts_total', { n: totalGiftCount }) }} </span>
          </div>

          <div class="gift-grid">
            <button
              v-for="item in giftItems"
              :key="item.id"
              type="button"
              class="gift-cell"
              :title="item.giftName"
              @click="handleGiftClick(item)"
            >
              <img :src="item.giftImageUrl" :alt="item.giftName" loading="lazy" />
            </button>
          </div>
        </section>

        <!-- ============================================ -->
        <!-- 对话展示区 (Conversation)                     -->
        <!-- ============================================ -->
        <section class="pet-public-chat">
          <div class="section-title">
            <div class="section-title__left">
              <h2 class="section-title__main">{{ t('pet_chat_title') }}</h2>
            </div>
            <!-- 本人可见的切换按钮 -->
            <button
              v-if="isOwner && publicChat?.hasConversation"
              type="button"
              class="btn btn--sm pet-public-chat__toggle"
              @click="toggleChatVisibility"
            >
              {{ isChatPublic ? t('chat_hide') : t('chat_show') }}
            </button>
          </div>

          <!-- 宠物表情图展示区 -->
          <div class="pet-expression" v-if="pet.currentExpressionUrl || pet.isGenerating">
            <div class="pet-expression__top">
              <div class="pet-expression__circle">
                <img v-if="pet.currentExpressionUrl" :src="pet.currentExpressionUrl" alt="Pet Expression" />
                <van-loading v-else type="spinner" color="#E8A87C" size="24" />
              </div>
              <div class="pet-expression__hint">
                {{ t('pet_expression_mood_hint', { name: pet.name }) }}
              </div>
            </div>
            
            <!-- 下方的心情显示条 -->
            <div class="pet-mood pet-expression__mood">
              <div class="pet-mood__label">
                {{ moodStatusText }}
                <span class="pet-mood__score">{{ pet.moodScore }} / 300</span>
              </div>
              <div class="pet-mood__bar">
                <div class="pet-mood__fill" :style="{ width: `${(pet.moodScore / 300) * 100}%` }" />
              </div>
            </div>
          </div>

          <!-- 1. 有真实对话（且对你可见） -->
          <div v-if="publicChat?.hasConversation && publicChat?.messages.length" class="pet-public-chat__list">
            <div
              v-for="msg in publicChat.messages"
              :key="msg.id"
              class="chat-msg"
              :class="`chat-msg--${msg.role}`"
            >
              <img
                v-if="msg.role === 'assistant'"
                class="chat-msg__avatar"
                :src="pet.avatarUrl || defaultPetAvatar"
                :alt="pet.name"
              />
              <div class="chat-msg__bubble">
                <p class="chat-msg__text">{{ msg.content }}</p>
                <time class="chat-msg__time">{{ formatTime(msg.createdAt) }}</time>
              </div>
            </div>
          </div>

          <!-- 2. 无对话（或对话被隐藏） -->
          <div v-else class="pet-public-chat__empty">
            <p class="pet-public-chat__empty-text">
              {{ t('pet_public_chat_empty', { petName: publicChat?.petName || '', ownerNickname: publicChat?.ownerNickname || '' }) }}
            </p>
          </div>
        </section>

        <!-- ============================================ -->
        <!-- 留言区                                       -->
        <!-- ============================================ -->
        <section class="pet-messages">
          <div class="section-title">
            <div class="section-title__left">
              <h2 class="section-title__main">{{ t('pet_messages') }}</h2>
            </div>
            <span v-if="messages && messages.total" class="pet-messages__count">
              {{ t('pet_messages_count', { n: messages.total }) }}
            </span>
          </div>

          <!-- 有留言 -->
          <div v-if="messages && messages.items.length" class="msg-list">
            <div v-for="msg in messages.items" :key="msg.id" class="msg-item">
              <NuxtLink
                v-if="msg.author.id"
                :to="`/users/${msg.author.id}`"
                class="msg-item__avatar-link"
                :aria-label="`Visit ${msg.author.nickname}'s profile`"
              >
                <img
                  class="msg-item__avatar"
                  :src="msg.author.avatarUrl || defaultOwnerAvatar"
                  :alt="msg.author.nickname"
                />
              </NuxtLink>
              <img
                v-else
                class="msg-item__avatar"
                :src="msg.author.avatarUrl || defaultOwnerAvatar"
                :alt="msg.author.nickname"
              />

              <div class="msg-item__main">
                <div class="msg-item__head">
                  <NuxtLink
                    v-if="msg.author.id"
                    :to="`/users/${msg.author.id}`"
                    class="msg-item__name msg-item__name--link"
                  >
                    {{ msg.author.nickname }}
                  </NuxtLink>
                  <span v-else class="msg-item__name">
                    {{ msg.author.nickname }}
                  </span>

                  <span v-if="msg.author.isOwner" class="msg-item__tag"> {{ t('pet_owner_tag') }} </span>
                  <span class="msg-item__time">
                    {{ formatTime(msg.createdAt) }}
                  </span>
                </div>
                <p class="msg-item__text">{{ msg.content }}</p>
              </div>

              <!-- 仅主人可见：删除 -->
              <button
                v-if="isOwner"
                type="button"
                class="msg-item__remove"
                :aria-label="t('btn_delete')"
                @click="handleDeleteMessage(msg)"
              >
                <van-icon name="cross" />
              </button>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMoreMessages" class="pet-messages__more">
              <button
                type="button"
                class="btn btn--sm"
                :disabled="loadingMoreMessages"
                @click="loadMoreMessages"
              >
                {{ loadingMoreMessages ? t('pets_loading') : t('pet_load_more_msg') }}
              </button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="pet-messages__empty">
            <p class="pet-messages__empty-text">
              {{ isLoggedIn ? t('pet_msg_empty_owner') : t('pet_msg_empty_guest') }}
            </p>
          </div>
        </section>

        <!-- ============================================ -->
        <!-- 操作区（分两行）                              -->
        <!-- ============================================ -->
        <div class="pet-actions">
          <!-- 当前积分（登录后展示，送礼后会随 refreshMe 更新） -->
          <div v-if="isLoggedIn && myPoint !== undefined" class="pet-actions__points">
            <van-icon name="gold-coin-o" />
            <span>{{ t('user_points', { n: myPoint }) }}</span>
          </div>

          <!-- 第一行：主人操作 -->
          <div class="pet-actions__row">
            <button v-if="isOwner" type="button" class="btn btn--lg" @click="handleEdit">
              {{ t('pet_edit_info') }}
            </button>
            <button
              v-if="isOwner"
              type="button"
              class="btn btn--primary btn--lg"
              @click="handleUploadPhoto"
            >
              {{ t('pet_upload_photo') }}
            </button>
            <button
              v-if="isOwner"
              type="button"
              class="btn btn--lg pet-actions__chat"
              @click="handleChat"
            >
              <van-icon name="chat-o" />
              <span>{{ t('pet_chat') }}</span>
            </button>
          </div>
          
          <!-- 第二行：留言/赠礼 -->
          <div class="pet-actions__row">
            <button type="button" class="btn btn--lg" @click="handleMessage">{{ t('pet_leave_msg') }}</button>
            <button type="button" class="btn btn--lg" @click="handleGift">{{ t('pet_send_gift') }}</button>
          </div>
        </div>
      </template>
    </div>

    <!-- ============================================ -->
    <!-- 表情生成弹窗 (图2)                             -->
    <!-- ============================================ -->
    <van-popup
      v-model:show="expressionModalVisible"
      round
      :style="{ width: 'min(300px, 85%)' }"
      teleport="body"
      :close-on-click-overlay="!!pet?.currentExpressionUrl"
    >
      <div class="expression-modal">
        <template v-if="!pet?.currentExpressionUrl">
          <h3 class="expression-modal__title">{{ t('pet_expression_generating') }}</h3>
          <p class="expression-modal__subtitle">{{ t('pet_expression_please_wait') }}</p>
          <div class="expression-modal__circle">
            <span>loading...</span>
          </div>
        </template>
        <template v-else>
          <h3 class="expression-modal__title">{{ t('pet_expression_done') }}</h3>
          <div class="expression-modal__circle expression-modal__circle--has-img">
            <img :src="pet.currentExpressionUrl" alt="expression" />
          </div>
          <button class="btn btn--primary expression-modal__close" @click="expressionModalVisible = false">
            {{ t('btn_close') }}
          </button>
        </template>
      </div>
    </van-popup>

    <!-- 编辑弹窗 -->
    <EditPetModal
      v-model="editPetModalVisible"
      :pet="editablePet"
      @success="onPetUpdated"
    />

    <!-- 相册上传弹窗 -->
    <UploadPhotoModal
      v-if="pet"
      v-model="uploadPhotoModalVisible"
      :slug="pet.slug"
      @success="onPhotosUploaded"
    />

    <!-- 留言弹窗 -->
    <MessageModal
      v-if="pet"
      v-model="messageModalVisible"
      :slug="pet.slug"
      :pet-name="pet.name"
      @success="onMessageCreated"
    />

    <!-- 赠礼弹窗 -->
    <GiftModal
      v-if="pet"
      v-model="giftModalVisible"
      :slug="pet.slug"
      :pet-name="pet.name"
      @success="onGiftsSent"
    />

    <!-- 宠物对话弹窗 -->
    <PetChatModal
      v-if="pet"
      v-model="chatModalVisible"
      :slug="pet.slug"
      :pet-name="pet.name"
      :pet-avatar-url="pet.avatarUrl"
    />

    <!-- 礼物明细弹窗 -->
    <van-popup
      v-model:show="giftRecordModalVisible"
      round
      :style="{ width: 'min(360px, 90%)' }"
      teleport="body"
    >
      <div v-if="currentGiftRecord" class="gift-record">
        <div class="gift-record__icon">
          <img :src="currentGiftRecord.giftImageUrl" :alt="currentGiftRecord.giftName" />
        </div>
        <p class="gift-record__label">
          {{ t('gift_record_label') }}<strong>{{ currentGiftRecord.giftName }}</strong>
        </p>

        <div class="gift-record__divider" />

        <p class="gift-record__from">{{ t('gift_record_from') }}</p>

        <NuxtLink
          v-if="currentGiftRecord.sender.id"
          :to="`/users/${currentGiftRecord.sender.id}`"
          class="gift-record__sender"
          @click="giftRecordModalVisible = false"
        >
          <img
            class="gift-record__avatar"
            :src="currentGiftRecord.sender.avatarUrl || defaultOwnerAvatar"
            :alt="currentGiftRecord.sender.nickname"
          />
          <span class="gift-record__name">
            {{ currentGiftRecord.sender.nickname }}
          </span>
        </NuxtLink>

        <div v-else class="gift-record__sender gift-record__sender--anon">
          <img class="gift-record__avatar" :src="defaultOwnerAvatar" alt="anon" />
          <span class="gift-record__name">
            {{ currentGiftRecord.sender.nickname || t('gift_record_anon') }}
          </span>
        </div>

        <p class="gift-record__time">
          {{ formatFullTime(currentGiftRecord.createdAt) }}
        </p>

        <button
          type="button"
          class="btn btn--primary gift-record__close"
          @click="giftRecordModalVisible = false"
        >
          {{ t('btn_close') }}
        </button>
      </div>
    </van-popup>

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

.pet-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding-left: @sp-2;
  padding-right: @sp-2;

  @media (max-width: @bp-sm) {
    padding-left: @sp-3;
    padding-right: @sp-3;
  }
}

// ============================================================
// 宠物主页头部 (保留原头像)
// ============================================================
.pet-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: @sp-7 @sp-4 @sp-6;
  border-radius: @radius-xl;
  transition: background 0.3s ease;

  @media (max-width: @bp-sm) {
    padding: @sp-5 @sp-4;
  }

  // ---------- VIP 特殊面板背景 ----------
  &.is-vip-panel {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    min-height: 447px; 
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: @shadow-2;
    margin-bottom: @sp-5;

    @media (max-width: @bp-sm) {
      min-height: 380px;
      border-radius: @radius-lg;
    }

    .pet-hero__content {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: @sp-4 @sp-5;
      border-radius: @radius-lg;
      margin-top: @sp-3;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: @shadow-1;
      width: 90%;
      max-width: 500px;
    }
  }

  &__avatar-wrap {
    position: relative;
    display: inline-block;
    z-index: 1;
    border-radius: 50%;
    transition: all 0.3s ease;

    // 传入全局 avatar-effect 所需的变量 (详情页为 140px)
    --ring-inset: -10px;
    --ring-mask: 64%;

    // 局部覆盖：详情页头像较大，调整节日的“装饰品”尺寸
    &.effect-valentine::before::after {
      text-shadow: 
        0 -75px 0 #e74c3c,
        0 75px 0 #e74c3c,
        -75px 0 0 #e74c3c,
        75px 0 0 #e74c3c;
    }
    &.effect-christmas::before::after {
      background-image: 
        radial-gradient(circle at 50% 0%, #e74c3c 6px, transparent 7px),
        radial-gradient(circle at 50% 100%, #e74c3c 6px, transparent 7px),
        radial-gradient(circle at 0% 50%, #e74c3c 6px, transparent 7px),
        radial-gradient(circle at 100% 50%, #e74c3c 6px, transparent 7px),
        radial-gradient(circle at 85% 15%, #e74c3c 5px, transparent 6px),
        radial-gradient(circle at 15% 85%, #e74c3c 5px, transparent 6px);
    }
    &.effect-thanksgiving::before::after {
      background-image: 
        radial-gradient(circle at 20% 20%, #d35400 6px, transparent 7px),
        radial-gradient(circle at 80% 80%, #d35400 6px, transparent 7px),
        radial-gradient(circle at 80% 20%, #e67e22 5px, transparent 6px),
        radial-gradient(circle at 20% 80%, #e67e22 5px, transparent 6px);
    }
    &.effect-mid-autumn::before::after {
      background-image: 
        radial-gradient(circle at 50% 0%, #fff 5px, transparent 6px),
        radial-gradient(circle at 50% 100%, #fff 5px, transparent 6px),
        radial-gradient(circle at 0% 50%, #fff 5px, transparent 6px),
        radial-gradient(circle at 100% 50%, #fff 5px, transparent 6px);
    }
  }

  &__avatar {
    position: relative;
    z-index: 2;
    display: block;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    box-shadow: 0 0 0 4px @surface;

    @media (max-width: @bp-sm) {
      width: 120px;
      height: 120px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: all 0.3s ease;
  }

  &__name {
    display: inline-flex;
    align-items: center;
    gap: @sp-2;
    margin: @sp-4 0 0;
    font-family: @font-serif;
    font-size: @fs-2xl;
    font-weight: 700;
    color: @ink-1;
    line-height: 1.2;
  }

  &__intro {
    margin: @sp-3 0 0;
    max-width: 560px;
    font-size: @fs-base;
    color: @ink-2;
    line-height: @lh-base;

    &--empty {
      color: @ink-3;
      font-style: italic;
    }
  }

  &__owner {
    display: inline-flex;
    align-items: center;
    margin-top: @sp-4;
    font-size: @fs-sm;
    color: @ink-2;
  }

  &__owner-link {
    color: @ink-2;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color @dur-fast ease;
    
    &:hover {
      color: @accent;
    }
  }

  &__owner-vip-icon {
    font-size: 16px;
    color: #f1c40f;
    margin-left: 6px;
    cursor: pointer;
    filter: drop-shadow(0 1px 2px rgba(241, 196, 15, 0.4));
    transition: transform @dur-fast ease;

    &:hover {
      transform: scale(1.1) rotate(5deg);
    }
    
    &:active {
      transform: scale(0.95);
    }
  }

  &__hidden-tag {
    padding: 2px 8px;
    font-family: @font-sans;
    font-size: @fs-xs;
    font-weight: 500;
    color: @ink-2;
    background: @surface-2;
    border: 1px solid @border;
    border-radius: @radius-pill;
  }

  &--skeleton { gap: @sp-4; }
  &__avatar-skeleton { width: 140px; height: 140px; border-radius: 50%; }
  &__name-skeleton { width: 160px; height: 32px; border-radius: @radius-sm; }
  &__intro-skeleton { width: 260px; height: 20px; border-radius: @radius-sm; }
}

// ============================================================
// 心情值 UI
// ============================================================
.pet-mood {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-1;
  margin-top: @sp-3;
  width: 100%;
  max-width: 200px;

  &__label {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: @fs-xs;
    color: @ink-2;
    font-weight: 500;
  }

  &__score {
    font-family: @font-mono;
    color: @accent;
  }

  &__bar {
    width: 100%;
    height: 6px;
    background: @surface-2;
    border-radius: @radius-pill;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, #a8e6cf 0%, #ffd3b6 50%, #ff8b94 100%);
    border-radius: @radius-pill;
    transition: width 0.5s ease-out;
  }
}

// ============================================================
// 相册区
// ============================================================
.pet-album {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  .section-title__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  &__count {
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }

  &__edit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid @border;
    border-radius: @radius-sm;
    background: @surface;
    color: @ink-3;
    font-size: 15px;
    cursor: pointer;
    transition: all @dur-fast ease;

    &:hover {
      color: @accent;
      border-color: @accent;
      background: @accent-soft;
    }

    &.is-active {
      color: @surface;
      background: @accent;
      border-color: @accent;
    }
  }

  &__empty {
    padding: @sp-7 @sp-4;
    text-align: center;
    background: @surface-2;
    border-radius: @radius-lg;
    border: 1px dashed @border;
  }

  &__empty-text {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
  }
}

// ============================================================
// 照片项
// ============================================================
.photo-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: @surface-2;
  border-radius: @radius;
  cursor: pointer;
  box-shadow: @shadow-1;
  transition: box-shadow @dur-base ease, transform @dur-base ease,
    outline-color @dur-fast ease;
  outline: 2px solid transparent;
  outline-offset: -2px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform @dur-base @ease-out;
  }

  &:hover {
    box-shadow: @shadow-2;
    transform: translateY(-2px);

    img {
      transform: scale(1.04);
    }
  }

  &--editing {
    cursor: default;

    &:hover {
      transform: none;

      img {
        transform: none;
      }
    }
  }

  &__caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: @sp-4 @sp-2 @sp-2;
    font-size: @fs-xs;
    color: #fff;
    background: linear-gradient(to top, rgba(61, 51, 44, 0.65), transparent);
    .line-1();
  }

  &__remove {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    background: rgba(61, 51, 44, 0.7);
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: background @dur-fast ease, transform @dur-fast ease;

    &:hover {
      background: @danger;
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.94);
    }
  }
}

// ============================================================
// 礼物陈列区
// ============================================================
.pet-gifts {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  .section-title__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  &__total {
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }
}

// 礼物阵列：一行放不下就换行，每个礼物一个圆形图标
.gift-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: @sp-3;

  @media (max-width: @bp-sm) {
    gap: @sp-2;
  }
}

.gift-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 6px;
  background: @surface-2;
  border: 1px solid @border;
  border-radius: 50%;
  cursor: pointer;
  transition: transform @dur-fast ease, box-shadow @dur-fast ease,
    border-color @dur-fast ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &:hover {
    border-color: @accent;
    box-shadow: @shadow-1;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0) scale(0.96);
  }

  @media (max-width: @bp-sm) {
    width: 48px;
    height: 48px;
    padding: 5px;
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

  &__from {
    margin: 0 0 @sp-3;
    font-size: @fs-xs;
    color: @ink-3;
    letter-spacing: 0.1em;
  }

  &__sender {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: @sp-2;
    padding: @sp-2;
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

// ============================================================
// 留言区
// ============================================================
.pet-messages {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  .section-title__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  &__count {
    font-size: @fs-sm;
    color: @ink-3;
    font-family: @font-mono;
  }

  &__empty {
    padding: @sp-7 @sp-4;
    text-align: center;
    background: @surface-2;
    border-radius: @radius-lg;
    border: 1px dashed @border;
  }

  &__empty-text {
    margin: 0;
    font-size: @fs-sm;
    color: @ink-3;
  }

  &__more {
    display: flex;
    justify-content: center;
    margin-top: @sp-3;
  }
}

// 复用 common.less 里的 .msg-list / .msg-item，补几条
.msg-item {
  position: relative;
  padding-right: @sp-7;

  &__avatar-link {
    display: inline-block;
    flex-shrink: 0;
    border-radius: 50%;
    transition: transform @dur-fast ease, box-shadow @dur-fast ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0 0 3px @accent-soft;
    }

    &:active {
      transform: scale(.97);
    }
  }

  &__name--link {
    color: @ink-1;
    text-decoration: none;
    transition: color @dur-fast ease;

    &:hover {
      color: @accent;
    }
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    height: 16px;
    font-size: 10px;
    font-weight: 500;
    color: @accent;
    background: @accent-soft;
    border-radius: @radius-pill;
  }

  &__remove {
    position: absolute;
    top: 4px;
    right: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 50%;
    background: transparent;
    color: @ink-3;
    font-size: 13px;
    cursor: pointer;
    transition: all @dur-fast ease;

    &:hover {
      color: @danger;
      background: fade(@danger, 8%);
      border-color: fade(@danger, 30%);
    }

    &:active {
      transform: scale(0.94);
    }
  }
}

// ============================================================
// 对话展示区
// ============================================================
.pet-public-chat {
  margin-top: @sp-5;
  padding-top: @sp-5;
  border-top: 1px solid @border;

  .section-title__left {
    display: flex;
    align-items: center;
    gap: @sp-2;
  }

  &__toggle {
    font-size: @fs-xs;
    padding: 4px 10px;
    color: @ink-2;
    
    &:hover {
      color: @accent;
      border-color: @accent;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: @sp-3;
    margin-top: @sp-3;
  }

  &__empty {
    margin-top: @sp-4;
    padding: @sp-6 @sp-4;
    text-align: center;
    background: @surface-2;
    border-radius: @radius-lg;
    border: 1px dashed @border;
  }

  &__empty-text {
    margin: 0;
    font-size: @fs-base;
    color: @ink-3;
    font-style: italic;
    letter-spacing: 0.05em;
  }
}

// ============================================================
// 独立表情图展示区 (移动到 Conversation 内部)
// ============================================================
.pet-expression {
  display: flex;
  flex-direction: column; 
  align-items: flex-start; /* 改为左对齐，让下方的横条与头像对齐 */
  gap: @sp-4; /* 头像区域和下方进度条的间距 */
  margin-top: @sp-4;
  margin-bottom: @sp-2;
  padding-left: @sp-1; 

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between; 
    gap: @sp-3;
    width: 100%;
  }

  &__circle {
    width: 120px; /* 增大头像尺寸 */
    height: 120px; /* 增大头像尺寸 */
    border-radius: 50%;
    background: @surface-2;
    border: 2px dashed @border-strong;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: @shadow-1;
    transition: all 0.3s ease;
    flex-shrink: 0; 

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #fff;
      display: block;
    }

    &:hover {
      border-color: @accent;
      transform: scale(1.02);
    }
  }

  &__hint {
    font-size: @fs-xs;
    color: @ink-3;
    line-height: 1.5;
    text-align: right; 
    max-width: 200px; 
  }

  // 针对表情区的心情条做宽度限制
  &__mood {
    width: 160px; /* 固定宽度，比 120px 的头像长一点 */
    max-width: 100%; /* 防止在极窄屏幕上溢出 */
    margin-top: 0; 
    padding: @sp-2 @sp-3;
    background: @surface;
    border: 1px solid @border;
    border-radius: @radius;
    box-shadow: @shadow-1;
  }
}

.chat-msg {
  display: flex;
  align-items: flex-end;
  gap: @sp-2;
  max-width: 100%;

  &--assistant {
    flex-direction: row;
    justify-content: flex-start;
    .chat-msg__bubble {
      background: @blue-soft;
      color: @ink-1;
      border-radius: @radius-lg @radius-lg @radius-lg @radius-sm;
    }
  }

  &--user {
    flex-direction: row-reverse;
    justify-content: flex-start;
    .chat-msg__bubble {
      background: @accent-soft;
      color: @ink-1;
      border-radius: @radius-lg @radius-lg @radius-sm @radius-lg;
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    border: 1px solid @border;
  }

  &__bubble {
    position: relative;
    max-width: 78%;
    padding: 8px 12px 4px;
    box-shadow: @shadow-1;
    word-break: break-word;
  }

  &__text {
    margin: 0;
    font-size: @fs-sm;
    line-height: @lh-base;
    white-space: pre-wrap;
  }

  &__time {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    color: @ink-3;
    text-align: right;
    font-family: @font-mono;
    user-select: none;
  }
}

// ============================================================
// 操作区：分两行，贴底
// ============================================================
.pet-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: @sp-4;
  margin-top: auto;
  padding-top: @sp-6;
  padding-bottom: @sp-2;
  border-top: 1px solid @border;

  // 当前积分显示（登录后可见）
  &__points {
    display: inline-flex;
    align-items: center;
    gap: @sp-1;
    font-size: @fs-sm;
    color: @ink-2;
    font-family: @font-mono;

    :deep(.van-icon) {
      color: #f1c40f;
      font-size: 16px;
      filter: drop-shadow(0 1px 2px rgba(241, 196, 15, 0.35));
    }
  }

  &__row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: @sp-3;
    width: 100%;
  }

  &__chat {
    gap: @sp-1;

    :deep(.van-icon) {
      font-size: 16px;
    }
  }

  @media (max-width: @bp-sm) {
    gap: @sp-3;
    padding-left: @sp-3;
    padding-right: @sp-3;

    &__row {
      gap: @sp-2;
    }

    .btn {
      padding-left: @sp-4;
      padding-right: @sp-4;
      flex: 1;
      min-width: 120px;
    }
  }
}

// ============================================================
// 表情生成弹窗 (图2)
// ============================================================
.expression-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: @sp-6 @sp-5;
  text-align: center;

  &__title {
    margin: 0 0 @sp-2;
    font-family: @font-serif;
    font-size: @fs-lg;
    font-weight: 700;
    color: @ink-1;
  }

  &__subtitle {
    margin: 0 0 @sp-5;
    font-size: @fs-sm;
    color: @ink-2;
  }

  &__circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 3px solid @ink-1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: @sp-5;
    overflow: hidden;
    background: @surface;

    span {
      font-family: @font-sans;
      font-size: @fs-base;
      font-weight: 500;
      color: @ink-2;
    }

    &--has-img {
      border: none;
      box-shadow: 0 0 0 3px @accent-soft;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  &__close {
    width: 100%;
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