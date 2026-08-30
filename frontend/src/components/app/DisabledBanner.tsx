import { useMemo } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useEnablePlatform, useHotsearch, usePlatforms } from '../../lib/queries'

/** 平台自动禁用警示横幅：展示失败原因，支持一键重新启用 */
export function DisabledBanner() {
  const { data } = useHotsearch()
  const { data: platforms } = usePlatforms()
  const enable = useEnablePlatform()
  const [dismissed, setDismissed] = useState(false)

  const disabled = useMemo(() => data?.disabled_platforms ?? [], [data])
  if (disabled.length === 0 || dismissed) return null

  return (
    <div
      role="status"
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-2.5 text-[13px] text-body"
      style={{
        background: 'color-mix(in srgb, var(--c-down) 7%, var(--c-surface))',
        borderColor: 'color-mix(in srgb, var(--c-down) 30%, var(--c-hair-soft))',
      }}
    >
      <TriangleAlert size={16} className="flex-shrink-0 text-down" />
      <span>
        <b className="tnum text-ink">{disabled.length}</b> 个平台连续失败被临时禁用，稍后自动重试：
      </span>
      <span className="flex flex-wrap gap-1.5">
        {disabled.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink"
          >
            <span
              aria-hidden
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: platforms?.platforms[p]?.color ?? 'var(--c-down)' }}
            />
            {platforms?.platforms[p]?.name ?? p}
            <button
              onClick={() => enable.mutate(p)}
              disabled={enable.isPending}
              className="text-[11.5px] font-semibold text-link hover:underline disabled:opacity-50"
            >
              启用
            </button>
          </span>
        ))}
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="关闭提示"
        className="ml-auto text-ash transition-colors hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  )
}
