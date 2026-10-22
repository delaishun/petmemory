<!-- app/components/PetCard.vue -->
<script setup lang="ts">
import { useEffectBackgrounds } from '~/composables/usePetEffect'

// 兼容首页和列表页的 Pet 类型，取交集
interface Props {
  pet: {
    id: number
    slug: string
    name: string
    species: string
    breed: string
    avatarUrl: string
    owner?: {
      isVip?: boolean
    }
  }
}

const props = defineProps<Props>()
const { getEffectClass, getEffectStyle } = useEffectBackgrounds()

// 兜底头像
const defaultPetAvatar =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
       <rect width="120" height="120" fill="#F5EEE4"/>
       <circle cx="60" cy="52" r="22" fill="#DCD0BF"/>
       <path d="M20 110c0-22 18-36 40-36s40 14 40 36z" fill="#DCD0BF"/>
     </svg>`
  )

// 拼简介：物种 · 品种
function petBrief(p: any): string {
  const parts: string[] = []
  if (p.species && p.breed) parts.push(`${p.species} · ${p.breed}`)
  else if (p.species) parts.push(p.species)
  else if (p.breed) parts.push(p.breed)
  return parts.join('')
}
</script>

<template>
  <NuxtLink
    :to="`/pets/${pet.slug}`"
    class="pet-card"
    :class="{ 'is-vip-panel': pet.owner?.isVip }"
    :style="getEffectStyle(pet.owner?.isVip)"
  >
    <!-- 头像带特效边框 (引入全局 avatar-effect) -->
    <div class="pet-card__avatar-wrap avatar-effect" :class="getEffectClass(pet.owner?.isVip)">
      <img
        class="pet-card__avatar"
        :src="pet.avatarUrl || defaultPetAvatar"
        :alt="pet.name"
        loading="lazy"
      />
    </div>
    
    <!-- 文字内容区 -->
    <div class="pet-card__content">
      <div class="pet-card__name">{{ pet.name }}</div>
      <div v-if="petBrief(pet)" class="pet-card__brief">
        {{ petBrief(pet) }}
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

// ============================================================
// 宠物卡片样式（融合了首页和列表页的需求）
// ============================================================
.pet-card {
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
  text-decoration: none;
  color: inherit;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: border-color @dur-fast ease, box-shadow @dur-base ease,
    transform @dur-base ease;

  &:hover {
    border-color: @border-strong;
    box-shadow: @shadow-2;
    transform: translateY(-2px);

    .pet-card__name {
      color: @accent;
    }
  }

  // ---------- VIP 特效背景 ----------
  &.is-vip-panel {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: none;
  }

  // 头像外层包裹
  &__avatar-wrap {
    position: relative;
    display: inline-block;
    border-radius: 50%;
    z-index: 1;
    transition: all 0.3s ease;
    
    // 传入全局 avatar-effect 所需的变量
    // 卡片头像尺寸为 80px，所以偏移量为 -8px，遮罩比例约为 62%
    --ring-inset: -8px;
    --ring-mask: 62%;

    .pet-card__avatar {
      position: relative;
      z-index: 2;
      box-shadow: 0 0 0 4px @surface;
    }
  }

  &__avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    background: @surface-2;
    border: none;
    flex-shrink: 0;
  }

  // 文字内容包裹区
  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
    transition: all 0.3s ease;
  }

  // VIP 毛玻璃背景
  &.is-vip-panel &__content {
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: @sp-2 @sp-4;
    border-radius: @radius-lg;
    box-shadow: @shadow-1;
    width: 90%;
  }

  &__name {
    font-size: @fs-md;
    font-weight: 600;
    color: @ink-1;
    transition: color @dur-fast ease;
    .line-1();
  }

  &__brief {
    margin-top: 4px;
    font-size: @fs-sm;
    color: @ink-3;
    .line-1();
  }
}
</style>