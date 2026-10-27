// app/utils/upload.ts

// ============================================================
// 类型
// ============================================================

/** 允许上传的 OSS 目录（要和后端 plugins/oss.ts 的 ALLOWED_DIRS 保持一致） */
export type OssDir = 'petm_pavatar' | 'pet_photos' | 'pet_uavatars' | 'pet_orders'

/** 后端 /oss/token/:fdir 返回的签名结构 */
export interface OssToken {
  accessid: string
  host: string
  policy: string
  signature: string
  expire: number
  dir: string
}

export interface OssUploadResult {
  /** OSS 上的 object key，形如 pet_avatar/1/abc.webp */
  objectKey: string
  /** 可直接用于 <img src> 的完整 URL */
  url: string
}

export interface OssUploadOptions {
  /** 上传目录，默认 pet_avatar */
  fdir?: OssDir
  /**
   * 上传进度回调（0-100）
   * 注意：只有当浏览器支持 XHR 的 upload.onprogress 时才会被调用
   */
  onProgress?: (percent: number) => void
  /** 外部 AbortSignal，用于取消上传 */
  signal?: AbortSignal
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成一个不容易冲突的文件名
 * 例：a1b2c3d4-xxxx.webp
 */
export function buildFilename(ext = 'webp'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${uuid}.${ext.replace(/^\./, '')}`
}

/**
 * 把 Blob 包装成 File。
 * - 有些浏览器/库对 Blob 上传兼容性略差，File 更稳
 * - 上传到 OSS 后，在 OSS 后台看到的 content-type 也更准
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type || 'application/octet-stream',
    lastModified: Date.now(),
  })
}

/** 从后端拿 OSS 直传签名 */
async function fetchOssToken(fdir: OssDir): Promise<OssToken> {
  const { $api } = useNuxtApp()
  return await $api<OssToken>(`/api/oss/token/${fdir}`)
}

/**
 * 用 XMLHttpRequest 上传，因为 $fetch 不支持上传进度
 */
function uploadWithXhr(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)

    // 阿里 OSS 直传不建议带 cookie / authorization
    // 这些头会污染请求，导致签名校验失败
    xhr.withCredentials = false

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        // OSS 失败时会返回 XML 错误体，尽量从中提取 <Message>
        let detail = ''
        try {
          const match = xhr.responseText?.match(/<Message>([^<]*)<\/Message>/)
          if (match) detail = match[1] ?? ''
        } catch {
          // ignore
        }
        reject(
          new Error(
            `OSS 上传失败：${xhr.status} ${xhr.statusText || ''}${
              detail ? ` - ${detail}` : ''
            }`.trim(),
          ),
        )
      }
    }

    xhr.onerror = () => reject(new Error('OSS 上传网络错误'))
    xhr.ontimeout = () => reject(new Error('OSS 上传超时'))
    xhr.onabort = () => reject(new Error('上传已取消'))

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        return
      }
      signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(formData)
  })
}

// ============================================================
// 主函数
// ============================================================

/**
 * 上传 Blob 到阿里 OSS（直传，不经过后端服务器）
 *
 * 典型用法（配合 image-process.ts）：
 *
 * ```ts
 * const processed = await processAvatar(file)   // 200×200 webp
 * const filename = buildFilename(processed.ext)
 * const { objectKey, url } = await uploadToOss(processed.blob, filename, {
 *   fdir: 'pet_avatar',
 *   onProgress: (p) => console.log(`${p}%`),
 * })
 * // 然后把 objectKey 发给后端写库
 * ```
 *
 * @param blob      已经过 Canvas 处理后的 Blob（webp/jpeg/png）
 * @param filename  文件名（不含目录），如 buildFilename('webp') 生成
 * @param options   可选配置
 * @returns         { objectKey, url }，objectKey 需要再发给后端写库
 */
export async function uploadToOss(
  blob: Blob,
  filename: string,
  options: OssUploadOptions = {},
): Promise<OssUploadResult> {
  const { fdir = 'petm_pavatar', onProgress, signal } = options

  // 1. 拿签名
  const token = await fetchOssToken(fdir)

  // 2. 组装表单（字段顺序按阿里 OSS 要求，file 必须放最后）
  const objectKey = `${token.dir}${filename}`
  const file = blobToFile(blob, filename)

  const formData = new FormData()
  formData.append('key', objectKey)
  formData.append('policy', token.policy)
  formData.append('OSSAccessKeyId', token.accessid)
  formData.append('signature', token.signature)
  formData.append('success_action_status', '200')
  formData.append('file', file)

  // 3. 直传 OSS
  await uploadWithXhr(token.host, formData, onProgress, signal)

  // 4. 拼接完整 URL 返回
  //    host 末尾可能带 /，objectKey 开头也可能带 /，统一规范化
  const base = token.host.replace(/\/$/, '')
  const path = objectKey.replace(/^\//, '')
  const url = `${base}/${path}`

  return { objectKey, url }
}