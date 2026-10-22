// app/composables/useI18n.ts
import en from '~/locales/en'
import cn from '~/locales/cn'

export const useI18n = () => {
  const route = useRoute()
  const router = useRouter()
  
  // 使用 useState 保证 SSR 和 CSR 数据一致
  const locale = useState<'en' | 'cn'>('app_locale', () => 'en')

  // 初始化逻辑 (优先 URL 参数，其次 localStorage，最后默认 en)
  const initLocale = () => {
    const queryLang = route.query.lang as string
    
    if (queryLang === 'en' || queryLang === 'cn') {
      locale.value = queryLang
    } else if (import.meta.client) {
      const storedLang = localStorage.getItem('lang') as 'en' | 'cn'
      if (storedLang === 'en' || storedLang === 'cn') {
        locale.value = storedLang
      } else {
        locale.value = 'en' // 默认英语
      }
    }
  }

  // 监听语言变化，持久化并更新 html lang 属性
  watch(locale, (val) => {
    if (import.meta.client) {
      localStorage.setItem('lang', val)
      document.documentElement.lang = val === 'cn' ? 'zh-CN' : 'en'
    }
  })

  // 切换语言方法
  const setLocale = (lang: 'en' | 'cn') => {
    locale.value = lang
    // 如果当前 URL 有 lang 参数，平滑替换，保持 URL 一致性
    if (route.query.lang) {
      router.replace({ query: { ...route.query, lang } })
    }
  }

  // 翻译函数，支持简单的 {xx} 占位符替换
  const t = (key: keyof typeof en, params?: Record<string, any>) => {
    const dict = locale.value === 'cn' ? cn : en
    let text = dict[key] || key
    
    if (params) {
      Object.keys(params).forEach((k) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(params[k]))
      })
    }
    return text
  }

  return { locale, setLocale, t, initLocale }
}