import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@/api/bookings.api'
import type { Booking } from '@/types'
import { discountedPrice, formatPrice } from '@/types'
import { text } from '@/styles/typography'
import ConfirmDialog from '@/components/ConfirmDialog'
import { openAddToCalendar } from '@/lib/calendar'

dayjs.locale('ru')

const PAYMENT_BADGE: Record<Booking['paymentStatus'], { label: string; bg: string; color: string }> = {
  UNPAID: { label: 'НЕ ОПЛАЧЕНО', bg: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)' },
  DEPOSIT_PAID: { label: 'ДЕПОЗИТ', bg: 'var(--color-warning-surface-lite)', color: 'var(--color-on-warning-surface-lite)' },
  PAID: { label: 'ОПЛАЧЕНО', bg: 'var(--color-success-surface-lite)', color: 'var(--color-on-success-surface-lite)' },
}

const VIOLET_GRADIENT = 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
  }
  return phone
}

const listItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--color-surface-transparent)',
  borderRadius: 20,
  padding: '16px 20px',
  border: 'none',
  textAlign: 'left',
}

const chipStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'var(--color-surface-transparent)',
  borderRadius: 18,
  padding: '12px 8px',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-active-element)',
}

// Карточка записи (как «успешная запись» / кабинет клиента, макет 8746-41315).
// Открывается тапом по записи в «Расписании» (/bookings/:id).
export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (id) bookingsApi.getById(id).then(setBooking).catch(() => {})
  }, [id])

  if (!booking) return null

  const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const paid = booking.paymentStatus === 'PAID'
  const badge = PAYMENT_BADGE[booking.paymentStatus]
  // Для услуги «Прочее» цена индивидуальная (booking.price, ввёл мастер при записи).
  const price = booking.price ?? discountedPrice(booking.service.price, booking.service.discountPercent) ?? booking.service.price
  const addressText = booking.clientAddress || booking.master.location || ''
  const addressSubtitle = booking.clientAddress ? 'Адрес выезда' : 'Адрес мастера'

  const handleOpenAddress = () => {
    if (!addressText) return
    const url = !booking.clientAddress && booking.master.lat && booking.master.lng
      ? `geo:${booking.master.lat},${booking.master.lng}?q=${booking.master.lat},${booking.master.lng}(${encodeURIComponent(booking.master.name)})`
      : `geo:0,0?q=${encodeURIComponent(addressText)}`
    window.WebApp?.openLink?.(url)
  }

  const handleConfirmPayment = async () => {
    if (busy) return
    setBusy(true)
    try { setBooking(await bookingsApi.confirmPayment(booking.id)) } finally { setBusy(false) }
  }

  const handleCancel = async () => {
    if (busy) return
    setBusy(true)
    try {
      await bookingsApi.cancel(booking.id)
      navigate('/bookings')
    } catch { setBusy(false) }
  }

  const handleAddToCalendar = () => {
    openAddToCalendar({
      bookingId: booking.id,
      title: booking.service.name,
      date: booking.date,
      time: booking.time,
      durationMin: booking.service.duration,
      location: addressText,
    })
  }

  // Перенос (изменение даты, затем времени) — флоу CreateBookingPage с rescheduleId.
  const handleReschedule = () =>
    navigate('/bookings/new', { state: { rescheduleId: booking.id, serviceId: booking.service.id } })

  // Изменить только время — сразу шаг времени, дата записи сохраняется.
  const handleEditTime = () =>
    navigate('/bookings/new', { state: { rescheduleId: booking.id, serviceId: booking.service.id, editTime: true, date: booking.date } })

  return (
    <div style={{ minHeight: '100dvh' }}>
      {/* Шапка: назад + «Запись» */}
      <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', padding: '6px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
          <button type="button" aria-label="Назад" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', color: 'var(--color-on-surface)' }}>
            <ArrowLeftIcon />
          </button>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', ...text.callout1, color: 'var(--color-on-surface)' }}>Запись</div>
      </div>

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Клиент */}
        <div style={listItemStyle}>
          <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, overflow: 'hidden', background: booking.client.photo ? 'var(--color-surface)' : VIOLET_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {booking.client.photo
              ? <img src={booking.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ ...text.label3Caps, color: 'var(--color-on-surface)' }}>{initials(booking.client.name)}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.client.name}</div>
            {booking.client.phone && (
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatPhone(booking.client.phone)}</div>
            )}
          </div>
          <UserSquareIcon />
        </div>

        {/* Адрес — только выезд к клиенту. Свой адрес мастеру не показываем. */}
        {booking.clientAddress && (
          <button type="button" onClick={handleOpenAddress} aria-label="Открыть на карте" style={{ ...listItemStyle, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', wordBreak: 'break-word' }}>{addressText}</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{addressSubtitle}</div>
            </div>
            <LocationIcon />
          </button>
        )}

        {/* Услуга + статус оплаты */}
        <div style={listItemStyle}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.service.name}</div>
              {booking.service.description && (
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{booking.service.description}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(price)}</span>
              <span style={{ ...text.label2Caps, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', borderRadius: 8, background: badge.bg, color: badge.color }}>{badge.label}</span>
            </div>
          </div>
        </div>

        {/* Дата — тап открывает перенос (только для активной записи). */}
        <button type="button" onClick={handleReschedule} disabled={!canAct} aria-label="Изменить дату" style={{ ...listItemStyle, cursor: canAct ? 'pointer' : 'default' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{dayjs(booking.date).format('D MMMM, dd')}</div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
          </div>
          {canAct && <EditIcon />}
        </button>

        {/* Время — тап открывает выбор времени, дата прежняя (только для активной записи). */}
        <button type="button" onClick={handleEditTime} disabled={!canAct} aria-label="Изменить время" style={{ ...listItemStyle, cursor: canAct ? 'pointer' : 'default' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{booking.time}</div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{booking.remind ? 'Напомним за 1 час' : 'Без напоминания'}</div>
          </div>
          {canAct && <EditIcon />}
        </button>

        {!canAct && (
          <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 8 }}>
            {booking.status === 'CANCELLED' ? 'Запись отменена' : 'Запись завершена'}
          </div>
        )}
      </div>

      {/* Действия (для активной записи) — в конце контента, не прибиты к низу */}
      {canAct && (
        <div style={{ padding: '16px 12px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!paid && (
            <button type="button" disabled={busy} onClick={() => { void handleConfirmPayment() }} style={{ width: '100%', height: 60, borderRadius: 20, border: 'none', cursor: busy ? 'default' : 'pointer', ...text.callout1, background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)' }}>
              Подтвердить оплату
            </button>
          )}
          <button type="button" onClick={handleAddToCalendar} style={{ ...chipStyle, width: '100%' }}>
            <CalendarIcon />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Добавить в календарь</span>
          </button>
          <div style={{ display: 'flex', gap: 4, width: '100%' }}>
            <button type="button" onClick={handleReschedule} style={{ ...chipStyle, flex: 1, minWidth: 0 }}>
              <RepeatIcon />
              <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Перенести</span>
            </button>
            <button type="button" disabled style={{ ...chipStyle, flex: 1, minWidth: 0, cursor: 'default', color: 'var(--color-interactive-element-muted)' }}>
              <MessageTextIcon />
              <span style={{ ...text.caption2, color: 'var(--color-interactive-element-muted)' }}>Чат</span>
            </button>
            <button type="button" onClick={() => setConfirmCancel(true)} style={{ ...chipStyle, flex: 1, minWidth: 0, color: 'var(--color-error-surface-accented)' }}>
              <CloseCircleIcon />
              <span style={{ ...text.caption2, color: 'var(--color-error-surface-accented)' }}>Отменить</span>
            </button>
          </div>
        </div>
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="Отменить запись"
          message="Вы действительно хотите отменить запись? Клиент получит уведомление."
          confirmLabel="Отменить запись"
          cancelLabel="Назад"
          onConfirm={() => { setConfirmCancel(false); void handleCancel() }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserSquareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12.0933 14.4133C11.5067 14.5867 10.8133 14.6667 10 14.6667H6C5.18667 14.6667 4.49333 14.5867 3.90667 14.4133C4.05333 12.68 5.83333 11.3133 8 11.3133C10.1667 11.3133 11.9467 12.68 12.0933 14.4133Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 1.33333H6C2.66667 1.33333 1.33333 2.66667 1.33333 6V10C1.33333 12.52 2.09333 13.9 3.90667 14.4133C4.05333 12.68 5.83333 11.3133 8 11.3133C10.1667 11.3133 11.9467 12.68 12.0933 14.4133C13.9067 13.9 14.6667 12.52 14.6667 10V6C14.6667 2.66667 13.3333 1.33333 10 1.33333ZM8 9.44666C6.68 9.44666 5.61333 8.37334 5.61333 7.05334C5.61333 5.73334 6.68 4.66667 8 4.66667C9.32 4.66667 10.3867 5.73334 10.3867 7.05334C10.3867 8.37334 9.32 9.44666 8 9.44666Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 8.95C9.149 8.95 10.08 8.019 10.08 6.87C10.08 5.722 9.149 4.79 8 4.79C6.851 4.79 5.92 5.722 5.92 6.87C5.92 8.019 6.851 8.95 8 8.95Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5" />
      <path d="M2.413 5.66C3.727 -0.107 12.28 -0.1 13.587 5.667C14.353 9.054 12.247 11.92 10.4 13.694C9.06 14.987 6.94 14.987 5.593 13.694C3.753 11.92 1.647 9.047 2.413 5.66Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2.83 14.32V7.6c0-2.94 2.4-5.34 5.34-5.34h7.66" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.7 4.43 2.13-2.13L13.7.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.17 9.68v6.72c0 2.94-2.4 5.34-5.34 5.34H8.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.3 19.57 8.17 21.7l2.13 2.13" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MessageTextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8c-4 0-6-1-6-6V8c0-4 2-6 6-6h8c4 0 6 2 6 6v5c0 4-2 6-6 6h-.5c-.31 0-.61.15-.8.4l-1.5 2c-.66.88-1.74.88-2.4 0l-1.5-2c-.16-.22-.53-.4-.8-.4Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h10M7 13h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.17 14.83 14.83 9.17M14.83 14.83 9.17 9.17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6947 13.7H15.7037" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9955 13.7H12.0045" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.29431 13.7H8.30329" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
