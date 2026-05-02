import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import type { Booking } from '@/types'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { text } from '@/styles/typography'

dayjs.locale('ru')

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking]     = useState<Booking | null>(null)
  const [reschedule, setReschedule] = useState(false)
  const [newDate, setNewDate]     = useState('')
  const [newTime, setNewTime]     = useState('')
  const [slots, setSlots]         = useState<string[]>([])

  useEffect(() => {
    if (id) bookingsApi.getById(id).then(setBooking).catch(() => {})
  }, [id])

  useEffect(() => {
    if (reschedule && newDate && booking) {
      mastersApi.getSlots(booking.master.id, newDate, booking.service.id)
        .then(setSlots)
        .catch(() => setSlots([]))
    }
  }, [reschedule, newDate, booking])

  if (!booking) return null

  const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  const handleConfirmPayment = async () => {
    const updated = await bookingsApi.confirmPayment(booking.id)
    setBooking(updated)
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    const updated = await bookingsApi.reschedule(booking.id, { date: newDate, time: newTime })
    setBooking(updated)
    setReschedule(false)
  }

  const handleCancel = async () => {
    const updated = await bookingsApi.cancel(booking.id)
    setBooking(updated)
    navigate('/bookings')
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <PageHeader title="Запись" />

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card>
          <Row label="Клиент"   value={booking.client.name} />
          <Row label="Услуга"   value={booking.service.name} />
          <Row label="Дата"     value={dayjs(booking.date).format('D MMMM (ddd)')} />
          <Row label="Время"    value={booking.time} />
          <Row label="Стоимость" value={(booking.service.price / 100).toLocaleString('ru-RU') + ' ₽'} />
          <Row label="Оплата"   value={PAYMENT_LABELS[booking.paymentStatus]} last />
        </Card>

        {canAct && (
          <>
            {booking.paymentStatus !== 'PAID' && (
              <Button onClick={handleConfirmPayment} fullWidth>
                Подтвердить оплату
              </Button>
            )}

            {!reschedule ? (
              <Button variant="secondary" onClick={() => setReschedule(true)} fullWidth>
                Перенести
              </Button>
            ) : (
              <Card>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Выберите новую дату и время</div>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--color-divider-low)', marginBottom: 12 }}
                />
                {slots.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setNewTime(s)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, ...text.action,
                          background: newTime === s ? 'var(--color-primary-surface)' : 'var(--color-background)',
                          color: newTime === s ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                          border: '1px solid var(--color-divider-low)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={handleReschedule} fullWidth disabled={!newDate || !newTime}>Подтвердить</Button>
                  <Button variant="secondary" onClick={() => setReschedule(false)} fullWidth>Отмена</Button>
                </div>
              </Card>
            )}

            <Button variant="danger" onClick={handleCancel} fullWidth>
              Отменить запись
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID:       'Не оплачено',
  DEPOSIT_PAID: 'Депозит внесён',
  PAID:         'Оплачено',
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid var(--color-divider-low)',
    }}>
      <span style={{ color: 'var(--color-on-surface-secondary)', ...text.action }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
