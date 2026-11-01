// server/api/__sitemap__/urls.ts
import { defineSitemapEventHandler } from '#sitemap/server'

export default defineSitemapEventHandler(async () => {
  const apiBase = 'https://api.petmemory.me'

  // 通用的全量拉取函数
  async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
    let allItems: T[] = []
    let offset = 0
    const limit = 100 // 每次拉取 100 条
    let hasMore = true

    while (hasMore) {
      try {
        const res = await $fetch<{ items: T[]; total: number }>(`${apiBase}${endpoint}?limit=${limit}&offset=${offset}`)
        
        if (res && res.items) {
          allItems = allItems.concat(res.items)
          offset += limit
          // 如果已经拿到的数量 >= 总数，说明拿完了
          if (allItems.length >= res.total || res.items.length === 0) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      } catch (e) {
        console.error(`获取 ${endpoint} 失败`, e)
        hasMore = false
      }
    }
    return allItems
  }

  // 并行获取所有宠物和文章
  const [pets, articles] = await Promise.all([
    // 注意：请确保你的后端接口返回结构确实是 { items: [], total: 0 }
    // 如果是纯数组，请根据实际情况调整上方 fetchAllPages 的泛型解析
    fetchAllPages<{ slug: string; updatedAt?: string; createdAt?: string }>('/api/pets'),
    fetchAllPages<{ slug: string; updatedAt?: string; createdAt?: string }>('/api/articles')
  ])

  // 映射为 sitemap 格式
  const petUrls = pets.map(pet => ({
    loc: `/pets/${pet.slug}`,
    lastmod: pet.updatedAt || pet.createdAt,
  }))

  const articleUrls = articles.map(article => ({
    loc: `/articles/${article.slug}`,
    lastmod: article.updatedAt || article.createdAt,
  }))

  return [...petUrls, ...articleUrls]
})