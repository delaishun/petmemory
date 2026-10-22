// app/utils/image-process.ts

// ============================================================
// 常量
// ============================================================

// ---- 头像 ----
/** 头像输出边长（正方形），默认 200px */
const AVATAR_SIDE = 200
/** 头像 WebP 输出质量（比普通图片略高，头像清晰度重要） */
const AVATAR_QUALITY = 0.9

// ---- 相册照片 ----
/** 相册照片输出最长边的目标像素 */
const PHOTO_MAX_SIDE = 2048
/** 相册照片 WebP 输出质量 */
const PHOTO_QUALITY = 0.85
/** 相册照片长宽比范围（宽/高）：1:3 ~ 3:1 */
const PHOTO_RATIO_MIN = 1 / 3
const PHOTO_RATIO_MAX = 3

// ---- 共用 ----
/** 原图尺寸硬上限（超过直接拒绝，避免浏览器 OOM） */
const HARD_LIMIT = 8000
/** 原始文件大小上限（20MB） */
const MAX_FILE_SIZE = 20 * 1024 * 1024

/** 输出格式 */
const OUTPUT_MIME = 'image/webp'
const OUTPUT_EXT = 'webp'

// ============================================================
// 类型
// ============================================================

export type ImageProcessErrorCode =
  | 'UNSUPPORTED'    // 不是图片 / 不支持的格式
  | 'FILE_TOO_LARGE' // 原始文件过大
  | 'TOO_LARGE'      // 图片像素尺寸过大
  | 'RATIO'          // 长宽比不合法
  | 'DECODE_FAILED'  // 浏览器无法解码
  | 'HEIC_FAILED'    // HEIC 转换失败
  | 'CANVAS'         // Canvas 相关失败
  | 'UNKNOWN'

export class ImageProcessError extends Error {
  code: ImageProcessErrorCode
  constructor(code: ImageProcessErrorCode, message: string) {
    super(message)
    this.name = 'ImageProcessError'
    this.code = code
  }
}

export interface ProcessedAvatar {
  blob: Blob
  width: number
  height: number
  mimeType: string
  ext: string
  originalWidth: number
  originalHeight: number
  originalSize: number
  originalName: string
}

export interface ProcessedPhoto {
  blob: Blob
  width: number
  height: number
  mimeType: string
  ext: string
  originalWidth: number
  originalHeight: number
  originalSize: number
  originalName: string
}

export interface ProcessAvatarOptions {
  side?: number
  quality?: number
}

export interface ProcessPhotoOptions {
  /** 输出最长边上限，默认 2048 */
  maxSide?: number
  /** 输出质量 0~1，默认 0.85 */
  quality?: number
}

// ============================================================
// 工具函数
// ============================================================

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function formatRatio(w: number, h: number): string {
  const g = gcd(w, h) || 1
  return `${w / g}:${h / g}`
}

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.heic') || name.endsWith('.heif')) return true
  const type = (file.type || '').toLowerCase()
  return type === 'image/heic' || type === 'image/heif'
}

