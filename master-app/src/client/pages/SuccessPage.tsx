import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Booking } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import { text } from '@/styles/typography'
import MasterListItemSkeleton from '@client/components/MasterListItemSkeleton'
import AddressListItemSkeleton from '@client/components/AddressListItemSkeleton'

dayjs.locale('ru')

/* Маппинг paymentStatus → бейдж (label / bg / text-color, токены MAX UI). */
const PAYMENT_BADGE: Record<Booking['paymentStatus'], { label: string; bg: string; color: string }> = {
  UNPAID:       { label: 'НЕ ОПЛАЧЕНО', bg: 'var(--color-error-surface-lite)',   color: 'var(--color-on-error-surface-lite)' },
  DEPOSIT_PAID: { label: 'ДЕПОЗИТ',     bg: 'var(--color-warning-surface-lite)', color: 'var(--color-on-warning-surface-lite)' },
  PAID:         { label: 'ОПЛАЧЕНО',    bg: 'var(--color-success-surface-lite)', color: 'var(--color-on-success-surface-lite)' },
}

/* ── Tick-circle (vuesax/bold/tick-circle 24×24, fill=onPrimarySurface) ────── */

function IcoTickCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm-1.13-7.83 4.95-4.95a.749.749 0 0 0-.53-1.28.74.74 0 0 0-.53.22l-4.42 4.42-1.62-1.62a.754.754 0 0 0-1.06 0 .749.749 0 0 0 0 1.06l2.15 2.15c.15.15.34.22.53.22.19 0 .38-.07.53-.22Z"
        fill="var(--color-on-primary-surface)"
      />
    </svg>
  )
}

/* ── Edit-2 16×16 (vuesax/linear/edit-2, точные path Figma 8175:13372) ─────── */

function IcoEdit2() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Chip icons (vuesax/linear, 24×24, stroke=currentColor) ───────────────── */

