import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

export default function BottomToast({ message }: { message: string | null }) {
  if (!message) return null

  return createPortal(
    <div role="status" style={{
      position: 'fixed', left: 16, right: 16, bottom: 'calc(104px + env(safe-area-inset-bottom))', zIndex: 1100,
      background: 'var(--color-on-surface)', color: 'var(--color-surface)',
      borderRadius: 16, padding: '12px 16px', textAlign: 'center', ...text.caption1,
    }}>
      {message}
    </div>,
    document.body,
  )
}
