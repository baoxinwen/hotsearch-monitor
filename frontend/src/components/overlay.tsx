import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

/* ============ Popover ============ */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({
  className = '',
  align = 'start',
  sideOffset = 6,
  children,
  ...rest
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={`z-50 max-h-[min(480px,var(--radix-popover-content-available-height))] overflow-y-auto rounded-lg border border-hair bg-surface p-3 shadow-pop ${className}`}
        {...rest}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

/* ============ Dialog ============ */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-[var(--scrim)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[95] w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hair bg-surface p-5 shadow-pop">
        <DialogPrimitive.Title className="t-label text-[14px]">{title}</DialogPrimitive.Title>
        {description && <DialogPrimitive.Description className="mt-1 text-[13px] text-mute">{description}</DialogPrimitive.Description>}
        <div className="mt-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/* ============ Switch ============ */
export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  label?: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={`relative h-[22px] w-[38px] flex-shrink-0 rounded-full border border-transparent transition-colors ${
        checked ? 'bg-accent' : 'bg-hair'
      }`}
    >
      <SwitchPrimitive.Thumb
        className={`block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[17px]' : 'translate-x-[2px]'
        }`}
      />
    </SwitchPrimitive.Root>
  )
}

/* ============ Tooltip ============ */
export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-[100] rounded-md border border-hair bg-surface px-2.5 py-1.5 text-xs text-body shadow-pop"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
