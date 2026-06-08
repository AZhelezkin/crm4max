import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

export type ExportToastData = { kind: 'success' | 'error'; text: string } | null

// Тост-уведомление экспорта xlsx (общий для экранов «Доход» и дня).
export function ExportToast({ toast, onClose }: { toast: ExportToastData; onClose: () => void }) {
  if (!toast) return null
  return createPortal(<ToastView toast={toast} onClose={onClose} />, document.body)
}

function ToastView({ toast, onClose }: { toast: { kind: 'success' | 'error'; text: string }; onClose: () => void }) {
  const isSuccess = toast.kind === 'success'
  const accent = isSuccess ? 'var(--color-success-surface-accented)' : 'var(--color-error-surface-accented)'
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: 12,
        right: 12,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-divider-low)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        animation: 'crm4max-toast-in 0.22s ease-out',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: '50%',
          background: `${accent}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          {isSuccess ? (
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <path d="M12 8v5" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.2" fill={accent} />
              <circle cx="12" cy="12" r="9" stroke={accent} strokeWidth="2" />
            </>
          )}
        </svg>
      </div>
      <div style={{ flex: 1, ...text.action, lineHeight: 1.35, color: 'var(--color-on-surface)' }}>{toast.text}</div>
      <style>{`@keyframes crm4max-toast-in { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
