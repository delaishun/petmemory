// 前端项目根目录 /server/api/__sitemap__/urls.ts
import { defineSitemapEventHandler } from '#sitemap/server'

export default defineSitemapEventHandler(async () => {
  const apiBase = 'https://api.petmemory.me'

  // 通用的全量拉取函数
  async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
    let allItems: T[] = []
    let offset = 0
    const limit = 50 // 👈 修复：后端限制最大50，不能填100
    let hasMore = true

    while (hasMore) {
      try {
        const res = await $fetch<{ items: T[]; total: number }>(
          `${apiBase}${endpoint}?limit=${limit}&offset=${offset}`
        )
        
        if (res && res.items && res.items.length > 0) {
          allItems = allItems.concat(res.items)
          offset += limit
          
          // 如果已经拿到的数量 >= 总数，或者这一页拿到的数量少于 limit（说明已经是最后一页）
          if (allItems.length >= res.total || res.items.length < limit) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      } catch (e) {
        console.error(`[Sitemap] 获取 ${endpoint} 失败`, e)
        hasMore = false // 出错就停止拉取，防止死循环
      }
    }
    return allItems
  }

  // 并行获取所有宠物和文章
  // 注意：假设后端返回的数据结构是 { items: [...], total: 0 }
  const [pets, articles] = await Promise.all([
    fetchAllPages<{ slug: string; updatedAt?: string; createdAt?: string }>('/api/pets'),
    fetchAllPages<{ slug: string; updatedAt?: string; createdAt?: string }>('/api/articles')
  ])

  // 映射为 sitemap 格式
  const petUrls = pets.map(pet => ({
    loc: `/pets/${pet.slug}`,
    lastmod: pet.updatedAt || pet.createdAt || new Date().toISOString(),
  }))

  const articleUrls = articles.map(article => ({
    loc: `/articles/${article.slug}`,
    lastmod: article.updatedAt || article.createdAt || new Date().toISOString(),
  }))

  return [...petUrls, ...articleUrls]
})