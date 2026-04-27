import BottomNav from '@client/components/BottomNav'
import { text } from '@/styles/typography'

export default function MessagesPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-background)', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={text.titleSmall}>Сообщения</h1>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60dvh', color: 'var(--color-on-surface-secondary)' }}>
        Нет сообщений
      </div>
      <BottomNav />
    </div>
  )
}
