<!-- app/components/PetCard.vue -->
<script setup lang="ts">
import { useEffectBackgrounds } from '~/composables/usePetEffect'
import { getPetUrl } from '~/utils/petUrl'

// 兼容首页和列表页的 Pet 类型，取交集
interface Props {
  pet: {
    id: number
    slug: string
    name: string
    species: string
    breed: string
    birthday?: string | null
    leaveDate?: string | null
    avatarUrl: string
    owner?: {
      isVip?: boolean
      isLifetimeVip?: boolean
      vipExpiresAt?: string | null
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

// ============================================================
// 生日 / 忌日 卡片内特效
// ============================================================
type FestivalParticle = {
  id: number
  emoji: string
  left: number     // %
  top: number      // %
  size: number     // px
  delay: number    // s
  duration: number // s
}

const festivalType = ref<'birthday' | 'memorial' | null>(null)
const festivalParticles = ref<FestivalParticle[]>([])

function buildFestivalParticles(emoji: string, count: number): FestivalParticle[] {
  const list: FestivalParticle[] = []
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      emoji,
      left: 6 + Math.random() * 84,       // 6% ~ 90%
      top: 6 + Math.random() * 80,        // 6% ~ 86%
      size: 20 + Math.random() * 16,      // 20 ~ 36px
      delay: Math.random() * 3,           // 0 ~ 3s
      duration: 2.5 + Math.random() * 2,  // 2.5 ~ 4.5s
    })
  }
  return list
}

function matchMonthDay(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const parts = dateStr.split('-')
  if (parts.length < 3) return false
  const now = new Date()
  return Number(parts[1]) === now.getMonth() + 1 && Number(parts[2]) === now.getDate()
}

function initFestivalEffect() {
  if (import.meta.server) return
  // 👇 只有终身 VIP 才触发生日特效
  if (!props.pet.owner?.isLifetimeVip) {
    festivalType.value = null
    festivalParticles.value = []
    return
  }

  // 生日优先
  if (matchMonthDay(props.pet.birthday)) {
    festivalType.value = 'birthday'
    festivalParticles.value = buildFestivalParticles('🎂', 5)
    return
  }
  if (matchMonthDay(props.pet.leaveDate)) {
    festivalType.value = 'memorial'
    festivalParticles.value = buildFestivalParticles('🌸', 6)
    return
  }

  festivalType.value = null
  festivalParticles.value = []
}

onMounted(() => {
  initFestivalEffect()
})

watch(
  () => [props.pet.birthday, props.pet.leaveDate, props.pet.owner?.isLifetimeVip] as const,
  () => initFestivalEffect()
)
</script>

<template>
  <NuxtLink
    :to="getPetUrl(pet)"
    class="pet-card"
    :class="{ 'is-vip-panel': pet.owner?.isLifetimeVip }"
    :style="getEffectStyle(pet.owner?.isLifetimeVip)"
  >
    <!-- 👇 生日 / 忌日 特效层 -->
    <div
      v-if="festivalType && festivalParticles.length"
      class="pet-card__festival"
      aria-hidden="true"
    >
      <span
        v-for="p in festivalParticles"
        :key="p.id"
        class="pet-card__festival-particle"
        :style="{
          left: p.left + '%',
          top: p.top + '%',
          fontSize: p.size + 'px',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
        }"
      >{{ p.emoji }}</span>
    </div>

    <!-- 头像带特效边框 -->
    <div class="pet-card__avatar-wrap avatar-effect" :class="getEffectClass(pet.owner?.isLifetimeVip)">
      <img
        class="pet-card__avatar"
        :src="pet.avatarUrl || defaultPetAvatar"
        :alt="pet.name"
        loading="lazy"
      />
    </div>
    
    <!-- 文字内容区 -->
    <div class="pet-card__content">
      <div class="pet-card__name">
        {{ pet.name }}
        
        <!-- 👇 名字旁的微型 VIP 标识 -->
        <span v-if="pet.owner?.isVip" class="pet-card__vip-badge">
          <span
            v-if="pet.owner.isLifetimeVip"
            title="终身 VIP"
          >💎</span>
          <span
            v-if="pet.owner.vipExpiresAt && new Date(pet.owner.vipExpiresAt) > new Date()"
            title="订阅 VIP"
          >🌈</span>
        </span>
      </div>
      <div v-if="petBrief(pet)" class="pet-card__brief">
        {{ petBrief(pet) }}
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped lang="less">
@import "~/assets/css/common.less";

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

  // ---------- 生日 / 忌日 特效层 ----------
  &__festival {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__festival-particle {
    position: absolute;
    line-height: 1;
    user-select: none;
    opacity: 0;
    will-change: transform, opacity;
    animation-name: pet-card-festival-pop;
    animation-timing-function: ease-out;
    animation-iteration-count: infinite;
    filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.1));
  }

  // 头像外层包裹
  &__avatar-wrap {
    position: relative;
    display: inline-block;
    border-radius: 50%;
    z-index: 1;
    transition: all 0.3s ease;
    
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: @fs-md;
    font-weight: 600;
    color: @ink-1;
    transition: color @dur-fast ease;
    .line-1();
  }

  &__vip-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 14px;
  }

  &__brief {
    margin-top: 4px;
    font-size: @fs-sm;
    color: @ink-3;
    .line-1();
  }
}

@keyframes pet-card-festival-pop {
  0% {
    transform: scale(0.3) rotate(-8deg);
    opacity: 0;
  }
  20% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
  60% {
    transform: scale(1.3) rotate(8deg);
    opacity: 1;
  }
  100% {
    transform: scale(1.8) rotate(0deg);
    opacity: 0;
  }
}
</style>