import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@client/api/bookings.api'
import { mastersApi } from '@client/api/masters.api'
import type { Booking } from '@client/types'
import bridge from '@vkontakte/vk-bridge'

dayjs.locale('ru')

const PAYMENT_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  UNPAID:       { label: 'НЕ ОПЛАЧЕНО', bg: 'var(--color-error-surface-lite)',  color: 'var(--color-error-surface-accented)' },
  DEPOSIT_PAID: { label: 'ДЕПОЗИТ',     bg: 'var(--color-warning-surface-lite)', color: 'var(--color-warning-surface-accented)' },
  PAID:         { label: 'ОПЛАЧЕНО',    bg: 'var(--color-success-surface-lite)', color: 'var(--color-success-surface-accented)' },
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [reschedule, setReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [showCancelSheet, setShowCancelSheet] = useState(false)

  useEffect(() => {
    if (id) bookingsApi.getById(id).then(setBooking).catch(() => {})
  }, [id])

  useEffect(() => {
    if (reschedule && newDate && booking) {
      mastersApi.getSlots(booking.master.id, newDate, booking.service.id)
        .then(setSlots).catch(() => setSlots([]))
    }
  }, [reschedule, newDate, booking])

  if (!booking) return null

  const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const badge = PAYMENT_BADGE[booking.paymentStatus]
  const formattedDate = dayjs(booking.date).format('D MMMM, dddd')

  const handleWriteToMaster = () => {
    bridge.send('VKWebAppOpenApp', { app_id: Number(import.meta.env.VITE_VK_APP_ID) }).catch(() => {})
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    const updated = await bookingsApi.reschedule(booking.id, { date: newDate, time: newTime })
    setBooking(updated)
    setReschedule(false)
  }

  const handleCancel = async () => {
    await bookingsApi.cancel(booking.id)
    navigate('/my-bookings')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--color-success-surface-lite)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="var(--color-success-surface-accented)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Вы записаны!</div>
            <div style={{ color: 'var(--color-on-surface-secondary)', fontSize: 13 }}>Не опаздывайте 😉</div>
          </div>
        </div>
        <button onClick={() => navigate('/my-bookings')} style={{ background: 'none', color: 'var(--color-on-surface-secondary)', fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--color-divider-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>
              {booking.master.photo
                ? <img src={booking.master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{booking.master.name}</div>
            </div>
            <div style={{ color: 'var(--color-warning-surface-accented)', fontWeight: 600, fontSize: 14 }}>★</div>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{booking.service.name}</div>
          {booking.service.description && (
            <div style={{ color: 'var(--color-on-surface-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
              {booking.service.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600 }}>
              {(booking.service.price / 100).toLocaleString('ru-RU')} ₽
            </span>
            <span style={{ background: badge.bg, color: badge.color, borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
              {badge.label}
            </span>
          </div>
        </div>

        <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600 }}>{formattedDate}</div>
          <div style={{ color: 'var(--color-on-surface-secondary)', fontSize: 13 }}>Дата</div>
        </div>

        <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600 }}>{booking.time}</div>
          <div style={{ color: 'var(--color-on-surface-secondary)', fontSize: 13 }}>Напомним за 1 час</div>
        </div>

        {reschedule && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Выберите новое время</div>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={dayjs().format('YYYY-MM-DD')}
              style={{
                width: '100%', padding: 12, borderRadius: 10,
                border: '1px solid var(--color-divider-low)', marginBottom: 12, fontSize: 15,
                background: 'var(--color-divider-low)', color: 'var(--color-on-primary-surface)',
              }}
            />
            {slots.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNewTime(s)}
                    style={{
                      padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 500,
                      background: newTime === s ? 'var(--color-primary-surface)' : 'var(--color-divider-low)', color: 'var(--color-on-primary-surface)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReschedule}
                disabled={!newDate || !newTime}
                style={{
                  flex: 1, padding: 12, borderRadius: 10,
                  background: newDate && newTime ? 'var(--color-primary-surface)' : 'var(--color-divider-low)',
                  color: 'var(--color-on-primary-surface)', fontWeight: 600,
                }}
              >
                Подтвердить
              </button>
              <button
                onClick={() => setReschedule(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: 'var(--color-divider-low)', color: 'var(--color-on-primary-surface)', fontWeight: 600 }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {canAct && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setReschedule(true)}
              style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3" stroke="var(--color-primary-surface)" strokeWidth="2" />
                <path d="M3 9h18" stroke="var(--color-primary-surface)" strokeWidth="2" />
                <path d="M8 2v4M16 2v4" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 20h9" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" />
                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={handleWriteToMaster}
              style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2z" stroke="var(--color-primary-surface)" strokeWidth="2" fill="none" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setShowCancelSheet(true)}
              style={{ background: 'var(--color-surface)', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--color-error-surface-accented)" strokeWidth="2" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="var(--color-error-surface-accented)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <button
            style={{
              width: '100%', padding: 16, borderRadius: 14,
              background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)', fontWeight: 600, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 32,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="6" width="20" height="14" rx="3" stroke="var(--color-on-primary-surface)" strokeWidth="2" />
              <path d="M2 10h20" stroke="var(--color-on-primary-surface)" strokeWidth="2" />
            </svg>
            Оплатить
          </button>
        </div>
      )}

      {showCancelSheet && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCancelSheet(false)}
        >
          <div
            style={{ background: 'var(--color-surface)', borderRadius: '20px 20px 0 0', width: '100%', padding: '20px 16px 32px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Правила отмены</h2>
            <p style={{ color: 'var(--color-on-surface-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              При отмене записи менее чем за 24 часа депозит не возвращается.
              При отмене за 24 часа и более — депозит возвращается в полном объёме.
            </p>
            <button
              onClick={handleCancel}
              style={{
                width: '100%', padding: 15, borderRadius: 14,
                background: 'var(--color-error-surface-accented)', color: 'var(--color-on-primary-surface)', fontWeight: 600, fontSize: 16, marginBottom: 8,
              }}
            >
              Отменить запись
            </button>
            <button
              onClick={() => setShowCancelSheet(false)}
              style={{ width: '100%', padding: 15, borderRadius: 14, background: 'var(--color-divider-low)', color: 'var(--color-on-primary-surface)', fontWeight: 600, fontSize: 16 }}
            >
              Назад
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
