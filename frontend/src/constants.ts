import type { PlatformInfo } from './types'

/** 平台分类 */
export const PLATFORM_CATEGORIES: Record<string, string[]> = {
  '视频/社区': ['bilibili', 'acfun', 'weibo', 'zhihu', 'zhihu-daily', 'douyin', 'kuaishou', 'douban-movie', 'douban-group', 'tieba', 'hupu', 'miyoushe', 'ngabbs', 'v2ex', '52pojie', 'hostloc', 'coolapk'],
  '新闻/资讯': ['baidu', 'thepaper', 'toutiao', 'qq-news', 'sina', 'sina-news', 'netease-news', 'huxiu', 'ifanr'],
  '技术/IT': ['sspai', 'ithome', 'ithome-xijiayi', 'juejin', 'jianshu', 'guokr', '36kr', '51cto', 'csdn', 'nodeseek', 'hellogithub'],
  '游戏': ['lol', 'genshin', 'honkai', 'starrail'],
  '音乐': ['netease-music', 'qq-music'],
  '其他': ['weread', 'weatheralarm', 'earthquake', 'history'],
}

/** 平台显示配置 */
export const PLATFORM_CONFIG: Record<string, PlatformInfo> = {
  bilibili: { name: '哔哩哔哩', category: '视频/社区', color: '#f472b6', icon: '📺', url: '' },
  acfun: { name: 'AcFun', category: '视频/社区', color: '#ef4444', icon: '🅰️', url: '' },
  weibo: { name: '微博', category: '视频/社区', color: '#ef4444', icon: '🔥', url: '' },
  zhihu: { name: '知乎', category: '视频/社区', color: '#3b82f6', icon: '🧠', url: '' },
  'zhihu-daily': { name: '知乎日报', category: '视频/社区', color: '#60a5fa', icon: '📅', url: '' },
  douyin: { name: '抖音', category: '视频/社区', color: '#1a1a1a', icon: '🎵', url: '' },
  kuaishou: { name: '快手', category: '视频/社区', color: '#f97316', icon: '📹', url: '' },
  'douban-movie': { name: '豆瓣电影', category: '视频/社区', color: '#16a34a', icon: '🎬', url: '' },
  'douban-group': { name: '豆瓣小组', category: '视频/社区', color: '#22c55e', icon: '👥', url: '' },
  tieba: { name: '贴吧', category: '视频/社区', color: '#2563eb', icon: '💬', url: '' },
  hupu: { name: '虎扑', category: '视频/社区', color: '#b91c1c', icon: '🏀', url: '' },
  miyoushe: { name: '米游社', category: '视频/社区', color: '#8b5cf6', icon: '🎮', url: '' },
  ngabbs: { name: 'NGA', category: '视频/社区', color: '#b45309', icon: '⚔️', url: '' },
  v2ex: { name: 'V2EX', category: '视频/社区', color: '#374151', icon: '💻', url: '' },
  '52pojie': { name: '吾爱破解', category: '视频/社区', color: '#9333ea', icon: '🔓', url: '' },
  hostloc: { name: 'Hostloc', category: '视频/社区', color: '#4f46e5', icon: '🌐', url: '' },
  coolapk: { name: '酷安', category: '视频/社区', color: '#22c55e', icon: '📱', url: '' },
  baidu: { name: '百度', category: '新闻/资讯', color: '#2563eb', icon: '🐾', url: '' },
  thepaper: { name: '澎湃', category: '新闻/资讯', color: '#0891b2', icon: '🗞️', url: '' },
  toutiao: { name: '头条', category: '新闻/资讯', color: '#dc2626', icon: '📰', url: '' },
  'qq-news': { name: '腾讯新闻', category: '新闻/资讯', color: '#1d4ed8', icon: '🐧', url: '' },
  sina: { name: '新浪热搜', category: '新闻/资讯', color: '#eab308', icon: '👁️', url: '' },
  'sina-news': { name: '新浪新闻', category: '新闻/资讯', color: '#ca8a04', icon: '📰', url: '' },
  'netease-news': { name: '网易新闻', category: '新闻/资讯', color: '#ef4444', icon: '📧', url: '' },
  huxiu: { name: '虎嗅', category: '新闻/资讯', color: '#1f2937', icon: '🐯', url: '' },
  ifanr: { name: '爱范儿', category: '新闻/资讯', color: '#f87171', icon: '❤️', url: '' },
  sspai: { name: '少数派', category: '技术/IT', color: '#ef4444', icon: '🥧', url: '' },
  ithome: { name: 'IT之家', category: '技术/IT', color: '#b91c1c', icon: '🏠', url: '' },
  'ithome-xijiayi': { name: 'IT之家喜加一', category: '技术/IT', color: '#dc2626', icon: '🎁', url: '' },
  juejin: { name: '掘金', category: '技术/IT', color: '#3b82f6', icon: '💎', url: '' },
  jianshu: { name: '简书', category: '技术/IT', color: '#f87171', icon: '📝', url: '' },
  guokr: { name: '果壳', category: '技术/IT', color: '#16a34a', icon: '🐚', url: '' },
  '36kr': { name: '36氪', category: '技术/IT', color: '#60a5fa', icon: '💼', url: '' },
  '51cto': { name: '51CTO', category: '技术/IT', color: '#1e3a8a', icon: '👨‍💻', url: '' },
  csdn: { name: 'CSDN', category: '技术/IT', color: '#ea580c', icon: '©️', url: '' },
  nodeseek: { name: 'NodeSeek', category: '技术/IT', color: '#4b5563', icon: '🔍', url: '' },
  hellogithub: { name: 'HelloGitHub', category: '技术/IT', color: '#1f2937', icon: '🐙', url: '' },
  lol: { name: '英雄联盟', category: '游戏', color: '#ca8a04', icon: '🎮', url: '' },
  genshin: { name: '原神', category: '游戏', color: '#a855f7', icon: '✨', url: '' },
  honkai: { name: '崩坏3', category: '游戏', color: '#60a5fa', icon: '🚀', url: '' },
  starrail: { name: '星穹铁道', category: '游戏', color: '#6366f1', icon: '🚂', url: '' },
  'netease-music': { name: '网易云音乐', category: '音乐', color: '#dc2626', icon: '🎵', url: '' },
  'qq-music': { name: 'QQ音乐', category: '音乐', color: '#16a34a', icon: '🎶', url: '' },
  weread: { name: '微信读书', category: '其他', color: '#60a5fa', icon: '📚', url: '' },
  weatheralarm: { name: '天气预警', category: '其他', color: '#f97316', icon: '⛈️', url: '' },
  earthquake: { name: '地震速报', category: '其他', color: '#1f2937', icon: '🌋', url: '' },
  history: { name: '历史上的今天', category: '其他', color: '#d97706', icon: '📜', url: '' },
}

/** 格式化热度分数 */
export function formatScore(score: number): string {
  if (score >= 100_000_000) return `${(score / 100_000_000).toFixed(1)}亿`
  if (score >= 10_000) return `${(score / 10_000).toFixed(1)}万`
  return score.toLocaleString()
}
