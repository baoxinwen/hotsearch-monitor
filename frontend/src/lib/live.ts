import type { HotSearchItem, PlatformConfigMap } from '../types'

/** 平台筛选：空数组 = 全部 */
export function filterByPlatforms<T extends { platform: string }>(
  data: Record<string, T[]>,
  filter: string[],
): Record<string, T[]> {
  if (filter.length === 0) return data
  const out: Record<string, T[]> = {}
  for (const p of filter) {
    if (data[p]?.length) out[p] = data[p]
  }
  return out
}

/** 合并为聚合流：按热度降序，0 分条目按排名排在末尾 */
export function mergeFeed(data: Record<string, HotSearchItem[]>): HotSearchItem[] {
  const all = Object.values(data).flat()
  const scored = all.filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  const unscored = all
    .filter((x) => !(x.score > 0))
    .sort((a, b) => a.rank - b.rank)
  return [...scored, ...unscored]
}

/** 搜索过滤：多关键词（逗号/空格分隔），任一命中即保留 */
export function matchKeywords(title: string, q: string): boolean {
  const kws = splitKeywords(q)
  if (kws.length === 0) return true
  const t = title.toLowerCase()
  return kws.some((k) => t.includes(k.toLowerCase()))
}

export function splitKeywords(q: string): string[] {
  return q.split(/[,，\s]+/).filter(Boolean)
}

/** 标题转高亮分段（命中片段用 mark 展示） */
export function highlightParts(title: string, q: string): { text: string; hit: boolean }[] {
  const kws = splitKeywords(q)
  if (kws.length === 0) return [{ text: title, hit: false }]
  const escaped = kws.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return title
    .split(re)
    .filter((p) => p !== '')
    .map((text) => ({ text, hit: kws.some((k) => text.toLowerCase() === k.toLowerCase()) }))
}

/** 迷你热度条宽度：log10(1+score)/log10(1+max)，返回百分比字符串 */
export function heatBarWidth(score: number, max: number): string {
  if (score <= 0 || max <= 0) return '0%'
  const pct = (Math.log10(1 + score) / Math.log10(1 + max)) * 100
  return `${Math.min(100, Math.max(4, Math.round(pct)))}%`
}

/** 平台显示名 */
export function platformName(p: string, configs?: PlatformConfigMap): string {
  return configs?.[p]?.name ?? p
}

/** 外链消毒：只放行 http/https（外部平台的 url 字段不可信） */
export function safeExternalUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : ''
  } catch {
    return ''
  }
}
