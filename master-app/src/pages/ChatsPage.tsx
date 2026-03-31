import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'

export default function ChatsPage() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Клиенты" back={false} />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600 }}>CRM-бот</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 2 }}>
                Уведомления о записях и платежах
              </div>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
            Клиенты
          </div>
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 24 }}>
            Здесь будут отображаться клиенты,<br />которые делали записи
          </div>
        </div>
      </div>
    </div>
  )
}
