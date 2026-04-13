import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'

dayjs.locale('ru')

export default function SuccessPage() {
  const navigate = useNavigate()
  const { masterId, service, date, time, remind, reset } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const handleClose = () => {
    reset()
    navigate('/')
  }

  if (!service) return null

  const price = discountedPrice(service.price, service.discountPercent) ?? service.price
  const formattedDate = dayjs(date).format('D MMMM, dddd')

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header: green check + "Вы записаны!" + close button ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 14px 12px',
      }}>
        {/* Green check circle + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: 'linear-gradient(180deg, #32D9B9 0%, #09CA3E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 12.875C11.0268 12.875 15.125 16.973 15.125 22C15.125 27.027 11.0268 31.125 6 31.125" stroke="white" strokeWidth="0" />
              <path d="M7.275 17.91C6.681 17.427 5.818 17.427 5.225 17.91L5.102 18.021L0.579 22.542L-1.102 20.861L-1.225 20.75C-1.819 20.267 -2.682 20.267 -3.276 20.75L-3.398 20.861C-4.03 21.493 -4.03 22.527 -3.398 23.159L-0.568 25.988C-0.266 26.291 0.145 26.465 0.58 26.465C1.015 26.465 1.426 26.29 1.729 25.988L7.398 20.318L7.404 20.313L7.409 20.309C7.983 19.715 8.032 18.785 7.511 18.146L7.398 18.021L7.275 17.91Z" fill="white" stroke="white" strokeWidth="0" transform="translate(6, -6) scale(0.85)" />
              {/* Simplified checkmark */}
              <path d="M8 12.5l3 3 5-5.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#D3D4D6' }}>Вы записаны!</div>
            <div style={{ color: '#7D7D7F', fontSize: 13, marginTop: 2 }}>Не опаздывайте 😏</div>
          </div>
        </div>

        {/* Close button — square with rounded corners + X */}
        <button
          onClick={handleClose}
          style={{
            width: 30, height: 30, borderRadius: 10,
            border: '2px solid #D3D4D6', background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* ── Content cards ── */}
      <div style={{ flex: 1, padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Card 1: Master info */}
        {master && (
          <div style={{
            background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
            padding: '16px 16px', minHeight: 78,
            display: 'flex', alignItems: 'center',
          }}>
            {/* Avatar with green progress arc */}
            <div style={{
              position: 'relative', width: 46, height: 46,
              flexShrink: 0, marginRight: 12,
            }}>
              <svg width="46" height="46" viewBox="0 0 46 46" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Background arc (gray) */}
                <circle cx="23" cy="23" r="21" stroke="#7D7D7F" strokeWidth="1" fill="none" strokeLinecap="round"
                  strokeDasharray="132" strokeDashoffset="0" opacity="0.3" />
                {/* Green progress arc */}
                <circle cx="23" cy="23" r="21" stroke="url(#greenGrad)" strokeWidth="2" fill="none" strokeLinecap="round"
                  strokeDasharray="132" strokeDashoffset="44"
                  transform="rotate(-90, 23, 23)" />
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#32D9B9"/>
                    <stop offset="100%" stopColor="#09CA3E"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: 'absolute', top: 3, left: 3,
                width: 40, height: 40, borderRadius: 20,
                overflow: 'hidden', background: '#454757',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {master.photo
                  ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 20, color: '#7D7D7F' }}>👤</span>
                }
              </div>
            </div>

            {/* Master name + description */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 15, color: '#D3D4D6',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {master.name}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {master.description || 'Мастер'}
              </div>
            </div>

            {/* Rating */}
            {master.rating > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                flexShrink: 0, marginLeft: 8,
              }}>
                <span style={{ color: '#F0AF2D', fontSize: 14 }}>★</span>
                <span style={{ color: '#7D7D7F', fontSize: 13 }}>{master.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Card 2: Service info */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          padding: '16px 16px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6', marginBottom: 4 }}>
            {service.name}
          </div>
          {service.description && (
            <div style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: '17px',
              marginBottom: 8,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            }}>
              {service.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>
              {formatPrice(price)}
            </span>
            {service.discountPercent && (
              <>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>
                  {formatPrice(service.price)}
                </span>
                <span style={{
                  background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                  fontSize: 11, fontWeight: 700, borderRadius: 6,
                  padding: '2px 8px', lineHeight: '18px', marginLeft: 'auto',
                }}>
                  % скидки
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Date + time */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          padding: '14px 16px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>
            {formattedDate}, {time}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 }}>
            {remind ? 'Напомним за 1 час · ' : ''}{service.duration} мин · {formatPrice(price)}
          </div>
        </div>

        {/* Card 4: Total */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>Итого</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 }}>
              Оплатить у мастера
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 17, color: '#D3D4D6' }}>
            {formatPrice(price)}
          </div>
        </div>
      </div>

      {/* ── Bottom: 4 action buttons + big close button ── */}
      <div style={{ padding: '12px 14px 32px' }}>

        {/* 4 action buttons grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {/* 1. Share / Go to profile */}
          <button
            onClick={() => { reset(); navigate('/') }}
            style={{
              height: 60, background: '#25262B', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14.825 6.8L20.825 12.8" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21.625 8.8V4H16.825" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.625 4H10.625C5.625 4 3.625 6 3.625 11V17C3.625 22 5.625 24 10.625 24H16.625C21.625 24 23.625 22 23.625 17V15" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.85) translate(1, 1)"/>
            </svg>
          </button>

          {/* 2. Edit */}
          <button
            onClick={() => navigate('/book/calendar')}
            style={{
              height: 60, background: '#25262B', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15.135 5.6L7.925 13.29C7.615 13.62 7.315 14.27 7.255 14.72L6.885 17.96C6.755 19.13 7.595 19.93 8.755 19.73L11.975 19.18C12.425 19.1 13.055 18.77 13.365 18.43L20.575 10.74C21.995 9.24 22.635 7.53 20.425 5.44C18.225 3.37 16.555 4.1 15.135 5.6Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.765 7.05C14.195 9.81 16.435 11.92 19.215 12.2" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.875 24H22.875" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.85) translate(1, 1)"/>
            </svg>
          </button>

          {/* 3. Chat */}
          <button
            onClick={() => navigate('/messages')}
            style={{
              height: 60, background: '#25262B', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 8H17" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 13H13" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 4. Cancel (red) */}
          <button
            style={{
              height: 60, background: '#25262B', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#CE4259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.17 14.83L14.83 9.17" stroke="#CE4259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.83 14.83L9.17 9.17" stroke="#CE4259" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Big blue button: "Отлично! Закрыть" */}
        <button
          onClick={handleClose}
          style={{
            width: '100%', height: 60, borderRadius: 20,
            background: '#007AFE', color: '#fff',
            fontWeight: 600, fontSize: 17,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 'none', cursor: 'pointer',
          }}
        >
          {/* Diamond/rhombus icon from mockup */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9.93 5.879L7.88 8.199" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.793 5.589L13.183 2.199" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.601 8.239L16.241 1.599C18.361 -0.521 19.421 -0.531 21.521 1.569L22.431 6.479C24.531 8.579 24.521 9.639 22.401 11.759L15.761 18.399C13.641 20.519 12.581 20.529 10.481 18.429L9.571 13.519C7.471 11.419 7.471 10.369 9.601 8.239Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.7) translate(3, 3)"/>
            <path d="M8 20H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Отлично! Закрыть
        </button>
      </div>
    </div>
  )
}
