<!-- components/OssImg.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch, useAttrs } from 'vue'

/**
 * OSS 图片组件
 * - 自动为 OSS 链接追加 image_process 参数（resize / format / quality）
 * - 根据 width 自动生成 1x/2x/3x srcset，Retina 屏自动加载高清图
 * - 加载效果：骨架屏波浪 + 图片从模糊到清晰的 1 秒过渡
 * - 非 OSS 链接（如本地图片、外链）优雅降级，不加任何参数
 */

const props = withDefaults(defineProps<{
  /** 图片 URL（一般由父组件拼接完整 OSS 域名后传入） */
  src: string
  /** OSS 处理宽度（px）。传了才会加 resize 和生成 srcset */
  width?: number
  /** OSS 处理高度（px）。和 width 同时传时，配合 fit 生效 */
  height?: number
  /** OSS 缩放模式，默认 lfit（长边缩放，等比） */
  fit?: 'lfit' | 'mfit' | 'fill' | 'pad' | 'fixed'
  /** 输出质量 1-100，默认 85 */
  quality?: number
  /** 输出格式，默认 webp */
  format?: 'webp' | 'jpg' | 'png'
  /** alt 文本 */
  alt?: string
  /** 懒加载，默认 true */
  lazy?: boolean
  /** 宽高比（例如 '3/4' 或 0.75），用于防止布局抖动 */
  aspectRatio?: string | number
  /** 加载失败时的备用 URL */
  fallback?: string
}>(), {
  fit: 'lfit',
  quality: 85,
  format: 'webp',
  lazy: true,
})

const emit = defineEmits<{
  (e: 'load', ev: Event): void
  (e: 'error', ev: Event): void
}>()

const attrs = useAttrs()
const imgRef = ref<HTMLImageElement | null>(null)
const isLoaded = ref(false)
const isError = ref(false)

// 合并外部 style + aspectRatio
const mergedStyle = computed(() => {
  const result: Record<string, any> = { ...((attrs as any).style || {}) }
  if (props.aspectRatio) {
    result.aspectRatio = String(props.aspectRatio)
  }
  return result
})

/**
 * 给 OSS URL 追加 image_process 参数
 * @param baseUrl 原始 URL
 * @param dpr     设备像素比（用于生成 1x / 2x / 3x）
 */
function buildUrl(baseUrl: string, dpr: number): string {
  if (!baseUrl) return ''
  // 只对阿里云 OSS 链接追加参数；其它链接（本地图、外链）原样返回
  if (!baseUrl.includes('aliyuncs.com')) return baseUrl

  const ops: string[] = []

  // 1. 格式转换
  if (props.format) {
    ops.push(`format,${props.format}`)
  }

  // 2. 质量
  if (props.quality) {
    ops.push(`quality,q_${props.quality}`)
  }

  // 3. 尺寸
  if (props.width || props.height) {
    const w = props.width ? `w_${Math.round(props.width * dpr)}` : ''
    const h = props.height ? `h_${Math.round(props.height * dpr)}` : ''
    const dims = [w, h].filter(Boolean).join(',')

    // 只有 w、h 同时传时才带 m_ 模式；否则只按一边等比缩放
    if (props.width && props.height) {
      ops.push(`resize,m_${props.fit},${dims}`)
    } else {
      ops.push(`resize,${dims}`)
    }
  }

  if (ops.length === 0) return baseUrl
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}image_process=${ops.join('/')}`
}

// 主 src（1x）
const displaySrc = computed(() => {
  if (isError.value && props.fallback) return props.fallback
  return buildUrl(props.src, 1)
})

// srcset（只有 width 才生成）
const displaySrcset = computed(() => {
  if (isError.value) return undefined
  if (!props.width || !props.src) return undefined
  if (!props.src.includes('aliyuncs.com')) return undefined

  // 1x / 2x / 3x 三档
  return [1, 2, 3]
    .map((dpr) => `${buildUrl(props.src, dpr)} ${dpr}x`)
    .join(', ')
})

// 加载完成
function handleLoad(ev: Event) {
  isLoaded.value = true
  emit('load', ev)
}

// 加载失败
function handleError(ev: Event) {
  isLoaded.value = true
  isError.value = true
  emit('error', ev)
}

// src 变化时重置状态（重新播淡入动画）
watch(
  () => props.src,
  () => {
    isLoaded.value = false
    isError.value = false
  },
)

// SSR hydrate 前如果图片已经加载完（@load 事件丢失），主动补发一次
onMounted(() => {
  const el = imgRef.value
  if (el && el.complete && el.naturalWidth > 0 && !isLoaded.value) {
    isLoaded.value = true
    emit('load', new Event('load'))
  }
})

// 暴露原生 img 元素，方便父组件偶尔需要（比如 getBoundingClientRect）
defineExpose({ imgRef })
</script>

<template>
  <img
    ref="imgRef"
    :src="displaySrc"
    :srcset="displaySrcset"
    :alt="alt ?? ''"
    :loading="lazy ? 'lazy' : 'eager'"
    decoding="async"
    class="oss-img"
    :class="{ 'is-loaded': isLoaded, 'is-error': isError }"
    :style="mergedStyle"
    @load="handleLoad"
    @error="handleError"
  >
</template>

<style scoped>
.oss-img {
  display: block;
  width: 100%;
  height: 100%;

  /* ============ 加载中状态 ============ */

  /* 图片本身模糊：一出现就是模糊的，配合过渡慢慢变清晰 */
  filter: blur(20px);

  /* 骨架屏：作为 img 的背景显示，波浪流动 */
  background-color: #f1f5f9;
  background-image: linear-gradient(
    90deg,
    #f1f5f9 0%,
    #e2e8f0 50%,
    #f1f5f9 100%
  );
  background-size: 200% 100%;
  animation: oss-shimmer 1.4s linear infinite;

  /* ============ 过渡 ============ */
  /* filter 1s：图片从模糊到清晰 */
  /* background-color 0.6s：骨架屏在过渡过程中淡出 */
  transition:
    filter 1s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    background-color 0.6s ease-out;
}

/* ============ 加载完成 ============ */
.oss-img.is-loaded {
  /* 图片清晰 */
  filter: blur(0);
  /* 骨架屏消失（background 简写会重置所有 background-* 属性） */
  background: transparent;
  /* 停止波浪动画 */
  animation: none;
}

/* ============ 加载失败 ============ */
.oss-img.is-error {
  filter: none;
  background: #f1f5f9;
  animation: none;
}

@keyframes oss-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 尊重用户系统的「减少动效」偏好 */
@media (prefers-reduced-motion: reduce) {
  .oss-img {
    animation: none;
    filter: none;
    transition: none;
  }
}
</style>