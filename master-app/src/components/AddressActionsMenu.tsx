import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

export type AddressMenuPosition = { left: number; top?: number; bottom?: number }

export function addressMenuPosition(event: React.MouseEvent<HTMLElement>): AddressMenuPosition {
  const menuWidth = 220
  const edge = 16
  const x = event.clientX || event.currentTarget.getBoundingClientRect().right
  const y = event.clientY || event.currentTarget.getBoundingClientRect().bottom
  const left = Math.min(Math.max(edge, x), window.innerWidth - menuWidth - edge)
  const openUp = window.innerHeight - y < 140 && y > 140
  return openUp
    ? { left, bottom: window.innerHeight - y + 8 }
    : { left, top: y + 8 }
}

export default function AddressActionsMenu({ position, onClose, onCopy, onOpenMaps }: {
  position: AddressMenuPosition
  onClose: () => void
  onCopy: () => void
  onOpenMaps: () => void
}) {
  const items = [
    { label: 'Скопировать', icon: <CopyIcon />, onClick: onCopy },
    { label: 'Открыть в картах', icon: <LocationIcon />, onClick: onOpenMaps },
  ]

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div role="menu" onClick={(event) => event.stopPropagation()} style={{
        position: 'fixed', left: position.left,
        ...(position.top !== undefined ? { top: position.top } : { bottom: position.bottom }),
        minWidth: 220, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-surface)', borderRadius: 16, padding: '12px 20px',
        boxShadow: '0 16px 16px -4px rgba(12,12,13,0.10), 0 4px 2px -4px rgba(12,12,13,0.05)',
      }}>
        {items.map((item, index) => (
          <div key={item.label}>
            {index > 0 && <div style={{ height: 8, display: 'flex', alignItems: 'center' }}><div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} /></div>}
            <button type="button" role="menuitem" onClick={item.onClick} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--color-on-surface)',
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

function LocationIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" stroke="currentColor" strokeWidth="1.5"/><path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5"/></svg>
}

function CopyIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16 12.9V17.1C16 20.6 14.6 22 11.1 22H6.9C3.4 22 2 20.6 2 17.1V12.9C2 9.4 3.4 8 6.9 8H11.1C14.6 8 16 9.4 16 12.9Z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8V6.9C8 3.4 9.4 2 12.9 2H17.1C20.6 2 22 3.4 22 6.9V11.1C22 14.6 20.6 16 17.1 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
