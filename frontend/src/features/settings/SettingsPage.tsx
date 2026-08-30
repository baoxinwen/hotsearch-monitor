import { useEffect, useMemo, useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Info, Monitor, Plus, Save, Send, ToggleLeft, Trash2, X } from 'lucide-react'
import type { EmailFrequency, UserConfig, WebhookType } from '../../types'
import { useClearCache, useConfig, useHealth, usePlatforms, useSendReport, useTestEmailWithConfig, useTestWebhook, useUpdateConfig } from '../../lib/queries'
import { getStoredApiKey, setStoredApiKey } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { useUIStore } from '../../lib/store'
import { formatInterval } from '../../lib/format'
import { Button, Card, Chip } from '../../components/ui'
import { Dialog, DialogClose, DialogContent, DialogTrigger, Switch } from '../../components/overlay'

/** 设置页：Tabs + 各分区脏状态跟踪 + 吸底保存栏 */
export function SettingsPage() {
  const { data: config, isLoading } = useConfig()

  if (isLoading || !config) {
    return <div className="p-6 text-[13px] text-mute">正在加载配置…</div>
  }

  return (
    <div className="mx-auto max-w-3xl fade-in p-4 sm:p-6">
      <TabsPrimitive.Root defaultValue="monitor">
        <TabsPrimitive.List className="mb-4 flex gap-1 border-b border-hair-soft">
          <Tab value="monitor" icon={<Monitor size={14} />}>监控</Tab>
          <Tab value="push" icon={<Send size={14} />}>推送</Tab>
          <Tab value="appearance" icon={<ToggleLeft size={14} />}>外观</Tab>
          <Tab value="about" icon={<Info size={14} />}>关于</Tab>
        </TabsPrimitive.List>
        <TabsPrimitive.Content value="monitor" className="focus-visible:outline-none"><MonitorTab config={config} /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="push" className="focus-visible:outline-none"><PushTab config={config} /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="appearance" className="focus-visible:outline-none"><AppearanceTab /></TabsPrimitive.Content>
        <TabsPrimitive.Content value="about" className="focus-visible:outline-none"><AboutTab /></TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  )
}

function Tab({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="inline-flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 text-[13.5px] font-medium text-mute transition-colors hover:text-body data-[state=active]:border-accent data-[state=active]:font-semibold data-[state=active]:text-ink"
    >
      {icon}
      {children}
    </TabsPrimitive.Trigger>
  )
}

/** 吸底保存栏：有未保存修改时出现 */
function SaveBar({ dirty, onSave, onReset, saving }: { dirty: boolean; onSave: () => void; onReset: () => void; saving: boolean }) {
  if (!dirty) return null
  return (
    <div className="sticky bottom-0 -mx-4 mt-6 flex items-center gap-3 border-t border-hair bg-canvas/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <span className="text-[13px] text-mute">有未保存的修改</span>
      <div className="flex-1" />
      <Button onClick={onReset} disabled={saving}>放弃修改</Button>
      <Button variant="primary" onClick={onSave} disabled={saving}>
        <Save size={13} /> {saving ? '保存中…' : '保存修改'}
      </Button>
    </div>
  )
}

function useConfigForm<T>(config: UserConfig, pick: (c: UserConfig) => T) {
  const [form, setForm] = useState<T>(() => pick(config))
  useEffect(() => setForm(pick(config)), [config]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(pick(config)), [form, config]) // eslint-disable-line react-hooks/exhaustive-deps
  return [form, setForm, dirty] as const
}

