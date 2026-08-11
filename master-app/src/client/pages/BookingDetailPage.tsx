import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Booking } from '@client/types'
import { formatPrice, bookingTotal, bookingDuration, bookingServiceItems } from '@client/types'
import { toClientLocal } from '@client/lib/timezone'
import { openAddToCalendar } from '@/lib/calendar'
import { text } from '@/styles/typography'
import MasterListItemSkeleton from '@client/components/MasterListItemSkeleton'
import AddressListItemSkeleton from '@client/components/AddressListItemSkeleton'
import AddressActionsMenu from '@/components/AddressActionsMenu'
import { bookingRouteAddress } from '@/lib/bookingAddress'
import { mapsUrl } from '@/lib/maps'

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

/* ── Location 16×16 (vuesax/linear/location) — pin для адреса ──────────────── */

function IcoLocation() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 8.95C9.149 8.95 10.08 8.019 10.08 6.87C10.08 5.722 9.149 4.79 8 4.79C6.851 4.79 5.92 5.722 5.92 6.87C5.92 8.019 6.851 8.95 8 8.95Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
      <path d="M2.413 5.66C3.727 -0.107 12.28 -0.1 13.587 5.667C14.353 9.054 12.247 11.92 10.4 13.694C9.06 14.987 6.94 14.987 5.593 13.694C3.753 11.92 1.647 9.047 2.413 5.66Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
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

/* ── Star 20×20 (vuesax/linear/star, fill=warningSurfaceAccented) ──────────── */

function IcoStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M11.4751 2.85L12.9584 5.81667C13.1584 6.225 13.6917 6.61667 14.1417 6.69167L16.8001 7.13333C18.5001 7.41667 18.9001 8.65 17.6751 9.86667L15.6084 11.9333C15.2584 12.2833 15.0667 12.9583 15.1751 13.4417L15.7667 16C16.2334 18.025 15.1584 18.8083 13.3667 17.75L10.8751 16.275C10.4251 16.0083 9.68341 16.0083 9.22508 16.275L6.73341 17.75C4.95008 18.8083 3.86675 18.0167 4.33341 16L4.92508 13.4417C5.03341 12.9583 4.84175 12.2833 4.49175 11.9333L2.42508 9.86667C1.20841 8.65 1.60008 7.41667 3.30008 7.13333L5.95841 6.69167C6.40008 6.61667 6.93341 6.225 7.13341 5.81667L8.61675 2.85C9.41675 1.25833 10.7167 1.25833 11.4751 2.85Z" fill="var(--color-warning-surface-accented)"/>
    </svg>
  )
}

/* ── Chip icons (vuesax/linear, 24×24, stroke=currentColor) ───────────────── */

// vuesax/linear/calendar (24×24) — «Добавить в календарь».
function IcoCalendar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5M16 2V5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.6947 13.7H15.7037M11.9955 13.7H12.0045M8.29431 13.7H8.30329" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

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

