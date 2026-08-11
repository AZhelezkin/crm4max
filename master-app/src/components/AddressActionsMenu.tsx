import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

interface AddressActionsMenuProps {
  onClose: () => void
  onCopy: () => void
  onOpenMaps: () => void
}

export default function AddressActionsMenu({ onClose, onCopy, onOpenMaps }: AddressActionsMenuProps) {
  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', padding: 16 }}
    >
      <div
        role="menu"
        onClick={(event) => event.stopPropagation()}
        style={{ width: '100%', background: 'var(--color-surface)', borderRadius: 16, padding: '12px 20px' }}
      >
        <button type="button" role="menuitem" onClick={onCopy} style={itemStyle}>Скопировать</button>
        <div style={{ height: 1, background: 'var(--color-divider-low)' }} />
        <button type="button" role="menuitem" onClick={onOpenMaps} style={itemStyle}>Открыть в картах</button>
      </div>
    </div>,
    document.body,
  )
}

const itemStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 0',
  border: 'none',
  background: 'none',
  color: 'var(--color-on-surface)',
  textAlign: 'left',
  cursor: 'pointer',
  ...text.body2,
}