/* ==================== 监控 ==================== */
function MonitorTab({ config }: { config: UserConfig }) {
  const update = useUpdateConfig()
  const { data: platforms } = usePlatforms()
  const [form, setForm, dirty] = useConfigForm(config, (c) => ({
    keywordsText: c.keywords.join('\n'),
    stopWordsText: (c.stop_words ?? []).join('\n'),
    min_term_length: c.min_term_length ?? 2,
    platforms: c.platforms,
    update_interval: c.update_interval,
  }))

  const allPlatforms = Object.keys(platforms?.platforms ?? {})
  const effective: string[] = form.platforms.length > 0 ? form.platforms : allPlatforms

  const save = () =>
    update.mutate({
      keywords: form.keywordsText.split('\n').map((x) => x.trim()).filter(Boolean),
      stop_words: form.stopWordsText.split('\n').map((x) => x.trim()).filter(Boolean),
      min_term_length: form.min_term_length,
      platforms: form.platforms.length === allPlatforms.length ? [] : form.platforms,
      update_interval: form.update_interval,
    })

  const reset = () =>
    setForm({
      keywordsText: config.keywords.join('\n'),
      stopWordsText: (config.stop_words ?? []).join('\n'),
      min_term_length: config.min_term_length ?? 2,
      platforms: config.platforms,
      update_interval: config.update_interval,
    })

  const togglePlatform = (p: string) => {
    const base = form.platforms.length === 0 ? allPlatforms : form.platforms
    const next = base.includes(p) ? base.filter((x) => x !== p) : [...base, p]
    setForm({ ...form, platforms: next })
  }
  const toggleCategory = (ps: string[]) => {
    const base = form.platforms.length === 0 ? allPlatforms : form.platforms
    const allSel = ps.every((p) => base.includes(p))
    setForm({ ...form, platforms: allSel ? base.filter((p) => !ps.includes(p)) : [...new Set([...base, ...ps])] })
  }

  const PRESETS = [300, 900, 1800, 3600]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="t-label">监控关键词</h3>
        <p className="mb-2.5 mt-0.5 text-xs text-mute">每行一个关键词，热搜标题包含任一关键词即被筛选/统计/推送</p>
        <textarea
          rows={5}
          value={form.keywordsText}
          onChange={(e) => setForm({ ...form, keywordsText: e.target.value })}
          placeholder={'例如：\n华为\nOpenAI\n房价'}
          className="input"
        />
        <div className="mt-4">
          <h3 className="t-label text-[13px]">分析停用词（可选）</h3>
          <p className="mb-2 mt-0.5 text-xs text-mute">趋势分析中排除的词，每行一个（只影响关键词统计，不影响筛选）</p>
          <textarea
            rows={3}
            value={form.stopWordsText}
            onChange={(e) => setForm({ ...form, stopWordsText: e.target.value })}
            placeholder={'例如：\n网友\n视频'}
            className="input"
          />
        </div>
        <div className="mt-4">
          <h3 className="t-label text-[13px]">关键词最小长度</h3>
          <p className="mb-2 mt-0.5 text-xs text-mute">过滤分词产生的短碎片，调大可进一步降噪</p>
          <div className="flex gap-1.5">
            {[2, 3, 4].map((n) => (
              <Chip key={n} selected={form.min_term_length === n} onToggle={() => setForm({ ...form, min_term_length: n })}>
                {n} 字
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-1 flex items-center">
          <h3 className="t-label">监控平台</h3>
          <span className="tnum ml-2 text-xs text-mute">已选 {effective.length}/{allPlatforms.length}</span>
        </div>
        <p className="mb-3 text-xs text-mute">不选任何平台等同于全部监控</p>
        <div className="space-y-3.5">
          {Object.entries(platforms?.categories ?? {}).map(([cat, ps]) => {
            const allSel = ps.every((p) => effective.includes(p))
            return (
              <div key={cat}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ash">{cat}</span>
                  <button onClick={() => toggleCategory(ps)} className="text-[11.5px] font-semibold text-link hover:underline">
                    {allSel ? '取消' : '全选'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map((p) => (
                    <Chip key={p} selected={effective.includes(p)} onToggle={() => togglePlatform(p)}>
                      <span aria-hidden className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: platforms?.platforms[p]?.color ?? '#888' }} />
                      {platforms?.platforms[p]?.name ?? p}
                    </Chip>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="t-label">更新间隔</h3>
          <span className="tnum text-[13px] font-semibold text-ink">{formatInterval(form.update_interval)}</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Chip key={p} selected={form.update_interval === p} onToggle={() => setForm({ ...form, update_interval: p })}>
              {formatInterval(p)}
            </Chip>
          ))}
        </div>
        <input
          type="range"
          min={60}
          max={3600}
          step={60}
          value={form.update_interval}
          onChange={(e) => setForm({ ...form, update_interval: Number(e.target.value) })}
          className="w-full accent-[var(--c-accent)]"
          aria-label="自定义更新间隔"
        />
        <p className="mt-1 text-xs text-ash">数据按此间隔自动轮询刷新（60 秒 – 1 小时）</p>
      </Card>

      <SaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={reset} />
    </div>
  )
}

/* ==================== 推送 ==================== */
const SMTP_PRESETS: Record<string, { host: string; port: string; label: string }> = {
  '163': { host: 'smtp.163.com', port: '465', label: '163邮箱' },
  '126': { host: 'smtp.126.com', port: '465', label: '126邮箱' },
  'qq': { host: 'smtp.qq.com', port: '465', label: 'QQ邮箱' },
  'gmail': { host: 'smtp.gmail.com', port: '465', label: 'Gmail' },
  'outlook': { host: 'smtp.office365.com', port: '587', label: 'Outlook' },
}
const WEBHOOK_TYPES: { value: WebhookType; label: string }[] = [
  { value: 'generic', label: '通用 JSON' },
  { value: 'wechat', label: '企业微信' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'feishu', label: '飞书' },
]

function PushTab({ config }: { config: UserConfig }) {
  const update = useUpdateConfig()
  const sendReport = useSendReport()
  const testEmail = useTestEmailWithConfig()
  const testWebhook = useTestWebhook()

  const [form, setForm, dirty] = useConfigForm(config, (c) => ({
    email_enabled: c.email_enabled,
    email_to: c.email_to,
    email_frequency: c.email_frequency,
    email_time: c.email_time,
    smtp_host: c.smtp_host ?? '',
    smtp_port: String(c.smtp_port ?? '465'),
    smtp_user: c.smtp_user ?? '',
    smtp_password: c.smtp_password ?? '',
    mail_from: c.mail_from ?? '',
    webhook_enabled: c.webhook_enabled ?? false,
    webhook_url: c.webhook_url ?? '',
    webhook_type: c.webhook_type ?? 'generic',
  }))
  const [emailInput, setEmailInput] = useState('')
  const [showSmtp, setShowSmtp] = useState(false)

  const save = () => {
    const payload: Record<string, unknown> = { ...form }
    if (!form.smtp_password || form.smtp_password === '***') delete payload.smtp_password
    update.mutate(payload)
  }

  const addRecipient = () => {
    const email = emailInput.trim()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !form.email_to.includes(email)) {
      setForm({ ...form, email_to: [...form.email_to, email] })
      setEmailInput('')
    }
  }

  const smtpFilled = form.smtp_host && form.smtp_user

  return (
    <div className="space-y-4">
      {/* 邮件推送 */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="t-label">邮件推送</h3>
            <p className="text-xs text-mute">按频率定时发送热搜报告到邮箱</p>
          </div>
          <Switch checked={form.email_enabled} onCheckedChange={(v) => setForm({ ...form, email_enabled: v })} label="邮件推送开关" />
        </div>

        {form.email_enabled && (
          <div className="mt-4 space-y-4 border-t border-hair-soft pt-4">
            {/* 收件人 */}
            <div>
              <label className="t-label text-[13px]">收件人（最多 10 个）</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.email_to.map((email) => (
                  <span key={email} className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1 text-xs text-body">
                    {email}
                    <button
                      onClick={() => setForm({ ...form, email_to: form.email_to.filter((x) => x !== email) })}
                      aria-label={`移除 ${email}`}
                      className="rounded-full p-0.5 text-ash hover:bg-hair-soft hover:text-ink"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex max-w-md gap-2">
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                  placeholder="name@example.com"
                  className="input"
                  type="email"
                />
                <Button variant="primary" onClick={addRecipient} aria-label="添加收件人"><Plus size={14} /></Button>
              </div>
            </div>

            {/* 频率 + 时间 */}
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <label className="t-label text-[13px]">发送频率</label>
                <div className="mt-2 flex gap-1.5">
                  {(['hourly', 'daily', 'weekly'] as EmailFrequency[]).map((f) => (
                    <Chip key={f} selected={form.email_frequency === f} onToggle={() => setForm({ ...form, email_frequency: f })}>
                      {{ hourly: '每小时', daily: '每天', weekly: '每周' }[f]}
                    </Chip>
                  ))}
                </div>
              </div>
              {form.email_frequency !== 'hourly' && (
                <div>
                  <label className="t-label text-[13px]">发送时间</label>
                  <input type="time" value={form.email_time} onChange={(e) => setForm({ ...form, email_time: e.target.value })} className="input mt-2 w-32" />
                </div>
              )}
            </div>

            {/* SMTP */}
            <div>
              <button onClick={() => setShowSmtp(!showSmtp)} className="text-[13px] font-semibold text-link hover:underline">
                SMTP 服务器配置 {smtpFilled ? '（已填写）' : '（未填写）'}
              </button>
              {showSmtp && (
                <div className="mt-3 space-y-3 border-l-2 border-hair-soft pl-3">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SMTP_PRESETS).map(([key, p]) => (
                      <Chip
                        key={key}
                        selected={form.smtp_host === p.host}
                        onToggle={() => setForm({ ...form, smtp_host: p.host, smtp_port: p.port })}
                      >
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-xs text-mute">
                      SMTP 服务器
                      <input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.163.com" className="input mt-1" />
                    </label>
                    <label className="block text-xs text-mute">
                      端口
                      <input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} placeholder="465" className="input mt-1" />
                    </label>
                    <label className="block text-xs text-mute">
                      用户名
                      <input value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} placeholder="your@email.com" className="input mt-1" />
                    </label>
                    <label className="block text-xs text-mute">
                      密码 / 授权码
                      <input type="password" value={form.smtp_password} onChange={(e) => setForm({ ...form, smtp_password: e.target.value })} placeholder="留空保持不变" className="input mt-1" />
                    </label>
                    <label className="block text-xs text-mute sm:col-span-2">
                      发件人地址（默认同用户名）
                      <input value={form.mail_from} onChange={(e) => setForm({ ...form, mail_from: e.target.value })} placeholder="your@email.com" className="input mt-1" />
                    </label>
                  </div>
                  <Button
                    onClick={() => testEmail.mutate({ smtp_host: form.smtp_host, smtp_port: form.smtp_port, smtp_user: form.smtp_user, smtp_password: form.smtp_password === '***' ? '' : form.smtp_password, mail_from: form.mail_from })}
                    disabled={testEmail.isPending}
                  >
                    <Send size={12} /> 用以上配置发送测试邮件
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Webhook */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="t-label">Webhook 推送</h3>
            <p className="text-xs text-mute">推送到企业微信 / 钉钉 / 飞书 / 自定义端点</p>
          </div>
          <Switch checked={form.webhook_enabled} onCheckedChange={(v) => setForm({ ...form, webhook_enabled: v })} label="Webhook 开关" />
        </div>

        {form.webhook_enabled && (
          <div className="mt-4 space-y-3 border-t border-hair-soft pt-4">
            <div className="flex flex-wrap gap-1.5">
              {WEBHOOK_TYPES.map((t) => (
                <Chip key={t.value} selected={form.webhook_type === t.value} onToggle={() => setForm({ ...form, webhook_type: t.value })}>
                  {t.label}
                </Chip>
              ))}
            </div>
            <input
              value={form.webhook_url}
              onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…"
              className="input"
              type="url"
            />
            <Button onClick={() => testWebhook.mutate()} disabled={!form.webhook_url || testWebhook.isPending}>
              <Send size={12} /> {testWebhook.isPending ? '推送中…' : '发送测试推送'}
            </Button>
          </div>
        )}
      </Card>

      {/* 立即发送 */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="t-label">手动发送报告</h3>
          <p className="text-xs text-mute">按当前监控设置（平台 + 关键词）立即发送一次完整报告</p>
        </div>
        <Button
          variant="primary"
          onClick={() => sendReport.mutate()}
          disabled={sendReport.isPending || !config.email_enabled || config.email_to.length === 0}
        >
          <Send size={13} /> {sendReport.isPending ? '发送中…' : '立即发送'}
        </Button>
      </Card>

      <SaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => setForm({
        email_enabled: config.email_enabled,
        email_to: config.email_to,
        email_frequency: config.email_frequency,
        email_time: config.email_time,
        smtp_host: config.smtp_host ?? '',
        smtp_port: String(config.smtp_port ?? '465'),
        smtp_user: config.smtp_user ?? '',
        smtp_password: config.smtp_password ?? '',
        mail_from: config.mail_from ?? '',
        webhook_enabled: config.webhook_enabled ?? false,
        webhook_url: config.webhook_url ?? '',
        webhook_type: config.webhook_type ?? 'generic',
      })} />
    </div>
  )
}

/* ==================== 外观 ==================== */
function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const density = useUIStore((s) => s.density)
  const setDensity = useUIStore((s) => s.setDensity)
  const reduceMotion = useUIStore((s) => s.reduceMotion)
  const setReduceMotion = useUIStore((s) => s.setReduceMotion)

  const THEMES: { value: ReturnType<typeof useTheme>['theme']; label: string }[] = [
    { value: 'system', label: '跟随系统' },
    { value: 'dark', label: '深色' },
    { value: 'light', label: '亮色' },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="t-label mb-1">主题</h3>
        <p className="mb-3 text-xs text-mute">深色为默认主题，亮色为暖纸配色</p>
        <div className="flex gap-1.5">
          {THEMES.map((t) => (
            <Chip key={t.value} selected={theme === t.value} onToggle={() => setTheme(t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="t-label mb-1">信息密度</h3>
        <p className="mb-3 text-xs text-mute">紧凑模式单屏可多显示约 30% 条目（快捷键 D）</p>
        <div className="flex gap-1.5">
          <Chip selected={density === 'cozy'} onToggle={() => setDensity('cozy')}>舒适</Chip>
          <Chip selected={density === 'compact'} onToggle={() => setDensity('compact')}>紧凑</Chip>
        </div>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-4">
        <div>
          <h3 className="t-label">减少动效</h3>
          <p className="text-xs text-mute">关闭过渡与动画，适合低性能设备或动效敏感用户</p>
        </div>
        <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} label="减少动效" />
      </Card>
    </div>
  )
}

/* ==================== 关于 ==================== */
function AboutTab() {
  const { data: health } = useHealth()
  const clearCache = useClearCache()
  const [apiKey, setApiKey] = useState(getStoredApiKey())
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="t-label mb-2">热搜监控</h3>
        <p className="text-[13px] text-body">
          多平台热搜聚合监控：{health?.platforms_count ?? '—'} 个平台 · 关键词过滤 · 趋势分析 · 邮件 / Webhook 推送
        </p>
        <p className="mt-1 text-xs text-mute">
          后端状态：{health ? `${health.status} · 已运行 ${health.uptime}` : '未知'}
        </p>
      </Card>
      <Card className="p-4">
        <h3 className="t-label mb-2">键盘快捷键</h3>
        <ul className="space-y-1.5 text-[13px] text-body">
          {[
            ['1 / 2 / 3 / 4', '切换页面'],
            ['/', '聚焦搜索框'],
            ['R', '刷新全部平台'],
            ['T', '切换深色 / 亮色主题'],
            ['D', '切换紧凑 / 舒适密度'],
            ['Ctrl+K', '命令面板'],
          ].map(([k, v]) => (
            <li key={k} className="flex items-center gap-3">
              <kbd className="inline-flex h-6 min-w-[64px] items-center justify-center rounded-xs border border-hair bg-surface px-1.5 text-[11px] font-semibold text-mute">{k}</kbd>
              {v}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <h3 className="t-label mb-1">API 访问密钥</h3>
        <p className="mb-2.5 mt-0.5 text-xs text-mute">
          仅当后端通过环境变量 <code className="rounded-xs bg-surface-2 px-1">API_KEY</code> 启用认证时需要填写，
          保存在本机浏览器中
        </p>
        <div className="flex max-w-md gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSaved(false) }}
            placeholder="后端 API_KEY 环境变量的值"
            className="input"
          />
          <Button
            variant="primary"
            onClick={() => { setStoredApiKey(apiKey.trim()); setSaved(true) }}
          >
            <Save size={13} /> {saved ? '已保存' : '保存'}
          </Button>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="t-label mb-2">维护</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary"><Trash2 size={13} /> 清除数据缓存</Button>
          </DialogTrigger>
          <DialogContent title="清除后端数据缓存？" description="将清除全部平台的热搜缓存，下次访问会重新抓取（不影响历史快照）">
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button>取消</Button></DialogClose>
              <DialogClose asChild>
                <Button variant="danger" onClick={() => clearCache.mutate()}>确认清除</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  )
}
