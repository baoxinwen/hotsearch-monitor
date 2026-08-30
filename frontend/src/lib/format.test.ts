import { describe, expect, it } from 'vitest'
import { formatCountdown, formatInterval, formatScore, parseLocalDateTime, relativeTime } from './format'

describe('formatScore', () => {
  it('亿级', () => {
    expect(formatScore(120_407_000)).toBe('1.2亿')
    expect(formatScore(1e8)).toBe('1.0亿')
  })
  it('万级', () => {
    expect(formatScore(994_000)).toBe('99.4万')
    expect(formatScore(10_000)).toBe('1.0万')
  })
  it('小数字加千分位', () => {
    expect(formatScore(8901)).toBe('8,901')
    expect(formatScore(0)).toBe('0')
  })
})

describe('parseLocalDateTime / relativeTime', () => {
  it('解析后端时间格式', () => {
    const d = parseLocalDateTime('2026-08-30 12:34:56')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getHours()).toBe(12)
  })
  it('非法输入原样返回', () => {
    expect(relativeTime('bad')).toBe('bad')
  })
  it('相对时间', () => {
    const now = new Date(2026, 7, 30, 12, 0, 0).getTime()
    expect(relativeTime('2026-08-30 11:59:30', now)).toBe('刚刚')
    expect(relativeTime('2026-08-30 11:30:00', now)).toBe('30 分钟前')
    expect(relativeTime('2026-08-30 09:00:00', now)).toBe('3 小时前')
    expect(relativeTime('2026-08-28 12:00:00', now)).toBe('2 天前')
  })
})

describe('formatCountdown / formatInterval', () => {
  it('倒计时格式', () => {
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(3725)).toBe('1:02:05')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-5)).toBe('0:00')
  })
  it('间隔格式', () => {
    expect(formatInterval(300)).toBe('5 分钟')
    expect(formatInterval(3600)).toBe('1 小时')
    expect(formatInterval(5400)).toBe('1.5 小时')
  })
})
