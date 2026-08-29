import React from 'react'
interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary:', error, info) }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="t-heading mb-2">页面出错了</h2>
          <p className="t-helper mb-4">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })} className="v-btn-primary">重试</button>
        </div>
      )
    }
    return this.props.children
  }
}
