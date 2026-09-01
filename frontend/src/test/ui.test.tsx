import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button, Chip, EmptyState, Kbd } from '../components/ui'
import { ErrorBoundary } from '../components/ErrorBoundary'

describe('ui 基础组件', () => {
  it('Button 渲染并响应点击', async () => {
    const onClick = vi.fn()
    render(<Button variant="primary" onClick={onClick}>保存</Button>)
    await userEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('Button disabled 时不响应', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>保存</Button>)
    await userEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('Chip 是 aria-pressed 的切换按钮', async () => {
    const onToggle = vi.fn()
    render(<Chip selected onToggle={onToggle}>华为</Chip>)
    const chip = screen.getByRole('button', { name: '华为' })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(chip)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('Kbd 渲染快捷键文本', () => {
    render(<Kbd>⌘K</Kbd>)
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('EmptyState 展示标题与描述', () => {
    render(<EmptyState title="暂无数据" description="请稍后再试" />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.getByText('请稍后再试')).toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  // 屏蔽测试期间的 console.error
  const origError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = origError
  })

  function Bomb({ crash }: { crash: boolean }) {
    if (crash) throw new Error('boom')
    return <p>ok</p>
  }

  it('捕获渲染错误并显示重试', () => {
    render(<ErrorBoundary><Bomb crash /></ErrorBoundary>)
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('重置后恢复渲染', async () => {
    // 先换上不会崩溃的子组件，再点重试（重试只清除错误状态，不改变 children）
    const { rerender } = render(<ErrorBoundary><Bomb crash /></ErrorBoundary>)
    rerender(<ErrorBoundary><Bomb crash={false} /></ErrorBoundary>)
    await userEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
