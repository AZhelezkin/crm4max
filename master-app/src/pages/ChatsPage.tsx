import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { text } from '@/styles/typography'

export default function ChatsPage() {
  return (
    <div style={{ minHeight: '100dvh' }}>
      <PageHeader title="Клиенты" back={false} />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600 }}>CRM-бот</div>
              <div style={{ color: 'var(--color-on-surface-secondary)', ...text.action, marginTop: 2 }}>
                Уведомления о записях и платежах
              </div>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 8 }}>
          <div style={{ ...text.footnoteStrong, color: 'var(--color-on-surface-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
            Клиенты
          </div>
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 24 }}>
            Здесь будут отображаться клиенты,<br />которые делали записи
          </div>
        </div>
      </div>
    </div>
  )
}
