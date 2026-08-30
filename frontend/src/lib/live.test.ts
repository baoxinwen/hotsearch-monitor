import { describe, expect, it } from 'vitest'
import type { HotSearchItem } from '../types'
import { filterByPlatforms, heatBarWidth, highlightParts, matchKeywords, mergeFeed, splitKeywords } from './live'

const item = (platform: string, title: string, score = 0, rank = 1): HotSearchItem => ({
  id: `${platform}_${rank}`,
  rank,
  title,
  score,
  platform,
  url: 'https://example.com',
  timestamp: 0,
})

describe('filterByPlatforms', () => {
  const data = { weibo: [item('weibo', 'a')], zhihu: [item('zhihu', 'b')] }
  it('空筛选返回全部', () => {
    expect(Object.keys(filterByPlatforms(data, []))).toHaveLength(2)
  })
  it('按平台过滤', () => {
    expect(Object.keys(filterByPlatforms(data, ['weibo']))).toEqual(['weibo'])
  })
  it('过滤掉无数据的平台', () => {
    expect(Object.keys(filterByPlatforms(data, ['weibo', 'douyin']))).toEqual(['weibo'])
  })
})

describe('mergeFeed', () => {
  it('按热度降序合并，无分条目按排名垫底', () => {
    const merged = mergeFeed({
      a: [item('a', 'low', 100, 1), item('a', 'unscored', 0, 3)],
      b: [item('b', 'high', 500, 2), item('b', 'mid', 300, 1)],
    })
    expect(merged.map((x) => x.title)).toEqual(['high', 'mid', 'low', 'unscored'])
  })
})

describe('matchKeywords / splitKeywords', () => {
  it('中英文与全角逗号分隔', () => {
    expect(splitKeywords('华为 OpenAI，房价')).toEqual(['华为', 'OpenAI', '房价'])
  })
  it('任一关键词命中', () => {
    expect(matchKeywords('华为发布新机', '华为 小米')).toBe(true)
    expect(matchKeywords('苹果发布会', '华为 小米')).toBe(false)
  })
  it('大小写不敏感', () => {
    expect(matchKeywords('openai 发布 GPT-5', 'OpenAI')).toBe(true)
  })
  it('空搜索匹配全部', () => {
    expect(matchKeywords('任意', '')).toBe(true)
  })
})

describe('highlightParts', () => {
  it('命中片段单独分段', () => {
    const parts = highlightParts('华为Mate XT 三折叠曝光', '华为 曝光')
    expect(parts.filter((p) => p.hit).map((p) => p.text).sort()).toEqual(['华为', '曝光'])
  })
  it('无关键词返回原句', () => {
    expect(highlightParts('标题', '')).toEqual([{ text: '标题', hit: false }])
  })
  it('正则特殊字符不抛错', () => {
    expect(() => highlightParts('C++ primer (2nd)', 'c++ (2')).not.toThrow()
  })
})

describe('heatBarWidth', () => {
  it('对数刻度：高分满、低分明显更短', () => {
    const wTop = parseInt(heatBarWidth(8_200_000_000, 8_200_000_000))
    const wLow = parseInt(heatBarWidth(23_037_000, 8_200_000_000))
    expect(wTop).toBe(100)
    expect(wLow).toBeGreaterThan(50)
    expect(wLow).toBeLessThan(85)
  })
  it('零分无条', () => {
    expect(heatBarWidth(0, 10)).toBe('0%')
  })
})
