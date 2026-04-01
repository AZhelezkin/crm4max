import BottomNav from '@client/components/BottomNav'

export default function MessagesPage() {
  return (
    <div style={{ minHeight: '100dvh', background: '#000', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Сообщения</h1>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60dvh', color: '#8E8E93' }}>
        Нет сообщений
      </div>
      <BottomNav />
    </div>
  )
}
