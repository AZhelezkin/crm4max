import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

interface Props {
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string | null
  /** true (по умолчанию) — деструктивное действие, кнопка красная; false — primary. */
  danger?: boolean
  /** Блокирует повторное подтверждение и закрытие, пока действие выполняется. */
  busy?: boolean
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
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const messageId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => { previousFocus?.focus() }
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const buttons = [confirmRef.current, cancelRef.current].filter(
      (button): button is HTMLButtonElement => button !== null && !button.disabled,
    )
    if (buttons.length === 0) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      onClick={() => { if (!busy) onCancel() }}
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
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        aria-busy={busy || undefined}
        onKeyDown={handleKeyDown}
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
        <div id={titleId} style={{ padding: '0 8px 8px', ...text.h4, color: 'var(--color-on-surface)' }}>
          {title}
        </div>
        <div id={messageId} style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface)' }}>{message}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 22,
              border: 'none',
              cursor: busy ? 'default' : 'pointer',
              background: danger ? 'var(--color-error-surface-accented)' : 'var(--color-primary-surface)',
              ...text.callout1,
              color: 'var(--color-on-primary-surface)',
            }}
          >
            {confirmLabel}
          </button>
          {cancelLabel && (
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 22,
                border: 'none',
                cursor: busy ? 'default' : 'pointer',
                background: 'var(--color-background)',
                ...text.callout1,
                color: 'var(--color-on-surface)',
              }}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
