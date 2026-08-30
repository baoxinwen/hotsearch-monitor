import React from 'react'

/* ============ Button ============ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent font-semibold hover:bg-accent-hover active:bg-accent-press disabled:bg-hair-soft disabled:text-ash disabled:cursor-not-allowed',
  secondary:
    'bg-surface border border-hair text-body font-medium hover:bg-surface-2 hover:border-mute hover:text-ink disabled:text-ash disabled:border-hair-soft disabled:cursor-not-allowed',
  ghost: 'text-body font-medium hover:bg-surface-2 hover:text-ink disabled:text-ash disabled:cursor-not-allowed',
  danger:
    'bg-down text-white font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
}
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1',
  md: 'h-8 px-3 text-[13px] gap-1.5',
  icon: 'h-8 w-8 justify-center',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center rounded-md transition-colors duration-150 select-none whitespace-nowrap ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
      {...rest}
    />
  )
}

/* ============ Kbd ============ */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs border border-hair bg-surface px-1 font-sans text-[10.5px] font-semibold text-mute">
      {children}
    </kbd>
  )
}

/* ============ Chip ============ */
export function Chip({
  selected,
  onToggle,
  children,
  className = '',
}: {
  selected?: boolean
  onToggle?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        selected
          ? 'border-accent/60 bg-accent-soft font-semibold text-ink'
          : 'border-hair bg-surface font-normal text-body hover:border-mute hover:text-ink'
      } ${className}`}
    >
      {selected && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {children}
    </button>
  )
}

/* ============ 平台圆点 ============ */
export function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: size, height: size, background: color, boxShadow: '0 0 0 1px var(--c-hair)' }}
    />
  )
}

/* ============ Card ============ */
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>
}

/* ============ EmptyState ============ */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="mb-1 text-ash">{icon}</div>}
      <p className="text-[14px] font-medium text-body">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-mute">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/* ============ Skeleton ============ */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

/* ============ Spinner ============ */
export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  )
}
