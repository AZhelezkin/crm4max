import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@/api/bookings.api'
import type { Booking } from '@/types'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import Button from '@/components/Button'

dayjs.locale('ru')

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Ожидает',
  CONFIRMED: 'Подтверждена',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:   '#FF9500',
  CONFIRMED: 'var(--color-primary)',
  COMPLETED: 'var(--color-success)',
  CANCELLED: 'var(--color-text-secondary)',
}

export default function BookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [view, setView]         = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(() => {})
  }, [])

  const upcoming  = bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.date >= dayjs().format('YYYY-MM-DD'))
  const past      = bookings.filter((b) => b.status === 'COMPLETED' || b.date < dayjs().format('YYYY-MM-DD'))

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Записи" back={false} />

      <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
        {(['list', 'calendar'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
              background: view === v ? 'var(--color-primary)' : 'var(--color-card)',
              color: view === v ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {v === 'list' ? 'Список' : 'Календарь'}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="secondary" onClick={() => navigate('/bookings/new')} fullWidth>
          + Создать запись
        </Button>

        {upcoming.length > 0 && (
          <Section title="Предстоящие">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />)}
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Прошлые">
            {past.map((b) => <BookingCard key={b.id} booking={b} onClick={() => navigate(`/bookings/${b.id}`)} />)}
          </Section>
        )}

        {bookings.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>
            Нет записей
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function BookingCard({ booking: b, onClick }: { booking: Booking; onClick: () => void }) {
  return (
    <Card onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{b.client.name}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 2 }}>
            {b.service.name} · {dayjs(b.date).format('D MMM')} в {b.time}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: STATUS_COLORS[b.status] }}>
          {STATUS_LABELS[b.status]}
        </span>
      </div>
    </Card>
  )
}
