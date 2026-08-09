import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { formatClientAddress } from '@client/lib/clientAddress'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import { toClientLocal } from '@client/lib/timezone'
import { text } from '@/styles/typography'
import MasterListItemSkeleton from '@client/components/MasterListItemSkeleton'
import AddressListItemSkeleton from '@client/components/AddressListItemSkeleton'
import { openExternalLink } from '@/lib/bridge'
import AddressSuggestField from '@client/components/AddressSuggestField'
import { metricErrorType, trackEvent } from '@/lib/metrics'
import { checkClientAccess, isClientBlockedByMasterError } from '@client/lib/clientAccess'
import { closeWebApp } from '@/lib/bridge'

dayjs.locale('ru')

/* ── Иконки toolbar (vuesax/linear, 24×24) ─────────────────────────────────── */

function IcoArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
    </svg>
  )
}

function ToolbarButton({ onClick, ariaLabel, children }: {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--color-background)',
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── Location 16×16 (vuesax/linear/location) — pin для адреса мастера ──────── */

function IcoLocation() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 8.95C9.149 8.95 10.08 8.019 10.08 6.87C10.08 5.722 9.149 4.79 8 4.79C6.851 4.79 5.92 5.722 5.92 6.87C5.92 8.019 6.851 8.95 8 8.95Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
      <path d="M2.413 5.66C3.727 -0.107 12.28 -0.1 13.587 5.667C14.353 9.054 12.247 11.92 10.4 13.694C9.06 14.987 6.94 14.987 5.593 13.694C3.753 11.92 1.647 9.047 2.413 5.66Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
    </svg>
  )
}

/* ── Edit-2 16×16 (vuesax/linear/edit-2, точные path из Figma 8175:13372) ──── */

function IcoEdit2() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Star 20×20 (vuesax/linear/star) — fill=warningSurfaceAccented ─────────── */

function IcoStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M11.4751 2.85L12.9584 5.81667C13.1584 6.225 13.6917 6.61667 14.1417 6.69167L16.8001 7.13333C18.5001 7.41667 18.9001 8.65 17.6751 9.86667L15.6084 11.9333C15.2584 12.2833 15.0667 12.9583 15.1751 13.4417L15.7667 16C16.2334 18.025 15.1584 18.8083 13.3667 17.75L10.8751 16.275C10.4251 16.0083 9.68341 16.0083 9.22508 16.275L6.73341 17.75C4.95008 18.8083 3.86675 18.0167 4.33341 16L4.92508 13.4417C5.03341 12.9583 4.84175 12.2833 4.49175 11.9333L2.42508 9.86667C1.20841 8.65 1.60008 7.41667 3.30008 7.13333L5.95841 6.69167C6.40008 6.61667 6.93341 6.225 7.13341 5.81667L8.61675 2.85C9.41675 1.25833 10.7167 1.25833 11.4751 2.85Z" fill="var(--color-warning-surface-accented)"/>
    </svg>
  )
}

/* ── Footer-button icon (vuesax/linear/calendar-edit 24×24) ────────────────── */

