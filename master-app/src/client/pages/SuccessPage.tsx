import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import { colors } from '@/styles/tokens'
import { text } from '@/styles/typography'

dayjs.locale('ru')

export default function SuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const bookingId = (location.state as { bookingId?: string })?.bookingId
  const { masterId, service, date, time, remind, reset } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const handleClose = () => {
    reset()
    navigate('/')
  }

  const handleShare = async () => {
    if (!master || !service) return
    const text = `Записался к ${master.name} на «${service.name}» — ${dayjs(date).format('D MMMM')}, ${time}`
    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
    }
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
      reset()
      navigate('/')
    } catch {
      setCancelling(false)
    }
  }

  if (!service) return null

  const price = discountedPrice(service.price, service.discountPercent) ?? service.price
  const formattedDate = dayjs(date).format('D MMMM, dddd')

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{
        height: 56, background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Green circle with white circle + green checkmark */}
        <div style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
          background: `linear-gradient(180deg, ${colors.freshgreen50} 0%, var(--color-success-surface-accented) 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="9.125" fill="var(--color-on-primary-surface)"/>
            <path d="M18.275 8.91a1.63 1.63 0 0 0-2.05 0l-.123.111-4.523 4.521-1.68-1.681-.124-.111a1.63 1.63 0 0 0-2.05 0l-.123.111a1.63 1.63 0 0 0 0 2.298l2.83 2.829a1.62 1.62 0 0 0 2.296 0l5.67-5.67.006-.005.005-.004a1.63 1.63 0 0 0 .102-2.163l-.113-.125z" fill="var(--color-success-surface-accented)" stroke="var(--color-success-surface-accented)" strokeWidth="0.5"/>
          </svg>
        </div>
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <div style={{
            ...text.callout, color: 'var(--color-on-surface)',
            lineHeight: '22px',
          }}>
            Вы записаны!
          </div>
          <div style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote, marginTop: 2 }}>
            Не опаздывайте 😏
          </div>
        </div>
        {/* Close button (right) */}
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="m9.17 14.83 5.66-5.66m0 5.66-5.66-5.66M9 22h6c5 0 7-2 7-7v-6c0-5-2-7-7-7H9c-5 0-7 2-7 7v6c0 5 2 7 7 7" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Cards ── */}
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Master */}
        {master && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--color-divider-low)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...text.titleSmall, flexShrink: 0,
              }}>
                {master.photo
                  ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.body }}>{master.name}</div>
                {master.description && (
                  <div style={{
                    color: 'var(--color-on-surface-secondary)', ...text.footnote, marginTop: 1,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                  }}>
                    {master.description}
                  </div>
                )}
              </div>
              {master.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path fill="var(--color-warning-surface-accented)" d="m11.153 3.34 1.174 2.347c.16.326.586.64.946.7l2.127.353c1.36.227 1.68 1.213.7 2.187l-1.653 1.653c-.28.28-.434.82-.347 1.207l.473 2.046c.374 1.62-.486 2.247-1.92 1.4l-1.993-1.18c-.36-.213-.953-.213-1.32 0l-1.993 1.18c-1.427.847-2.294.214-1.92-1.4l.473-2.046c.087-.387-.067-.927-.347-1.207L4.9 8.927c-.973-.974-.66-1.96.7-2.187l2.127-.353c.353-.06.78-.374.94-.7l1.173-2.347c.64-1.273 1.68-1.273 2.313 0"/>
                  </svg>
                  <span style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote }}>{master.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 14 }}>
          <div style={{ ...text.body, marginBottom: 4 }}>{service.name}</div>
          {service.description && (
            <div style={{ color: 'var(--color-on-surface-secondary)', ...text.action, lineHeight: 1.5, marginBottom: 8 }}>
              {service.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...text.subheadRegular }}>
              {formatPrice(price)}
            </span>
            {service.discountPercent && (
              <span style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote, textDecoration: 'line-through' }}>
                {formatPrice(service.price)}
              </span>
            )}
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(206, 66, 89, 0.3)', color: 'var(--color-error-surface-accented)',
              ...text.overline, borderRadius: 6,
              padding: '2px 10px', lineHeight: '18px',
            }}>
              Не оплачено
            </span>
          </div>
        </div>

        {/* Date */}
        <div style={{
          background: 'var(--color-surface)', borderRadius: 14, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>{formattedDate}</div>
            <div style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote }}>Дата</div>
          </div>
        </div>

        {/* Time */}
        <div style={{
          background: 'var(--color-surface)', borderRadius: 14, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>{time}</div>
            <div style={{ color: 'var(--color-on-surface-secondary)', ...text.footnote }}>
              {remind ? 'Напомним за 1 час' : 'Без напоминания'}
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom: 4 action buttons + big close button ── */}
      <div style={{ padding: '12px 16px 32px' }}>

        {/* 4 action buttons */}
        <div style={{ display: 'flex', gap: 9, marginBottom: 16 }}>
          {([
            { label: 'Поделиться', Icon: IcoShare, action: handleShare, disabled: false, red: false },
            { label: 'Изменить', Icon: IcoEdit, action: () => {}, disabled: true, red: false },
            { label: 'Чат', Icon: IcoChat, action: handleChat, disabled: false, red: false },
            { label: 'Отменить', Icon: IcoCancel, action: handleCancel, disabled: cancelling, red: true },
          ]).map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              disabled={btn.disabled}
              style={{
                flex: 1, height: 60, background: 'var(--color-surface)', borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: btn.disabled ? 'default' : 'pointer',
                opacity: btn.disabled ? 0.4 : 1, padding: 0,
              }}
            >
              <btn.Icon />
            </button>
          ))}
        </div>

        {/* Close button — same style as ConfirmPage "Записаться" */}
        <button
          onClick={handleClose}
          style={{
            width: '100%', padding: 16, borderRadius: 14,
            background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
            ...text.subheadRegular,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 'none', cursor: 'pointer',
          }}
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}

/* ── Icon components ── */

function IcoShare() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M14.83 13L20.83 7" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21.63 8.8V3H15.83" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 3H9C4 3 2 5 2 10V16C2 21 4 23 9 23H15C20 23 22 21 22 16V14" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoEdit() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M13.14 5.6L5.92 13.29C5.61 13.62 5.32 14.27 5.26 14.72L4.89 17.96C4.76 19.13 5.6 19.93 6.76 19.73L9.98 19.18C10.43 19.1 11.06 18.77 11.37 18.43L18.58 10.74C19.99 9.24 20.64 7.53 18.43 5.44C16.23 3.37 14.56 4.1 13.14 5.6Z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.77 7.05C12.2 9.81 14.44 11.92 17.22 12.2" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.88 22H21.88" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8H17M7 13H13" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoCancel() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--color-error-surface-accented)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.17 14.83L14.83 9.17" stroke="var(--color-error-surface-accented)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.83 14.83L9.17 9.17" stroke="var(--color-error-surface-accented)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
