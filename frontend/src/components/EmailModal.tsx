import React, { useState, useEffect } from 'react'
import { Mail, Plus, X, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Webhook } from 'lucide-react'
import type { UserConfig } from '../types'
import { API } from '../api/client'

const WEBHOOK_TYPES = [
  { value: 'generic', label: '通用 JSON' },
  { value: 'wechat', label: '企业微信' },
  { value: 'dingtalk', label: '钉钉' },
  { value: 'feishu', label: '飞书' },
]

const SMTP_PRESETS: Record<string, { host: string; port: string; label: string }> = {
  '163': { host: 'smtp.163.com', port: '465', label: '163邮箱' },
  '126': { host: 'smtp.126.com', port: '465', label: '126邮箱' },
  'qq': { host: 'smtp.qq.com', port: '465', label: 'QQ邮箱' },
  'gmail': { host: 'smtp.gmail.com', port: '465', label: 'Gmail' },
  'outlook': { host: 'smtp.office365.com', port: '587', label: 'Outlook' },
}

type Status = 'idle' | 'sending' | 'ok' | 'err'

interface Props {
  config: UserConfig | null
  onUpdate: (u: Partial<UserConfig>) => void
}

export function EmailModal({ config, onUpdate }: Props) {
  // Email state
  const [emailEnabled, setEmailEnabled] = useState(config?.email_enabled || false)
  const [recipients, setRecipients] = useState<string[]>(config?.email_to || [])
  const [emailInput, setEmailInput] = useState('')
  const [frequency, setFrequency] = useState(config?.email_frequency || 'daily')
  const [sendTime, setSendTime] = useState(config?.email_time || '09:00')

  // SMTP state
  const [showSmtp, setShowSmtp] = useState(false)
  const [smtpHost, setSmtpHost] = useState(config?.smtp_host || '')
  const [smtpPort, setSmtpPort] = useState(String(config?.smtp_port || '465'))
  const [smtpUser, setSmtpUser] = useState(config?.smtp_user || '')
  const [smtpPassword, setSmtpPassword] = useState(config?.smtp_password || '')
  const [mailFrom, setMailFrom] = useState(config?.mail_from || '')

  // Webhook state
  const [webhookEnabled, setWebhookEnabled] = useState(config?.webhook_enabled || false)
  const [webhookUrl, setWebhookUrl] = useState(config?.webhook_url || '')
  const [webhookType, setWebhookType] = useState(config?.webhook_type || 'generic')

  // Status tracking
  const [saveStatus, setSaveStatus] = useState<Status>('idle')
  const [testStatus, setTestStatus] = useState<Status>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [reportStatus, setReportStatus] = useState<Status>('idle')
  const [reportMessage, setReportMessage] = useState('')
  const [webhookTestStatus, setWebhookTestStatus] = useState<Status>('idle')
  const [webhookTestMessage, setWebhookTestMessage] = useState('')

  // Sync config to local state
  useEffect(() => {
    if (!config) return
    setEmailEnabled(config.email_enabled)
    setRecipients(config.email_to || [])
    setFrequency(config.email_frequency || 'daily')
    setSendTime(config.email_time || '09:00')
    setSmtpHost(config.smtp_host || '')
    setSmtpPort(String(config.smtp_port || '465'))
    setSmtpUser(config.smtp_user || '')
    setSmtpPassword(config.smtp_password || '')
    setMailFrom(config.mail_from || '')
    setWebhookEnabled(config.webhook_enabled || false)
    setWebhookUrl(config.webhook_url || '')
    setWebhookType(config.webhook_type || 'generic')
  }, [config])

  const addRecipient = () => {
    const email = emailInput.trim()
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !recipients.includes(email)) {
      setRecipients([...recipients, email])
      setEmailInput('')
    }
  }

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(x => x !== email))
  }

  const handleSave = async () => {
    setSaveStatus('sending')
    try {
      const updates: Record<string, any> = {
        email_enabled: emailEnabled,
        email_to: recipients,
        email_frequency: frequency,
        email_time: sendTime,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        mail_from: mailFrom,
        webhook_enabled: webhookEnabled,
        webhook_url: webhookUrl,
        webhook_type: webhookType,
      }
      // Don't send masked password back
      if (smtpPassword && smtpPassword !== '***') {
        updates.smtp_password = smtpPassword
      }
      await onUpdate(updates)
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('err')
    }
  }

  const handleTestEmail = async () => {
    setTestStatus('sending')
    setTestMessage('')
    try {
      const resp = await API.testEmailSend(undefined, {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        mail_from: mailFrom,
      }) as any
      setTestStatus(resp.success ? 'ok' : 'err')
      setTestMessage(resp.message || (resp.success ? '发送成功' : '发送失败'))
    } catch (e: any) {
      setTestStatus('err')
      setTestMessage(e?.message || '发送失败')
    }
    setTimeout(() => { setTestStatus('idle'); setTestMessage('') }, 5000)
  }

  const handleSendReport = async () => {
    setReportStatus('sending')
    setReportMessage('')
    try {
      const resp = await API.sendEmail() as any
      setReportStatus(resp.success ? 'ok' : 'err')
      setReportMessage(resp.message || (resp.success ? '发送成功' : '发送失败'))
    } catch (e: any) {
      setReportStatus('err')
      setReportMessage(e?.message || '发送失败')
    }
    setTimeout(() => { setReportStatus('idle'); setReportMessage('') }, 5000)
  }

  const handleTestWebhook = async () => {
    setWebhookTestStatus('sending')
    setWebhookTestMessage('')
    try {
      const resp = await API.testWebhook() as any
      setWebhookTestStatus(resp.success ? 'ok' : 'err')
      setWebhookTestMessage(resp.message || (resp.success ? '推送成功' : '推送失败'))
    } catch (e: any) {
      setWebhookTestStatus('err')
      setWebhookTestMessage(e?.message || '推送失败')
    }
    setTimeout(() => { setWebhookTestStatus('idle'); setWebhookTestMessage('') }, 5000)
  }

  const statusLabel = (s: Status, sending: string, done: string, fail: string) =>
    s === 'sending' ? sending : s === 'ok' ? done : s === 'err' ? fail : ''

  const msgStyle = (s: Status): React.CSSProperties => ({
    fontSize: '12px', padding: '8px 12px', borderRadius: 8, marginTop: 8,
    background: s === 'ok' ? '#d9f3e1' : '#fde0ec',
    color: s === 'ok' ? '#1aae39' : '#cd4239',
  })

  const ToggleButton = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="v-toggle" data-active={active.toString()} role="switch" aria-checked={active} aria-label={active ? '已启用' : '已禁用'} />
  )

  return (
    <div className="animate-fade-in-up">
      <h2 className="t-heading mb-4">推送设置</h2>
      <div className="card p-5 space-y-5">
        {/* Email toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="t-label">邮件推送</div>
            <div className="t-helper">定时发送热搜报告到邮箱</div>
          </div>
          <ToggleButton active={emailEnabled} onClick={() => setEmailEnabled(!emailEnabled)} />
        </div>

        {/* Recipients */}
        <div>
          <label className="t-label">收件人</label>
          <div className="flex flex-wrap gap-1.5 mb-2 mt-2">
            {recipients.map(email => (
              <span key={email} className="v-pill gap-1">
                {email}
                <button onClick={() => removeRecipient(email)} className="hover:opacity-70" aria-label={`移除 ${email}`}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRecipient()}
              placeholder="输入邮箱地址" className="v-input flex-1" />
            <button onClick={addRecipient} className="v-btn-primary px-3"><Plus size={16} /></button>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="t-label">发送频率</label>
          <div className="flex gap-2 mt-2">
            {(['hourly', 'daily', 'weekly'] as const).map(f => (
              <button key={f} onClick={() => setFrequency(f)} className="px-4 py-2 rounded-p-full transition-all cursor-pointer"
                style={{
                  fontSize: '14px', fontWeight: 600,
                  background: frequency === f ? 'var(--c-primary)' : 'transparent',
                  color: frequency === f ? '#23251d' : 'var(--c-body)',
                  border: frequency === f ? 'none' : '1px solid var(--c-hair)',
                  transform: frequency === f ? 'scale(1.02)' : 'none',
                }}>
                {{ hourly: '每小时', daily: '每天', weekly: '每周' }[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Send time */}
        <div>
          <label className="t-label">发送时间</label>
          <input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} className="v-input w-40 mt-2" />
        </div>

        {/* SMTP */}
        <div>
          <button onClick={() => setShowSmtp(!showSmtp)} className="flex items-center gap-1.5"
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-primary)' }}>
            {showSmtp ? <ChevronUp size={14} /> : <ChevronDown size={14} />} SMTP 邮件服务器配置
          </button>
          {showSmtp && (
            <div className="mt-3 space-y-3 pl-3" style={{ borderLeft: '2px solid var(--c-hair-soft)' }}>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SMTP_PRESETS).map(([key, preset]) => (
                  <button key={key} onClick={() => { setSmtpHost(preset.host); setSmtpPort(preset.port) }}
                    className="v-pill cursor-pointer hover:opacity-80 transition-opacity">
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>SMTP 服务器</label>
                  <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.163.com" className="v-input" />
                </div>
                <div>
                  <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>端口</label>
                  <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="465" className="v-input" />
                </div>
              </div>
              <div>
                <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>用户名</label>
                <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="your@email.com" className="v-input" />
              </div>
              <div>
                <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>密码/授权码</label>
                <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder="SMTP密码或授权码" className="v-input" />
              </div>
              <div>
                <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>发件人地址</label>
                <input type="text" value={mailFrom} onChange={e => setMailFrom(e.target.value)} placeholder="your@email.com（默认同用户名）" className="v-input" />
              </div>
            </div>
          )}
        </div>

        {/* Webhook */}
        <div style={{ borderTop: '1px solid var(--c-hair)' }} className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="t-label flex items-center gap-2"><Webhook size={16} /> Webhook 推送</div>
              <div className="t-helper">推送到企业微信/钉钉/飞书</div>
            </div>
            <ToggleButton active={webhookEnabled} onClick={() => setWebhookEnabled(!webhookEnabled)} />
          </div>
          {webhookEnabled && (
            <div className="space-y-3">
              <div>
                <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>推送类型</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEBHOOK_TYPES.map(t => (
                    <button key={t.value} onClick={() => setWebhookType(t.value as any)}
                      className="px-3 py-1.5 rounded-p-full transition-all cursor-pointer"
                      style={{
                        fontSize: '12px', fontWeight: webhookType === t.value ? 600 : 400,
                        background: webhookType === t.value ? 'var(--c-primary)' : 'transparent',
                        color: webhookType === t.value ? '#23251d' : 'var(--c-body)',
                        border: webhookType === t.value ? 'none' : '1px solid var(--c-hair)',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>Webhook URL</label>
                <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://..." className="v-input" />
              </div>
              <button onClick={handleTestWebhook} disabled={webhookTestStatus === 'sending' || !webhookUrl}
                className="v-btn-secondary" style={{ fontSize: '12px' }}>
                <Send size={12} className="inline mr-1" />
                {statusLabel(webhookTestStatus, '测试中...', '测试成功', '测试失败') || '测试推送'}
              </button>
              {webhookTestMessage && <div style={msgStyle(webhookTestStatus)}>{webhookTestMessage}</div>}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={saveStatus === 'sending'} className="v-btn-primary flex items-center gap-1.5">
              {saveStatus === 'ok' ? <CheckCircle size={14} /> : saveStatus === 'err' ? <AlertCircle size={14} /> : null}
              {statusLabel(saveStatus, '保存中...', '已保存', '保存失败') || '保存配置'}
            </button>
            <button onClick={handleTestEmail} disabled={testStatus === 'sending' || recipients.length === 0}
              className="v-btn-secondary flex items-center gap-1.5">
              <Send size={14} />
              {statusLabel(testStatus, '发送中...', '发送成功', '发送失败') || '发送测试'}
            </button>
            <button onClick={handleSendReport} disabled={reportStatus === 'sending' || recipients.length === 0}
              className="v-btn-primary flex items-center gap-1.5">
              <Send size={14} />
              {statusLabel(reportStatus, '发送中...', '已发送', '发送失败') || '立即发送'}
            </button>
          </div>
          {testMessage && <div style={msgStyle(testStatus)}>测试: {testMessage}</div>}
          {reportMessage && <div style={msgStyle(reportStatus)}>报告: {reportMessage}</div>}
          <p className="t-caption">「发送测试」验证SMTP连通性 | 「立即发送」按设置中的平台和关键词发送完整报告</p>
        </div>
      </div>
    </div>
  )
}
