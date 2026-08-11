import type { ReactNode } from 'react'
import { text } from '@/styles/typography'

interface BookingFlowToolbarProps {
  title?: string
  subtitle?: string
  onBack: () => void
  backIcon: ReactNode
  backAriaLabel?: string
  trailing?: ReactNode
  titleHeadingLevel?: number
}

export function BookingFlowToolbar({ title, subtitle, onBack, backIcon, backAriaLabel = 'Назад', trailing, titleHeadingLevel }: BookingFlowToolbarProps) {
  return (
    <div style={{ position: 'relative', height: 76, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
      <BookingFlowPillButton onClick={onBack} ariaLabel={backAriaLabel}>
        {backIcon}
      </BookingFlowPillButton>
      {(title || subtitle) && (
        <div style={{ position: 'absolute', left: 68, right: 68, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
          {title && <div role={titleHeadingLevel ? 'heading' : undefined} aria-level={titleHeadingLevel} style={{ ...text.callout1, color: 'var(--color-on-surface)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
          {subtitle && <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
      )}
      {trailing ?? <div style={{ width: 44 }} />}
    </div>
  )
}

export function BookingFlowPillButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
      <button type="button" onClick={onClick} aria-label={ariaLabel} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)' }}>
        {children}
      </button>
    </div>
  )
}

interface BookingFlowBottomButtonProps {
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  icon?: ReactNode
}

export function BookingFlowBottomButton({ disabled, onClick, children, icon }: BookingFlowBottomButtonProps) {
  const enabled = !disabled
  return (
    <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 20,
          border: 'none',
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          ...text.callout1,
          cursor: enabled ? 'pointer' : 'default',
          background: enabled ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
          color: enabled ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
        }}
      >
        {icon}
        {children}
      </button>
    </div>
  )
}

export function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
