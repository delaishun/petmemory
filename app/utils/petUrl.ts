// app/utils/petUrl.ts
import { pinyin } from 'pinyin-pro';

/**
 * 根据宠物信息生成友好的 URL 路径（带拼音前缀）
 * 例如：{ name: '二白', slug: 'ifExgPue' } -> '/pets/erbai_ifExgPue'
 */
export function getPetUrl(pet: { name?: string; slug?: string } | null | undefined): string {
  if (!pet || !pet.slug) return '/pets';
  
  const name = pet.name || 'pet';
  // 将中文转为无声调拼音
  const pinyinName = pinyin(name, { toneType: 'none', type: 'array' }).join('');
  
  // 过滤掉所有非字母和非数字的字符（去掉空格、下划线等），并转小写
  const cleanName = pinyinName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'pet';
  
  return `/pets/${cleanName}_${pet.slug}`;
}

/**
 * 从 URL 参数中解析出真正的 slug
 * 例如：'erbai_ifExgPue' -> 'ifExgPue'，'ifExgPue' -> 'ifExgPue'
 */
export function parseSlugFromParam(param: string | undefined | null): string {
  if (!param) return '';
  const raw = String(param);
  const underscoreIndex = raw.indexOf('_');
  // 如果存在下划线，截取第一个下划线之后的部分；否则原样返回（兼容旧链接）
  return underscoreIndex !== -1 ? raw.substring(underscoreIndex + 1) : raw;
}