function IcoRepeat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2.83 14.32V7.6c0-2.94 2.4-5.34 5.34-5.34h7.66" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m13.7 4.43 2.13-2.13L13.7.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21.17 9.68v6.72c0 2.94-2.4 5.34-5.34 5.34H8.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.3 19.57 8.17 21.7l2.13 2.13" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoMessageText() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8c-4 0-6-1-6-6V8c0-4 2-6 6-6h8c4 0 6 2 6 6v5c0 4-2 6-6 6h-.5c-.31 0-.61.15-.8.4l-1.5 2c-.66.88-1.74.88-2.4 0l-1.5-2c-.16-.22-.53-.4-.8-.4Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8h10M7 13h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoCloseCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.17 14.83 14.83 9.17M14.83 14.83 9.17 9.17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function SuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id: string }>()
  const setMasterId = useBookingStore((s) => s.setMasterId)
  const setService = useBookingStore((s) => s.setService)
  const setDateTime = useBookingStore((s) => s.setDateTime)
  const resetStore = useBookingStore((s) => s.reset)

  // Источник bookingId: либо :id из URL (вход из списка /my-bookings/:id),
  // либо location.state.bookingId (после создания записи на /book/confirm).
  const stateBookingId = (location.state as { bookingId?: string } | null)?.bookingId
  const bookingId = params.id ?? stateBookingId
  const isPostBooking = !params.id  // /book/success — после создания

  const [booking, setBooking] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    bookingsApi.getById(bookingId).then(setBooking).catch(() => {})
  }, [bookingId])

  const handleClose = () => {
    if (isPostBooking) {
      resetStore()
      navigate('/')
    } else {
      navigate('/my-bookings')
    }
  }

  const handleReschedule = () => {
    // Перенос идёт через тот же flow, что и новая запись: load store → /book/calendar.
    // В post-booking режиме данные уже в store (из ConfirmPage); в view-режиме
    // подгружаем их из текущей записи.
    if (!isPostBooking && booking) {
      setMasterId(booking.master.id)
      setService(booking.service)
      setDateTime(booking.date, booking.time)
    }
    navigate('/book/calendar')
  }

  const handleChat = () => {
    if (window.WebApp?.openMaxLink) {
      window.WebApp.openMaxLink('https://max.ru/u/f9LHodD0cOIigfttbzyjUqKELI60m9aczxqqW1rkNwoQQg8IKRZa3afRH24')
    } else {
      navigate('/messages')
    }
  }

  const handleCancel = async () => {
    if (!bookingId || cancelling) return
    setCancelling(true)
    try {
      await bookingsApi.cancel(bookingId)
      if (isPostBooking) {
        resetStore()
        navigate('/')
      } else {
        navigate('/my-bookings')
      }
    } catch {
      setCancelling(false)
    }
  }

  if (!booking) {
    // Пока booking грузится — рендерим shell-каркас (toolbar + skeleton-карточки).
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 200 }}>
        <div style={{ height: 56 }} />
        <div style={{
          flex: 1, padding: '8px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <MasterListItemSkeleton />
          <AddressListItemSkeleton lines={2} />
        </div>
      </div>
    )
  }

  const { master, service, date, time, clientAddress, paymentStatus } = booking
  const remind = booking.remind ?? true
  const price = discountedPrice(service.price, service.discountPercent) ?? service.price
  const formattedDate = dayjs(date).format('D MMMM, dd')
  const badge = PAYMENT_BADGE[paymentStatus]
  const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 200 /* footer chips */ }}>

      {/* ── Toolbar (Figma 8534:15132). h=56, padding 6/12, gap 12, justify-between.
            Без back-кнопки: leading = icon-pill + title+subtitle, trailing = «Закрыть». */}
      <div style={{
        height: 56,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* iconWrapper: 44 slot, inside 24 icon в pill 44×44 padding 10, bg=greenVibrance gradient */}
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: 'linear-gradient(149.74deg, var(--color-grad-green-vibrance-0) 7.31%, var(--color-grad-green-vibrance-100) 91.96%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IcoTickCircle />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...text.callout1, color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Вы записаны!
            </div>
            <div style={{
              ...text.caption2, color: 'var(--color-on-surface-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Не опаздывайте
            </div>
          </div>
        </div>

        {/* Trailing «Закрыть» — pill h=44, padding 0/10, rx=22 */}
        <button
          onClick={handleClose}
          aria-label="Закрыть"
          style={{
            height: 44,
            padding: '0 10px',
            borderRadius: 22,
            background: 'var(--color-background)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
            Закрыть
          </span>
        </button>
      </div>

      {/* ── Form (Figma 8534:15122): padding 8/16, gap 8, w-full children. */}
      <div style={{
        flex: 1,
        padding: '8px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* listItem: мастер. Booking-include возвращает только базовые поля
            мастера (id/name/photo/location), без description/rating —
            в этой карточке оставляем только аватар + имя. */}
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            overflow: 'hidden',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}>
            {master.photo && (
              <img
                src={master.photo}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...text.callout1, color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {master.name}
            </div>
          </div>
        </div>

        {/* listItem: адрес — title (callout1 — выбранный адрес) + subtitle.
            clientAddress задан → выезд мастера, иначе адрес мастера. */}
        {(() => {
          const addressText = clientAddress || master?.location
          if (!addressText) return null
          const subtitle = clientAddress ? 'Мой адрес' : 'Адрес'
          return (
            <div style={{
              background: 'var(--color-surface-transparent)',
              borderRadius: 20,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...text.callout1, color: 'var(--color-on-surface)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {addressText}
                </div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
                  {subtitle}
                </div>
              </div>
            </div>
          )
        })()}

        {/* listItem: услуга — column gap=16, нижний row: price + tag «НЕ ОПЛАЧЕНО» */}
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{
                ...text.callout1, color: 'var(--color-on-surface)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {service.name}
              </div>
              {service.description && (
                <div style={{
                  ...text.caption2, color: 'var(--color-on-surface-secondary)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {service.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
                {formatPrice(price)}
              </span>
              {/* paymentStatus-badge: цвета из PAYMENT_BADGE (UNPAID/DEPOSIT_PAID/PAID). */}
              <span style={{
                ...text.label2Caps,
                display: 'inline-flex', alignItems: 'center',
                height: 30,
                padding: '0 8px',
                borderRadius: 6,
                background: badge.bg,
                color: badge.color,
              }}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* listItem: дата */}
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...text.callout1, color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {formattedDate}
            </div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              Дата
            </div>
          </div>
          <IcoEdit2 />
        </div>

        {/* listItem: время + remind */}
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...text.callout1, color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {time}
            </div>
            <div style={{
              ...text.caption2, color: 'var(--color-on-surface-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {remind ? 'Напомним за 1 час' : 'Без напоминания'}
            </div>
          </div>
          <IcoEdit2 />
        </div>

      </div>

      {/* ── Footer chips (Figma 8534:15134). bottom-fixed, padding 8/12/48.
            Группа из 3 чипов equal-width, gap=4. Скрываем для COMPLETED/CANCELLED. */}
      {canAct && (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px 48px',
        background: 'var(--color-background)',
      }}>
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {/* Chip: Перенести */}
          <button
            onClick={handleReschedule}
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--color-surface-transparent)',
              borderRadius: 18,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: 'none', cursor: 'pointer',
              color: 'var(--color-active-element)',
            }}
          >
            <IcoRepeat />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>
              Перенести
            </span>
          </button>

          {/* Chip: Чат */}
          <button
            onClick={handleChat}
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--color-surface-transparent)',
              borderRadius: 18,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: 'none', cursor: 'pointer',
              color: 'var(--color-active-element)',
            }}
          >
            <IcoMessageText />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>
              Чат
            </span>
          </button>

          {/* Chip: Отменить */}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--color-surface-transparent)',
              borderRadius: 18,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: 'none', cursor: cancelling ? 'default' : 'pointer',
              color: 'var(--color-error-surface-accented)',
              opacity: cancelling ? 0.5 : 1,
            }}
          >
            <IcoCloseCircle />
            <span style={{ ...text.caption2, color: 'var(--color-error-surface-accented)' }}>
              Отменить
            </span>
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
