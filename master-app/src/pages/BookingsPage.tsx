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

        {view === 'calendar' ? (
          <CalendarView bookings={bookings} onBookingClick={(id) => navigate(`/bookings/${id}`)} />
        ) : (
          <>
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
          </>
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

function CalendarView({ bookings, onBookingClick }: { bookings: Booking[]; onBookingClick: (id: string) => void }) {
  const [current, setCurrent] = useState(dayjs())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const startOfMonth = current.startOf('month')
  const daysInMonth  = current.daysInMonth()
  // ISO: 1=Пн, 7=Вс — сдвиг стартового дня
  const startDow = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1

  const bookingsByDate = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {})

  const selectedBookings = selectedDate ? (bookingsByDate[selectedDate] ?? []) : []

  return (
    <div>
      {/* Заголовок месяца */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setCurrent(c => c.subtract(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-primary)', padding: '4px 8px' }}
        >‹</button>
        <span style={{ fontWeight: 600, fontSize: 16, textTransform: 'capitalize' }}>
          {current.format('MMMM YYYY')}
        </span>
        <button
          onClick={() => setCurrent(c => c.add(1, 'month'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-primary)', padding: '4px 8px' }}
        >›</button>
      </div>

      {/* Дни недели */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-secondary)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Ячейки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day  = i + 1
          const date = current.date(day).format('YYYY-MM-DD')
          const isToday    = date === dayjs().format('YYYY-MM-DD')
          const isSelected = date === selectedDate
          const hasBkg     = !!bookingsByDate[date]
          const count      = bookingsByDate[date]?.filter(b => b.status !== 'CANCELLED').length ?? 0

          return (
            <div
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                cursor: 'pointer',
                background: isSelected
                  ? 'var(--color-primary)'
                  : isToday
                    ? 'var(--color-card2)'
                    : 'transparent',
                border: isToday && !isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                position: 'relative',
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: isToday || isSelected ? 600 : 400,
                color: isSelected ? '#fff' : 'var(--color-text)',
              }}>{day}</span>
              {count > 0 && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%', marginTop: 1,
                  background: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-primary)',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Записи выбранного дня */}
      {selectedDate && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
            {dayjs(selectedDate).format('D MMMM')}
          </div>
          {selectedBookings.length === 0
            ? <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>Нет записей</div>
            : selectedBookings.map(b => (
                <BookingCard key={b.id} booking={b} onClick={() => onBookingClick(b.id)} />
              ))
          }
        </div>
      )}
    </div>
  )
}
