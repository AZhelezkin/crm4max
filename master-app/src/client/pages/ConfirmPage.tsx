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
    <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px', position: 'sticky', top: 0, zIndex: 10, background: '#000',
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: '#2688EB', fontSize: 22 }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 17 }}>Подтверждение</div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>{service.name}</div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#2C2C2E', borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8E8E93', fontSize: 16,
          }}
        >✕</button>
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
          📅 {loading ? 'Записываем...' : 'Записаться'}
        </button>
      </div>
    </div>
  )
}
