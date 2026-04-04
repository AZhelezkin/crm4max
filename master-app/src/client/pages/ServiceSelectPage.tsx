import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master, Service } from '@client/types'
import { discountedPrice } from '@client/types'
import PageHeader from '@client/components/PageHeader'

export default function ServiceSelectPage() {
  const navigate = useNavigate()
  const { masterId, setService } = useBookingStore()
  const [master, setMaster] = useState<Master | null>(null)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => navigate('/'))
  }, [masterId, navigate])

  const handleSelect = (service: Service) => {
    setService(service)
    navigate('/book/calendar')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Выберите услугу" />

      <div style={{ padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {master?.categories.map((cat) => (
          <div key={cat.id}>
            {cat.name && (
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: 8, marginTop: 8,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {cat.name}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.services.map((s) => {
                const discounted = discountedPrice(s.price, s.discountPercent)
                const displayPrice = discounted ?? s.price
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    style={{
                      background: 'var(--color-card)',
                      borderRadius: 'var(--radius)',
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center',
                      gap: 12, textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {s.photo && (
                      <img src={s.photo} alt="" style={{
                        width: 56, height: 56, borderRadius: 12,
                        objectFit: 'cover', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: 17, color: 'var(--color-text)' }}>
                          {s.name}
                        </span>
                        {s.discountPercent && (
                          <span style={{
                            background: 'var(--color-danger)', color: '#fff',
                            borderRadius: 6, fontSize: 10, fontWeight: 700,
                            padding: '2px 6px', flexShrink: 0,
                          }}>
                            -{s.discountPercent}%
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <div style={{
                          color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 3,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                        }}>
                          {s.description}
                        </div>
                      )}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginTop: 4,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 17, fontWeight: 400, color: 'var(--color-text)' }}>
                            {(displayPrice / 100).toLocaleString('ru-RU')} ₽
                          </span>
                          {s.discountPercent && (
                            <span style={{
                              fontSize: 13, color: 'var(--color-text-secondary)',
                              textDecoration: 'line-through',
                            }}>
                              {(s.price / 100).toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                          {s.duration} мин
                        </span>
                      </div>
                    </div>
                    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M1 1l7 7-7 7" stroke="#7D7D7F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