function IcoCalendarEdit() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h17" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5C3 5.5 4.5 3.5 8 3.5h8c3.5 0 5 2 5 5Z" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m15.695 13.7-3.61 3.61c-.14.14-.27.4-.3.59l-.19 1.35c-.07.49.27.83.76.76l1.35-.19c.19-.03.46-.16.59-.3l3.61-3.61c.62-.62.91-1.34 0-2.25-.9-.9-1.62-.6-2.21.04Z" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.205 14.19a3.193 3.193 0 0 0 2.25 2.25" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function ConfirmPage() {
  const navigate = useNavigate()
  const mountedRef = useRef(true)
  const {
    masterId, service, categoryName, date, time, remind, clientAddress, onlineMeetingLink,
    clientApartment, clientFloor, clientIntercom,
    setClientAddress, setClientApartment, setClientFloor, setClientIntercom,
    reset, rescheduleId,
  } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  // Если у мастера нет home_visit — clientAddress всегда null (услуга у мастера).
  useEffect(() => {
    if (master && !master.homeVisit && clientAddress) {
      setClientAddress(null)
    }
  }, [master, clientAddress, setClientAddress])

  const handleConfirm = async () => {
    if (!service) return
    setLoading(true)
    try {
      if (rescheduleId) {
        // Перенос существующей записи: меняем только дату/время (адрес/услуга не трогаются).
        await bookingsApi.reschedule(rescheduleId, { date, time })
        trackEvent('client_booking_rescheduled', {})
        reset()
        navigate('/my-bookings')
      } else {
        const booking = await bookingsApi.create({
          masterId, serviceId: service.id, date, time, remind,
          clientAddress: master?.homeVisit
            ? formatClientAddress(clientAddress, clientApartment, clientFloor, clientIntercom)
            : null,
        })
        trackEvent('client_booking_confirmed', {
          has_address: Boolean(master?.homeVisit && clientAddress?.trim()),
          remind,
          has_deposit: false,
        })
        navigate('/book/success', { state: { bookingId: booking.id } })
      }
    } catch (error) {
      if (!rescheduleId) trackEvent('client_booking_create_failed', { booking_type: 'regular', error_type: metricErrorType(error) })
      if (isClientBlockedByMasterError(error)) {
        const access = await checkClientAccess(masterId)
        if (!mountedRef.current || useBookingStore.getState().masterId !== masterId) return
        if (access === 'blocked') {
          if (!closeWebApp()) navigate('/', { replace: true })
        } else if (access === 'unavailable') {
          navigate('/', { replace: true })
        }
        return
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleOpenMasterLocation = () => {
    if (!master) return
    const url = master.lat && master.lng
      ? `geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`
      : `geo:0,0?q=${encodeURIComponent(master.location ?? '')}`
    window.WebApp?.openLink(url)
  }

  const handleClose = () => {
    reset()
    navigate('/')
  }

  if (!service) return null

  const price = discountedPrice(service.price, service.discountPercent) ?? service.price
  // В store дата/время — в поясе мастера (каноника). Показываем клиенту в его поясе.
  const local = toClientLocal(date, time, master?.timezone)
  const formattedDate = dayjs(local.date).format('D MMMM, dd')
  const isOnlineReschedule = !!rescheduleId && !!onlineMeetingLink

  // Если мастер выезжает к клиенту — нужен непустой адрес перед submit.
  const submitDisabled = loading || (!isOnlineReschedule && master?.homeVisit === true && !clientAddress?.trim())

  const headerSubtitle = categoryName || service.name

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 124 /* footer-button */ }}>

      {/* ── Toolbar (Figma toolbarTop). h=56, padding 6/12, justify-between.
            Title abs-centered top=8: callout1 "Подтверждение" + caption2 service.name. */}
      <div style={{
        position: 'relative',
        height: 56,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <ToolbarButton onClick={() => navigate(-1)} ariaLabel="Назад">
          <IcoArrowLeft />
        </ToolbarButton>

        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
            Подтверждение
          </div>
          <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
            {headerSubtitle}
          </div>
        </div>

        {/* Trailing «Закрыть» — pill bg=background, текст callout1.
            Padding: button-group p=4, button-text p=6 → итого 10px вокруг текста. */}
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

      {/* ── Form (Figma 8534:14808): top=180→flow, padding 8/16, gap 8, w-full children. */}
      <div style={{
        flex: 1,
        padding: '8px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>

        {/* listItem: мастер (avatar + name + profession + rating).
            Пока master null — рендерим skeleton того же размера, чтобы layout не прыгал. */}
        {!master && <MasterListItemSkeleton />}
        {!master && <AddressListItemSkeleton lines={1} />}
        {master && (
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
          </div>
        )}

        {/* listItem: адрес — зависит от master.homeVisit.
              homeVisit=false → карточка с адресом мастера (callout1 + caption2 "Адрес мастера")
                                + location pin справа, клик открывает geo:// (Figma 8700:33418).
              homeVisit=true  → AddressSuggestField со своей карточкой (label «Ваш адрес»
                                + outline + input), Figma 8557:23640 / 8746:54653. */}
        {master && isOnlineReschedule && (
          <button
            type="button"
            onClick={() => openExternalLink(onlineMeetingLink)}
            style={{
              background: 'var(--color-surface-transparent)',
              borderRadius: 20,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left',
            }}
            aria-label="Открыть ссылку на онлайн-встречу"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...text.callout1, color: 'var(--color-on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {onlineMeetingLink}
              </div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Онлайн</div>
            </div>
          </button>
        )}

        {master && !isOnlineReschedule && !master.homeVisit && master.location && (
          <button
            type="button"
            onClick={handleOpenMasterLocation}
            style={{
              background: 'var(--color-surface-transparent)',
              borderRadius: 20,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left',
            }}
            aria-label="Открыть на карте"
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...text.callout1, color: 'var(--color-on-surface)',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', wordBreak: 'break-word',
              }}>
                {master.location}
              </div>
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Адрес мастера
              </div>
            </div>
            <IcoLocation />
          </button>
        )}

        {master?.homeVisit && !isOnlineReschedule && (
          <AddressSuggestField
            value={clientAddress ?? ''}
            onChange={(v) => setClientAddress(v || null)}
            label="Ваш адрес"
            placeholder="Город, улица, дом..."
            details={{
              apartment: clientApartment,
              floor: clientFloor,
              intercom: clientIntercom,
              onApartmentChange: setClientApartment,
              onFloorChange: setClientFloor,
              onIntercomChange: setClientIntercom,
            }}
          />
        )}

        {/* listItem: услуга — column gap=16: (name+description) + price */}
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
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              {formatPrice(price)}
            </div>
          </div>
        </div>

        {/* listItem: дата + edit-2 (back to date step) */}
        <button
          aria-label="Изменить дату"
          onClick={() => navigate('/book/calendar')}
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
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {formattedDate}
            </div>
            <div style={{
              ...text.caption2, color: 'var(--color-on-surface-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Дата
            </div>
          </div>
          <IcoEdit2 />
        </button>

        {/* listItem: время + remind label + edit-2 (back to time step) */}
        <button
          aria-label="Изменить время"
          onClick={() => navigate('/book/calendar', { state: { step: 'time' } })}
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
        </button>

      </div>

      {/* ── Footer button (Figma 8534:14816). bottom-fixed: pt=8 pb=48 px=12.
            Кнопка h=60, rx=20, bg=primarySurface, gap=8 (icon + text). */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px 48px',
        background: 'var(--color-background)',
      }}>
        <button
          onClick={handleConfirm}
          disabled={submitDisabled}
          style={{
            width: '100%', height: 60, borderRadius: 20,
            background: 'var(--color-primary-surface)',
            border: 'none', cursor: submitDisabled ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 18,
            opacity: submitDisabled ? 0.5 : 1,
          }}
        >
          <IcoCalendarEdit />
          <span style={{ ...text.callout1, color: 'var(--color-on-primary-surface)' }}>
            {loading
              ? (rescheduleId ? 'Переносим...' : 'Записываем...')
              : (rescheduleId ? 'Перенести' : 'Записаться')}
          </span>
        </button>
      </div>
    </div>
  )
}
