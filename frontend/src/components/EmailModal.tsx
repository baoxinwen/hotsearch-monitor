import React, { useState, useEffect } from 'react'
import { Mail, Plus, X, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Webhook } from 'lucide-react'
import type { UserConfig } from '../types'
import { API } from '../api/client'

const WH = [{ v: 'generic', l: '通用 JSON' }, { v: 'wechat', l: '企业微信' }, { v: 'dingtalk', l: '钉钉' }, { v: 'feishu', l: '飞书' }]
const SMTP: Record<string, { h: string; p: string; l: string }> = { '163': { h: 'smtp.163.com', p: '465', l: '163邮箱' }, '126': { h: 'smtp.126.com', p: '465', l: '126邮箱' }, 'qq': { h: 'smtp.qq.com', p: '465', l: 'QQ邮箱' }, 'gmail': { h: 'smtp.gmail.com', p: '465', l: 'Gmail' }, 'outlook': { h: 'smtp.office365.com', p: '587', l: 'Outlook' } }

interface Props { config: UserConfig | null; onUpdate: (u: Partial<UserConfig>) => void }

export function EmailModal({ config, onUpdate }: Props) {
  const [en, setEn] = useState(config?.email_enabled || false)
  const [rcp, setRcp] = useState<string[]>(config?.email_to || [])
  const [em, setEm] = useState(''); const [freq, setFreq] = useState(config?.email_frequency || 'daily')
  const [time, setTime] = useState(config?.email_time || '09:00')
  const [ts, setTs] = useState<'idle'|'s'|'ok'|'err'>('idle'); const [tm, setTm] = useState('')
  const [rs, setRs] = useState<'idle'|'s'|'ok'|'err'>('idle'); const [rm, setRm] = useState('')
  const [ss, setSs] = useState<'idle'|'s'|'ok'|'err'>('idle')
  const [showSmtp, setShowSmtp] = useState(false)
  const [sh, setSh] = useState(config?.smtp_host||''); const [sp, setSp] = useState(String(config?.smtp_port||'465'))
  const [su, setSu] = useState(config?.smtp_user||''); const [spw, setSpw] = useState(config?.smtp_password||'')
  const [mf, setMf] = useState(config?.mail_from||'')
  const [we, setWe] = useState(config?.webhook_enabled||false); const [wu, setWu] = useState(config?.webhook_url||'')
  const [wt, setWt] = useState(config?.webhook_type||'generic')
  const [wts, setWts] = useState<'idle'|'s'|'ok'|'err'>('idle'); const [wtm, setWtm] = useState('')

  useEffect(() => { if (config) { setEn(config.email_enabled); setRcp(config.email_to||[]); setFreq(config.email_frequency||'daily'); setTime(config.email_time||'09:00'); setSh(config.smtp_host||''); setSp(String(config.smtp_port||'465')); setSu(config.smtp_user||''); setSpw(config.smtp_password||''); setMf(config.mail_from||''); setWe(config.webhook_enabled||false); setWu(config.webhook_url||''); setWt(config.webhook_type||'generic') } }, [config])

  const add = () => { const e = em.trim(); if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !rcp.includes(e)) { setRcp([...rcp, e]); setEm('') } }
  const rmv = (e: string) => setRcp(rcp.filter(x => x !== e))
  const save = async () => { setSs('s'); try { await onUpdate({ email_enabled: en, email_to: rcp, email_frequency: freq, email_time: time, smtp_host: sh, smtp_port: sp, smtp_user: su, smtp_password: spw, mail_from: mf, webhook_enabled: we, webhook_url: wu, webhook_type: wt }); setSs('ok'); setTimeout(() => setSs('idle'), 2000) } catch { setSs('err') } }
  const test = async () => { setTs('s'); setTm(''); try { const r = await API.testEmailSend(undefined, { smtp_host: sh, smtp_port: sp, smtp_user: su, smtp_password: spw, mail_from: mf }) as any; setTs(r.success?'ok':'err'); setTm(r.message||'发送'+(r.success?'成功':'失败')) } catch(e:any) { setTs('err'); setTm(e?.message||'发送失败') } setTimeout(() => { setTs('idle'); setTm('') }, 5000) }
  const rpt = async () => { setRs('s'); setRm(''); try { const r = await API.sendEmail() as any; setRs(r.success?'ok':'err'); setRm(r.message||'发送'+(r.success?'成功':'失败')) } catch(e:any) { setRs('err'); setRm(e?.message||'发送失败') } setTimeout(() => { setRs('idle'); setRm('') }, 5000) }
  const wht = async () => { setWts('s'); setWtm(''); try { const r = await API.testWebhook() as any; setWts(r.success?'ok':'err'); setWtm(r.message||'推送'+(r.success?'成功':'失败')) } catch(e:any) { setWts('err'); setWtm(e?.message||'推送失败') } setTimeout(() => { setWts('idle'); setWtm('') }, 5000) }

  const tog = (v: boolean, fn: () => void) => <button onClick={fn} className="v-toggle" data-active={v.toString()} role="switch" aria-checked={v} />
  const msgCls = (s: string) => ({ fontSize: '12px', padding: '8px 12px', borderRadius: 8, marginTop: 8, background: s==='ok'?'#d9f3e1':'#fde0ec', color: s==='ok'?'#1aae39':'#cd4239' })

  return (
    <div className="animate-fade-in-up">
      <h2 className="t-heading mb-4">推送设置</h2>
      <div className="card p-5 space-y-5">
        {/* Email toggle */}
        <div className="flex items-center justify-between"><div><div className="t-label">邮件推送</div><div className="t-helper">定时发送热搜报告到邮箱</div></div>{tog(en, () => setEn(!en))}</div>

        {/* Recipients */}
        <div><label className="t-label">收件人</label>
          <div className="flex flex-wrap gap-1.5 mb-2 mt-2">{rcp.map(e => <span key={e} className="v-pill gap-1">{e}<button onClick={() => rmv(e)} className="hover:opacity-70"><X size={10} /></button></span>)}</div>
          <div className="flex gap-2"><input type="email" value={em} onChange={e => setEm(e.target.value)} onKeyDown={e => e.key==='Enter'&&add()} placeholder="输入邮箱地址" className="v-input flex-1" />
            <button onClick={add} className="v-btn-primary px-3"><Plus size={16} /></button></div></div>

        {/* Frequency */}
        <div><label className="t-label">发送频率</label>
          <div className="flex gap-2 mt-2">{(['hourly','daily','weekly'] as const).map(f => <button key={f} onClick={() => setFreq(f)} className="px-4 py-2 rounded-p-full transition-all cursor-pointer"
            style={{ fontSize: '14px', fontWeight: 600, background: freq===f?'var(--c-primary)':'transparent', color: freq===f?'#23251d':'var(--c-body)', border: freq===f?'none':'1px solid var(--c-hair)', transform: freq===f?'scale(1.02)':'none' }}>
            {{ hourly: '每小时', daily: '每天', weekly: '每周' }[f]}</button>)}</div></div>

        {/* Send time */}
        <div><label className="t-label">发送时间</label><input type="time" value={time} onChange={e => setTime(e.target.value)} className="v-input w-40 mt-2" /></div>

        {/* SMTP */}
        <div>
          <button onClick={() => setShowSmtp(!showSmtp)} className="flex items-center gap-1.5" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-primary)' }}>{showSmtp?<ChevronUp size={14}/>:<ChevronDown size={14}/>} SMTP 邮件服务器配置</button>
          {showSmtp && <div className="mt-3 space-y-3 pl-3" style={{ borderLeft: '2px solid var(--c-hair-soft)' }}>
            <div className="flex flex-wrap gap-1.5">{Object.entries(SMTP).map(([k, v]) => <button key={k} onClick={() => { setSh(v.h); setSp(v.p) }} className="v-pill cursor-pointer hover:opacity-80 transition-opacity">{v.l}</button>)}</div>
            <div className="grid grid-cols-2 gap-3"><div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>SMTP 服务器</label><input type="text" value={sh} onChange={e => setSh(e.target.value)} placeholder="smtp.163.com" className="v-input" /></div>
              <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>端口</label><input type="text" value={sp} onChange={e => setSp(e.target.value)} placeholder="465" className="v-input" /></div></div>
            <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>用户名</label><input type="text" value={su} onChange={e => setSu(e.target.value)} placeholder="your@email.com" className="v-input" /></div>
            <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>密码/授权码</label><input type="password" value={spw} onChange={e => setSpw(e.target.value)} placeholder="SMTP密码或授权码" className="v-input" /></div>
            <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>发件人地址</label><input type="text" value={mf} onChange={e => setMf(e.target.value)} placeholder="your@email.com（默认同用户名）" className="v-input" /></div>
          </div>}</div>

        {/* Webhook */}
        <div style={{ borderTop: '1px solid var(--c-hair)' }} className="pt-4">
          <div className="flex items-center justify-between mb-3"><div><div className="t-label flex items-center gap-2"><Webhook size={16}/> Webhook 推送</div><div className="t-helper">推送到企业微信/钉钉/飞书</div></div>{tog(we, () => setWe(!we))}</div>
          {we && <div className="space-y-3">
            <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>推送类型</label><div className="flex flex-wrap gap-1.5">{WH.map(t => <button key={t.v} onClick={() => setWt(t.v as any)} className="px-3 py-1.5 rounded-p-full transition-all cursor-pointer"
              style={{ fontSize: '12px', fontWeight: wt===t.v?600:400, background: wt===t.v?'var(--c-primary)':'transparent', color: wt===t.v?'#23251d':'var(--c-body)', border: wt===t.v?'none':'1px solid var(--c-hair)' }}>{t.l}</button>)}</div></div>
            <div><label className="t-helper" style={{ marginBottom: 4, display: 'block' }}>Webhook URL</label><input type="url" value={wu} onChange={e => setWu(e.target.value)} placeholder="https://..." className="v-input" /></div>
            <button onClick={wht} disabled={wts==='s'||!wu} className="v-btn-secondary" style={{ fontSize: '12px' }}><Send size={12} className="inline mr-1"/>{wts==='s'?'测试中...':wts==='ok'?'测试成功':wts==='err'?'测试失败':'测试推送'}</button>
            {wtm && <div style={msgCls(wts)}>{wtm}</div>}
          </div>}</div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={ss==='s'} className="v-btn-primary flex items-center gap-1.5">{ss==='ok'?<CheckCircle size={14}/>:ss==='err'?<AlertCircle size={14}/>:null}{ss==='s'?'保存中...':ss==='ok'?'已保存':ss==='err'?'保存失败':'保存配置'}</button>
            <button onClick={test} disabled={ts==='s'||rcp.length===0} className="v-btn-secondary flex items-center gap-1.5"><Send size={14}/>{ts==='s'?'发送中...':ts==='ok'?'发送成功':ts==='err'?'发送失败':'发送测试'}</button>
            <button onClick={rpt} disabled={rs==='s'||rcp.length===0} className="v-btn-primary flex items-center gap-1.5"><Send size={14}/>{rs==='s'?'发送中...':rs==='ok'?'已发送':rs==='err'?'发送失败':'立即发送'}</button>
          </div>
          {tm && <div style={msgCls(ts)}>测试: {tm}</div>}
          {rm && <div style={msgCls(rs)}>报告: {rm}</div>}
          <p className="t-caption">「发送测试」验证SMTP连通性 | 「立即发送」按设置中的平台和关键词发送完整报告</p>
        </div>
      </div>
    </div>
  )
}
