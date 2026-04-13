import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { discountedPrice } from '@client/types'

dayjs.locale('ru')

export default function ConfirmPage() {
  const navigate = useNavigate()
  const { masterId, service, date, time, remind } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const handleConfirm = async () => {
    if (!service) return
    setLoading(true)
    try {
      await bookingsApi.create({ masterId, serviceId: service.id, date, time, remind })
      navigate('/book/success')
    } finally {
      setLoading(false)
    }
  }

  if (!service) return null

  const price = discountedPrice(service.price, service.discountPercent) ?? service.price
  const formattedDate = dayjs(date).format('D MMMM, dddd')

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        height: 66, background: '#0F0F11',
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, flexShrink: 0 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15.57 17.93L9.5 12l6.07-6.07" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.5 12H9.67" stroke="#D3D4D6" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          <div style={{
            fontWeight: 600, fontSize: 17, color: '#D3D4D6',
            lineHeight: '22px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Подтверждение
          </div>
          <div style={{
            color: '#7D7D7F', fontSize: 13, marginTop: 2,
            lineHeight: '17px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {service.name}
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {master && (
          <div style={{ background: '#1C1C1E', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {master.photo
                  ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{master.name}</div>
                {master.description && (
                  <div style={{
                    color: '#8E8E93', fontSize: 13, marginTop: 1,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                  }}>
                    {master.description}
                  </div>
                )}
              </div>
              {master.rating > 0 && (
                <div style={{ color: '#FF9500', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                  ★ {master.rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ background: '#1C1C1E', borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{service.name}</div>
          {service.description && (
            <div style={{ color: '#8E8E93', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
              {service.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              {(price / 100).toLocaleString('ru-RU')} ₽
            </span>
            {service.discountPercent && (
              <span style={{ color: '#8E8E93', fontSize: 13, textDecoration: 'line-through' }}>
                {(service.price / 100).toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
        </div>

        <div style={{
          background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>{formattedDate}</div>
            <div style={{ color: '#8E8E93', fontSize: 13 }}>Дата</div>
          </div>
          <button onClick={() => navigate('/book/calendar')} style={{ background: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="#8E8E93" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div style={{
          background: '#1C1C1E', borderRadius: 14, padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600 }}>{time}</div>
            <div style={{ color: '#8E8E93', fontSize: 13 }}>
              {remind ? 'Напомним за 1 час' : 'Без напоминания'}
            </div>
          </div>
          <button onClick={() => navigate('/book/calendar')} style={{ background: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="#8E8E93" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 32px' }}>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: '100%', padding: 16, borderRadius: 14,
            background: loading ? '#1C1C1E' : '#2688EB',
            color: loading ? '#8E8E93' : '#fff',
            fontWeight: 600, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 2V5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 2V5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.21 15.77L15.67 19.31C15.53 19.45 15.4 19.71 15.37 19.9L15.18 21.25C15.11 21.74 15.45 22.08 15.94 22.01L17.29 21.82C17.48 21.79 17.75 21.66 17.88 21.52L21.42 17.98C22.03 17.37 22.32 16.66 21.42 15.76C20.53 14.87 19.82 15.16 19.21 15.77Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.7 16.28C19 17.36 19.84 18.2 20.92 18.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5V12" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.995 13.7H12.005" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.294 13.7H8.303" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.294 16.7H8.303" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {loading ? 'Записываем...' : 'Записаться'}
        </button>
      </div>
    </div>
  )
}
