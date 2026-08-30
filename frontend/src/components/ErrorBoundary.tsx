import React from 'react'

interface State { error: Error | null }

/** 页面级错误边界：隔离单页崩溃，提供重试 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-[16px] font-bold text-ink">页面出错了</h2>
          <p className="max-w-md text-[13px] text-mute">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-semibold text-on-accent hover:bg-accent-hover"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
