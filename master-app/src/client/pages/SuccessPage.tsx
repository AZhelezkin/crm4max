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

      {/* ── Header area (h=202): banner overlay + green check + close btn ── */}
      <div style={{ position: 'relative', height: 202 }}>
        {/* Banner photo area (h=134) — master photo or gradient */}
        <div style={{
          height: 134, width: '100%',
          background: master?.photo ? `url(${master.photo}) center/cover` : 'linear-gradient(135deg, #1a1a2e, #16213e)',
        }} />
        {/* Dark overlay over banner */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 202, background: '#0F0F11' }} />

        {/* Green circle with checkmark — x=20 y=144 44x44 */}
        <div style={{
          position: 'absolute', left: 20, top: 144,
          width: 44, height: 44, borderRadius: 22,
          background: 'linear-gradient(180deg, #32D9B9 0%, #09CA3E 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M6 11.5L9.5 15L16 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Title text — next to green circle */}
        <div style={{ position: 'absolute', left: 76, top: 150, color: '#D3D4D6' }}>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: '22px' }}>Вы записаны!</div>
          <div style={{ color: '#7D7D7F', fontSize: 13, marginTop: 2 }}>Не опаздывайте 😏</div>
        </div>

        {/* Close button — top right, square with X */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', right: 14, top: 156,
            width: 24, height: 24, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7 7L17 17M17 7L7 17" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="2" y="2" width="20" height="20" rx="7" stroke="#D3D4D6" strokeWidth="2"/>
          </svg>
        </button>
      </div>

      {/* ── Cards section ── */}
      <div style={{ flex: 1, padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Card 1: Master — h=78, rx=20 */}
        {master && (
          <div style={{
            background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
            height: 78, padding: '0 16px',
            display: 'flex', alignItems: 'center',
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 46, height: 46, borderRadius: 23, flexShrink: 0,
              overflow: 'hidden', background: '#454757',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              {master.photo
                ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 20, color: '#7D7D7F' }}>👤</span>
              }
            </div>

            {/* Name + description */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#F0AF2D">
                  <path d="M8 1l2.245 4.549L15 6.255l-3.5 3.412.826 4.815L8 12.343l-4.326 2.139.826-4.815L1 6.255l4.755-.706L8 1z"/>
                </svg>
                <span style={{ color: '#7D7D7F', fontSize: 13, fontWeight: 500 }}>{master.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Card 2: Service — h=142, rx=20 */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          minHeight: 142, padding: '16px 16px',
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
                {/* Discount badge: x offset, w=86, h=22, rx=6 */}
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                  fontSize: 11, fontWeight: 700, borderRadius: 6,
                  padding: '2px 8px', lineHeight: '18px',
                }}>
                  % скидки
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Date + time — h=71, rx=20 */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          height: 71, padding: '0 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>
            {formattedDate}, {time}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 }}>
            {remind ? 'Напомним за 1 час · ' : ''}{service.duration} мин · {formatPrice(price)}
          </div>
        </div>

        {/* Card 4: Total — h=71, rx=20 */}
        <div style={{
          background: 'rgba(240, 243, 255, 0.1)', borderRadius: 20,
          height: 71, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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

      {/* ── Bottom section: 4 action buttons + big button ── */}
      <div style={{ padding: '24px 14px 32px' }}>

        {/* 4 action buttons — each 91.25×60, rx=18, gap between = ~10px */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 36 }}>
          {/* 1. Share / Open link */}
          <button
            onClick={() => { reset(); navigate('/') }}
            style={{
              height: 60, background: '#25262B', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14.83 13L20.83 7" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21.63 8.8V3H15.83" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.63 3H10.63C5.63 3 3.63 5 3.63 10V16C3.63 21 5.63 23 10.63 23H16.63C21.63 23 23.63 21 23.63 16V14" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.82) translate(2, 1)"/>
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
              <path d="M13.14 5.6L5.92 13.29C5.61 13.62 5.32 14.27 5.26 14.72L4.89 17.96C4.76 19.13 5.6 19.93 6.76 19.73L9.98 19.18C10.43 19.1 11.06 18.77 11.37 18.43L18.58 10.74C19.99 9.24 20.64 7.53 18.43 5.44C16.23 3.37 14.56 4.1 13.14 5.6Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11.77 7.05C12.2 9.81 14.44 11.92 17.22 12.2" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.88 22H21.88" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
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

        {/* Big blue button — w=392, h=60, rx=20, fill=#007AFE */}
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
          {/* Diamond icon from mockup */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7.93 13.879L19.88 1.929" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.1 16.279L16.3 15.079" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17.79 13.589L20.18 11.199" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.6 8.239L14.24 1.599C16.36 -0.521 17.42 -0.531 19.52 1.569L24.43 6.479C26.53 8.579 26.52 9.639 24.4 11.759L17.76 18.399C15.64 20.519 14.58 20.529 12.48 18.429L7.57 13.519C5.47 11.419 5.47 10.369 7.6 8.239Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.65) translate(3, 4)"/>
            <path d="M6 19.999H26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.65) translate(3, 4)"/>
          </svg>
          Закрыть
        </button>
      </div>
    </div>
  )
}
