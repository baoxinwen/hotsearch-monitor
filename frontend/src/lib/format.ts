/** 数字与时间格式化 */

/** 热度值：1.2亿 / 340.5万 / 8,901 */
export function formatScore(score: number): string {
  if (score >= 1e8) return `${(score / 1e8).toFixed(1)}亿`
  if (score >= 1e4) return `${(score / 1e4).toFixed(1)}万`
  return score.toLocaleString()
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 把 'YYYY-MM-DD HH:mm:ss' 解析为本地时间（后端无时区标记，按本地处理） */
export function parseLocalDateTime(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

/** 距离参考时间的相对描述：刚刚 / 3 分钟前 / 2 小时前 / 5 天前 */
export function relativeTime(datetimeStr: string, now = Date.now()): string {
  const d = parseLocalDateTime(datetimeStr)
  if (!d) return datetimeStr
  const diff = Math.max(0, now - d.getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day} 天前`
  return datetimeStr.slice(0, 10)
}

/** 秒数倒计时 → m:ss / h:mm:ss */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`
  return `${m}:${pad(sec)}`
}

/** 秒 → 5 分钟 / 1.5 小时 */
export function formatInterval(sec: number): string {
  if (sec >= 3600) {
    const h = sec / 3600
    return `${Number.isInteger(h) ? h : h.toFixed(1)} 小时`
  }
  return `${Math.round(sec / 60)} 分钟`
}
