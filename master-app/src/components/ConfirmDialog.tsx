import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

interface Props {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  /** true (по умолчанию) — деструктивное действие, кнопка красная; false — primary. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Модалка подтверждения (как при удалении услуги/категории/клиента).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Отмена',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 329,
          boxSizing: 'border-box',
          background: 'var(--color-surface)',
          borderRadius: 24,
          padding: '20px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 8px 8px', fontSize: 20, lineHeight: '24px', fontWeight: 700, letterSpacing: -0.4, color: 'var(--color-on-surface)' }}>
          {title}
        </div>
        <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface)' }}>{message}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 22,
              border: 'none',
              cursor: 'pointer',
              background: danger ? 'var(--color-error-surface-accented)' : 'var(--color-primary-surface)',
              ...text.callout1,
              color: 'var(--color-on-primary-surface)',
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 22,
              border: 'none',
              cursor: 'pointer',
              background: 'var(--color-background)',
              ...text.callout1,
              color: 'var(--color-on-surface)',
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