/** Canvas -> Blob 的 Promise 包装 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new ImageProcessError('CANVAS', '图片处理失败')),
      type,
      quality,
    )
  })
}

async function decodeBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageProcessError(
      'DECODE_FAILED',
      '图片解码失败，可能文件损坏或格式不受支持',
    )
  }
}

// ============================================================
// HEIC / HEIF 转换
// ============================================================

async function loadHeic2any(): Promise<any> {
  if (import.meta.server) {
    throw new ImageProcessError('HEIC_FAILED', 'HEIC 转换仅支持浏览器环境')
  }
  const mod: any = await import('heic2any')
  return mod?.default || mod
}

async function convertHeic(file: File): Promise<Blob> {
  try {
    const heic2any = await loadHeic2any()
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    })
    const blob = Array.isArray(result) ? result[0] : result
    if (!(blob instanceof Blob)) {
      throw new Error('HEIC 转换返回了非 Blob')
    }
    return blob
  } catch (err: any) {
    throw new ImageProcessError(
      'HEIC_FAILED',
      `HEIC/HEIF 转换失败：${err?.message || err}`,
    )
  }
}

// ============================================================
// 通用前置处理：类型/大小/HEIC
// ============================================================

async function prepareWorkBlob(file: File): Promise<Blob> {
  const type = (file.type || '').toLowerCase()
  const isImageMime = type.startsWith('image/')
  if (!isImageMime && !isHeicFile(file)) {
    throw new ImageProcessError('UNSUPPORTED', '仅支持图片文件')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ImageProcessError(
      'FILE_TOO_LARGE',
      `文件大小不能超过 ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)}MB`,
    )
  }

  if (isHeicFile(file)) {
    return await convertHeic(file)
  }
  return file
}

// ============================================================
// 主函数 1：处理宠物头像（200×200 正方形）
// ============================================================

export async function processAvatar(
  file: File,
  options: ProcessAvatarOptions = {},
): Promise<ProcessedAvatar> {
  const side = options.side ?? AVATAR_SIDE
  const quality = options.quality ?? AVATAR_QUALITY

  const workBlob = await prepareWorkBlob(file)
  const bitmap = await decodeBitmap(workBlob)

  try {
    const ow = bitmap.width
    const oh = bitmap.height

    if (ow > HARD_LIMIT || oh > HARD_LIMIT) {
      throw new ImageProcessError(
        'TOO_LARGE',
        `图片像素尺寸不能超过 ${HARD_LIMIT}×${HARD_LIMIT}`,
      )
    }

    // 中心裁剪：取 min(宽, 高) 为正方形边长
    const cropSide = Math.min(ow, oh)
    const sx = Math.floor((ow - cropSide) / 2)
    const sy = Math.floor((oh - cropSide) / 2)

    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new ImageProcessError('CANVAS', '无法创建 Canvas 上下文')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      bitmap,
      sx, sy, cropSide, cropSide,
      0, 0, side, side,
    )

    const blob = await canvasToBlob(canvas, OUTPUT_MIME, quality)

    return {
      blob,
      width: side,
      height: side,
      mimeType: OUTPUT_MIME,
      ext: OUTPUT_EXT,
      originalWidth: ow,
      originalHeight: oh,
      originalSize: file.size,
      originalName: file.name,
    }
  } finally {
    bitmap.close()
  }
}

// ============================================================
// 主函数 2：处理相册照片（等比缩放，最长边 ≤ 2048）
// ============================================================

/**
 * 处理相册照片：
 *
 *   1. 类型 / 大小校验
 *   2. HEIC / HEIF → JPEG
 *   3. createImageBitmap 解码，自动应用 EXIF 方向
 *   4. 像素尺寸硬上限校验（8000×8000）
 *   5. 长宽比校验（1:3 ~ 3:1）
 *   6. 等比缩放到最长边 ≤ 2048
 *   7. 导出 WebP（质量 0.85）
 *
 * 与 processAvatar 的区别：
 * - 不做裁剪，保留原图长宽比
 * - 缩放到最长边，输出尺寸由原图决定
 * - 输出质量略低（0.85），体积更小
 *
 * @param file    用户通过 <input type="file"> 选择的原始文件
 * @param options 可选覆盖 maxSide / quality
 * @throws        ImageProcessError
 */
export async function processPhoto(
  file: File,
  options: ProcessPhotoOptions = {},
): Promise<ProcessedPhoto> {
  const maxSide = options.maxSide ?? PHOTO_MAX_SIDE
  const quality = options.quality ?? PHOTO_QUALITY

  const workBlob = await prepareWorkBlob(file)
  const bitmap = await decodeBitmap(workBlob)

  try {
    const ow = bitmap.width
    const oh = bitmap.height

    // 像素尺寸硬上限
    if (ow > HARD_LIMIT || oh > HARD_LIMIT) {
      throw new ImageProcessError(
        'TOO_LARGE',
        `图片像素尺寸不能超过 ${HARD_LIMIT}×${HARD_LIMIT}`,
      )
    }

    // 长宽比校验
    const ratio = ow / oh
    if (ratio < PHOTO_RATIO_MIN || ratio > PHOTO_RATIO_MAX) {
      throw new ImageProcessError(
        'RATIO',
        `图片长宽比需在 1:3 ~ 3:1 之间，当前为 ${formatRatio(ow, oh)}`,
      )
    }

    // 等比缩放
    let tw = ow
    let th = oh
    const longest = Math.max(ow, oh)
    if (longest > maxSide) {
      const scale = maxSide / longest
      tw = Math.max(1, Math.round(ow * scale))
      th = Math.max(1, Math.round(oh * scale))
    }

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new ImageProcessError('CANVAS', '无法创建 Canvas 上下文')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, tw, th)

    const blob = await canvasToBlob(canvas, OUTPUT_MIME, quality)

    return {
      blob,
      width: tw,
      height: th,
      mimeType: OUTPUT_MIME,
      ext: OUTPUT_EXT,
      originalWidth: ow,
      originalHeight: oh,
      originalSize: file.size,
      originalName: file.name,
    }
  } finally {
    bitmap.close()
  }
}