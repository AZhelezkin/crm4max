import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

export type BookingActionsPosition = { right: number; top?: number; bottom?: number }
export type BookingAction = { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }

export function bookingActionsPosition(element: HTMLElement): BookingActionsPosition {
  const rect = element.getBoundingClientRect()
  const right = Math.max(16, window.innerWidth - rect.right)
  const spaceBelow = window.innerHeight - rect.bottom
  return spaceBelow >= 280
    ? { right, top: rect.bottom + 8 }
    : { right, bottom: window.innerHeight - rect.top + 8 }
}

export function BookingActionsButton({ onClick }: { onClick: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', height: 60, borderRadius: 20, border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: 'var(--color-chat-bg-elements)', color: 'var(--color-interactive-element-accented)',
      ...text.callout1,
    }}>
      <DocumentIcon />
      Действия
    </button>
  )
}

export function BookingActionsMenu({ pos, busy = false, items, onClose }: {
  pos: BookingActionsPosition
  busy?: boolean
  items: BookingAction[]
  onClose: () => void
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const close = () => onCloseRef.current()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [])

  return createPortal(
    <div onClick={onClose} onWheel={onClose} onTouchMove={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div role="menu" aria-label="Действия с записью" onClick={(event) => event.stopPropagation()} style={{
        position: 'fixed', right: pos.right,
        ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
        minWidth: 220, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-surface)', borderRadius: 16, padding: '12px 20px',
        boxShadow: '0 16px 16px -4px rgba(12,12,13,0.10), 0 4px 2px -4px rgba(12,12,13,0.05)',
      }}>
        {items.map((item, index) => (
          <div key={item.label}>
            {index > 0 && <div style={{ height: 8, display: 'flex', alignItems: 'center' }}><div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} /></div>}
            <button role="menuitem" type="button" disabled={busy} onClick={item.onClick} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              background: 'none', border: 'none', textAlign: 'left',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
              color: item.danger ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)',
            }}>
              <span style={{ flex: 1, minWidth: 0, ...text.body2 }}>{item.label}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex' }}>{item.icon}</span>
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

function DocumentIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.75 9H8.25M15.75 15H8.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
