import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Master } from '@/types'

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

  const handleMyBookings = () => {
    reset()
    navigate('/my-bookings')
  }

  const formattedDate = dayjs(date).format('D MMMM, dddd')

  return (
    <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* Шапка: "Вы записаны!" */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#1E3A1E', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Вы записаны!</div>
            <div style={{ color: '#8E8E93', fontSize: 13 }}>Не опаздывайте 😏</div>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'none', color: '#8E8E93', fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Мастер */}
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

        {/* Услуга + статус оплаты */}
        {service && (
          <div style={{ background: '#1C1C1E', borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{service.name}</div>
            {service.description && (
              <div style={{ color: '#8E8E93', fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
                {service.description}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600 }}>
                {(service.price / 100).toLocaleString('ru-RU')} ₽
              </span>
              <span style={{
                background: '#3A0A0A', color: '#FF3B30',
                borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 8px',
              }}>
                НЕ ОПЛАЧЕНО
              </span>
            </div>
          </div>
        )}

        {/* Дата */}
        <div style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600 }}>{formattedDate}</div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>Дата</div>
        </div>

        {/* Время */}
        <div style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontWeight: 600 }}>{time}</div>
          <div style={{ color: '#8E8E93', fontSize: 13 }}>
            {remind ? 'Напомним за 1 час' : 'Без напоминания'}
          </div>
        </div>
      </div>

      {/* 4 иконки + кнопка Оплатить */}
      <div style={{ padding: '8px 16px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {/* Записаться снова */}
          <button
            onClick={() => navigate('/')}
            style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="3" stroke="#2688EB" strokeWidth="2" />
              <path d="M3 9h18" stroke="#2688EB" strokeWidth="2" />
              <path d="M8 2v4M16 2v4" stroke="#2688EB" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {/* Перенести */}
          <button
            style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="#2688EB" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" stroke="#2688EB" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Написать */}
          <button
            onClick={() => navigate('/messages')}
            style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2z" stroke="#2688EB" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Отменить */}
          <button
            onClick={handleClose}
            style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#FF3B30" strokeWidth="2" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button
          onClick={handleMyBookings}
          style={{
            width: '100%', padding: 16, borderRadius: 14,
            background: '#2688EB', color: '#fff', fontWeight: 600, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="6" width="20" height="14" rx="3" stroke="#fff" strokeWidth="2" />
            <path d="M2 10h20" stroke="#fff" strokeWidth="2" />
          </svg>
          Оплатить
        </button>
      </div>
    </div>
  )
}