export default function BookingDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ id: string }>()
  const setMasterId = useBookingStore((s) => s.setMasterId)
  const setMasterProfileLink = useBookingStore((s) => s.setMasterProfileLink)
  const setService = useBookingStore((s) => s.setService)
  const setDateTime = useBookingStore((s) => s.setDateTime)
  const setClientAddress = useBookingStore((s) => s.setClientAddress)
  const setRescheduleId = useBookingStore((s) => s.setRescheduleId)
  const resetStore = useBookingStore((s) => s.reset)

  // Источник bookingId: либо :id из URL (вход из списка /my-bookings/:id),
  // либо location.state.bookingId (после создания записи на /book/confirm).
  const stateBookingId = (location.state as { bookingId?: string } | null)?.bookingId
  const bookingId = params.id ?? stateBookingId
  const isPostBooking = !params.id  // /book/success — после создания

  const [booking, setBooking] = useState<Booking | null>(null)
  const [addressMenuOpen, setAddressMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    bookingsApi.getById(bookingId).then((b) => {
      setBooking(b)
      setMasterId(b.master.id)  // сохраняем masterId чтобы HomeRoute и MyBookingsPage работали после дип-линка
      setMasterProfileLink(b.master.maxProfileLink)  // для гейта раздела «Сообщения»/чата
    }).catch(() => {})
  }, [bookingId, setMasterId, setMasterProfileLink])

  const handleClose = () => {
    if (isPostBooking) {
      resetStore()
      navigate('/')
    } else {
      navigate('/my-bookings')
    }
  }

  const handleReschedule = (step: 'date' | 'time' = 'date') => {
    // Перенос идёт через тот же flow, что и новая запись: load store → /book/calendar.
    // В post-booking режиме данные уже в store (из ConfirmPage); в view-режиме
    // подгружаем их из текущей записи.
    if (!isPostBooking && booking) {
      setMasterId(booking.master.id)
      setService(booking.service)            // сбрасывает rescheduleId — ставим его ниже
      setDateTime(booking.date, booking.time)
      // Адрес выезда переносим из записи в store — иначе на шаге подтверждения
      // поле «Ваш адрес» окажется пустым (в view-режиме store не заполнен).
      setClientAddress(booking.clientAddress)
      // Режим переноса: ConfirmPage обновит эту запись (date/time), а не создаст новую.
      setRescheduleId(booking.id)
    }
    navigate('/book/calendar', { state: { step } })
  }

  const handleChat = () => {
    const link = booking?.master.maxProfileLink
    if (!link) return
    if (window.WebApp?.openMaxLink) window.WebApp.openMaxLink(link)
    else navigate('/messages')
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

  const { master, date, time, clientAddress, paymentStatus } = booking
  const remind = booking.remind ?? true
  // Итог по всем услугам записи (мастер мог добавить несколько; «Прочее» — сумма мастера).
  const price = bookingTotal(booking)
  const serviceItems = bookingServiceItems(booking)
  // Дата/время записи — в поясе мастера; показываем клиенту в его поясе.
  const local = toClientLocal(date, time, master.timezone)
  const formattedDate = dayjs(local.date).format('D MMMM, dd')
  const badge = PAYMENT_BADGE[paymentStatus]
  const canAct = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const isCancelled = booking.status === 'CANCELLED'
  // Запись в прошлом: время окончания (начало + длительность) уже прошло (в поясе клиента).
  const isPast = dayjs(`${local.date}T${local.time}`).add(bookingDuration(booking), 'minute').isBefore(dayjs())
  // Блок чипов (Перенести/Чат/Отменить + календарь) в футере.
  // «Отметить как оплачено» у клиента нет — оплату подтверждает только мастер.
  const showChips = canAct && (!isPast || !!master.maxProfileLink)

  // «Добавить в календарь» — как у мастера (общий openAddToCalendar). Дату/время
  // берём в поясе клиента (для Google-шаблона на Android/десктопе); iOS — серверный .ics.
  const handleAddToCalendar = () => {
    openAddToCalendar({
      bookingId: booking.id,
      title: serviceItems.map((i) => i.service.name).join(', '),
      date: local.date,
      time: local.time,
      durationMin: bookingDuration(booking),
      location: clientAddress || master.location || undefined,
    })
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 272 /* footer chips + «Добавить в календарь» */ }}>

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
              {isCancelled ? 'Отменено' : isPast ? 'Прошлая запись' : 'Вы записаны!'}
            </div>
            {isCancelled ? (
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Запись не актуальна
              </div>
            ) : !isPast ? (
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Не опаздывайте
              </div>
            ) : null}
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

        {/* listItem: мастер.
            booking.master содержит только id/name/photo/location (booking-include),
            description + rating подгружаются из mastersApi.getById через masterFull. */}
        <button
          type="button"
          aria-label={`Открыть профиль мастера ${master.name}`}
          onClick={() => {
            setMasterId(master.id)
            navigate(`/?masterId=${encodeURIComponent(master.id)}`)
          }}
          style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
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
            {master.description && (
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {master.description}
              </div>
            )}
          </div>
          {master.rating > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 0',
              flexShrink: 0,
            }}>
              <IcoStar />
              <span style={{
                fontSize: 15, lineHeight: '20px', fontWeight: 400, letterSpacing: -0.15,
                color: 'var(--color-on-surface-secondary)',
              }}>
                {master.rating.toFixed(1)}
              </span>
            </div>
          )}
        </button>

        {/* listItem: адрес — clickable card → geo://.
            clientAddress задан → выезд мастера (subtitle «Мой адрес»),
            иначе адрес мастера (subtitle «Адрес мастера», координаты из masterFull). */}
        {(() => {
          const addressText = clientAddress || master?.location
          if (!addressText) return null
          const subtitle = clientAddress ? 'Ваш адрес' : 'Адрес мастера'
           return (
            <button
              type="button"
               onClick={() => setAddressMenuOpen(true)}
               aria-label="Действия с адресом"
              style={{
                background: 'var(--color-surface-transparent)',
                borderRadius: 20,
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
                border: 'none', cursor: 'pointer',
                width: '100%', textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  ...text.callout1, color: 'var(--color-on-surface)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', wordBreak: 'break-word',
                }}>
                  {addressText}
                </div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
                  {subtitle}
                </div>
              </div>
              <IcoLocation />
            </button>
          )
         })()}

        {addressMenuOpen && (() => {
          const copyText = clientAddress || master?.location || ''
          const routeAddress = bookingRouteAddress(copyText)
          return (
            <AddressActionsMenu
              onClose={() => setAddressMenuOpen(false)}
              onCopy={() => {
                void navigator.clipboard.writeText(copyText).then(() => {
                  setAddressMenuOpen(false)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2500)
                })
              }}
              onOpenMaps={() => {
                setAddressMenuOpen(false)
                window.WebApp?.openLink(mapsUrl(routeAddress, clientAddress ? null : master.lat, clientAddress ? null : master.lng, master.name))
              }}
            />
          )
        })()}

        {copied && (
          <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 1100, background: 'var(--color-on-surface)', color: 'var(--color-surface)', borderRadius: 16, padding: '12px 16px', textAlign: 'center', ...text.caption1 }}>
            Скопировано
          </div>
        )}

        {/* listItem: услуга — column gap=16, нижний row: price + tag «НЕ ОПЛАЧЕНО» */}
        <button type="button" aria-label="Изменить дату" onClick={() => handleReschedule('date')} style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {serviceItems.map((it, i) => (
                <div key={i}>
                  <div style={{
                    ...text.callout1, color: 'var(--color-on-surface)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {it.service.name}
                  </div>
                  {it.service.description && (
                    <div style={{
                      ...text.caption2, color: 'var(--color-on-surface-secondary)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {it.service.description}
                    </div>
                  )}
                </div>
              ))}
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
        </button>

        {/* listItem: дата */}
        <button type="button" aria-label="Изменить время" onClick={() => handleReschedule('time')} style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
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
        </button>

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
              {local.time}
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
            Скрываем для COMPLETED/CANCELLED. Для прошедшей записи — без «Перенести»/
            «Отменить»; остаётся только «Чат», и весь футер прячем, если чата нет. */}
      {showChips && (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px 48px',
        background: 'var(--color-background)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {showChips && (<>
        {/* Chip: Добавить в календарь (как у мастера) — для будущих записей. */}
        {!isPast && (
          <button
            onClick={handleAddToCalendar}
            style={{
              width: '100%',
              background: 'var(--color-surface-transparent)',
              borderRadius: 18,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: 'none', cursor: 'pointer',
              color: 'var(--color-active-element)',
            }}
          >
            <IcoCalendar />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>
              Добавить в календарь
            </span>
          </button>
        )}

        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {/* Chip: Перенести — недоступно для прошедшей записи. */}
          {!isPast && (
          <button
            onClick={() => handleReschedule()}
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
          )}

          {/* Chip: Чат — доступен только если мастер оставил ссылку на профиль. */}
          <button
            onClick={handleChat}
            disabled={!master.maxProfileLink}
            style={{
              flex: 1, minWidth: 0,
              background: 'var(--color-surface-transparent)',
              borderRadius: 18,
              padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              border: 'none', cursor: master.maxProfileLink ? 'pointer' : 'default',
              color: 'var(--color-active-element)',
              opacity: master.maxProfileLink ? 1 : 0.4,
            }}
          >
            <IcoMessageText />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>
              Чат
            </span>
          </button>

          {/* Chip: Отменить — недоступно для прошедшей записи. */}
          {!isPast && (
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
          )}
        </div>
        </>)}
      </div>
      )}
    </div>
  )
}
