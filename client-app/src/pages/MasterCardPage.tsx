import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Master } from '@/types'
import { discountedPrice } from '@/types'
import BottomNav from '@/components/BottomNav'

export default function MasterCardPage() {
  const [params] = useSearchParams()
  const masterId = window.WebApp?.initDataUnsafe?.start_param ?? params.get('masterId') ?? ''
  const navigate = useNavigate()
  const { setMasterId } = useBookingStore()

  const [master, setMaster] = useState<Master | null>(null)
  const [tab, setTab] = useState<'services' | 'photo' | 'reviews'>('services')

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const handleBook = () => {
    setMasterId(masterId)
    navigate('/book/services')
  }

  if (!masterId) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: '#8E8E93' }}>Откройте приложение через бота</span>
    </div>
  )

  if (!master) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: '#8E8E93' }}>Загрузка...</span>
    </div>
  )

  // Collect all work photos across all services
  const workPhotos = master.categories.flatMap((c) =>
    c.services.flatMap((s) => (s as any).workPhotos ?? [])
  )

  // Count total services
  const serviceCount = master.categories.reduce((n, c) => n + c.services.length, 0)

  return (
    <div style={{ minHeight: '100dvh', background: '#000', paddingBottom: 80 }}>
      {/* Шапка */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: '#2688EB', fontSize: 20 }}>←</button>
        {master.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FF9500', fontSize: 15, fontWeight: 600 }}>
            <span>★</span>
            <span>{master.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Аватар + имя */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 16px 0', gap: 10 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
          background: '#2C2C2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👤'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{master.name}</h1>
          {master.description && (
            <p style={{ color: '#8E8E93', fontSize: 14, marginTop: 4 }}>{master.description}</p>
          )}
          {master.location && (
            <p style={{ color: '#8E8E93', fontSize: 13, marginTop: 4 }}>📍 {master.location}</p>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0' }}>
        {[
          { label: 'Запись', icon: '📅', action: handleBook },
          { label: 'Звонок', icon: '📞', action: () => {} },
          { label: 'Чат', icon: '💬', action: () => navigate('/messages') },
          { label: 'Ещё', icon: '···', action: () => {} },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              flex: 1, background: '#1C1C1E', borderRadius: 12,
              padding: '10px 4px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4, color: '#2688EB',
            }}
          >
            <span style={{ fontSize: 20 }}>{btn.icon}</span>
            <span style={{ fontSize: 11, color: '#8E8E93' }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Табы */}
      <div style={{
        display: 'flex', marginTop: 16,
        borderBottom: '1px solid #2C2C2E',
        paddingInline: 16,
      }}>
        {([
          { key: 'services', label: `Услуги`, badge: serviceCount },
          { key: 'photo', label: 'Фото', badge: workPhotos.length },
          { key: 'reviews', label: 'Отзывы', badge: master.reviews.length },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', fontSize: 14, fontWeight: 500,
              color: tab === t.key ? '#2688EB' : '#8E8E93',
              borderBottom: tab === t.key ? '2px solid #2688EB' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.badge > 0 && (
              <span style={{
                background: tab === t.key ? '#2688EB' : '#2C2C2E',
                color: tab === t.key ? '#fff' : '#8E8E93',
                borderRadius: 20, fontSize: 11, fontWeight: 600,
                padding: '1px 6px',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <div style={{ padding: '12px 16px 0' }}>
        {/* Услуги */}
        {tab === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {master.categories.map((cat) => {
              const hasDiscount = cat.services.some((s) => s.discountPercent)
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setMasterId(masterId)
                    navigate('/book/services', { state: { categoryId: cat.id } })
                  }}
                  style={{
                    background: '#1C1C1E', borderRadius: 14,
                    padding: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  {(cat as any).photo && (
                    <img
                      src={(cat as any).photo}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{cat.name}</span>
                      {hasDiscount && (
                        <span style={{
                          background: '#FF3B30', color: '#fff',
                          borderRadius: 6, fontSize: 10, fontWeight: 700,
                          padding: '2px 6px',
                        }}>
                          % скидки
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#8E8E93', fontSize: 13, marginTop: 3 }}>
                      {cat.services.slice(0, 2).map((s) => s.name).join(', ')}
                      {cat.services.length > 2 ? '...' : ''}
                    </div>
                  </div>
                  <span style={{ color: '#8E8E93', fontSize: 20 }}>›</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Фото */}
        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8E8E93', marginTop: 40 }}>Нет фотографий</div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 3, margin: '0 -16px',
            }}>
              {workPhotos.map((p: any) => (
                <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )
        )}

        {/* Отзывы */}
        {tab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {master.reviews.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8E8E93', marginTop: 32 }}>Пока нет отзывов</div>
            )}
            {master.reviews.map((r) => (
              <div key={r.id} style={{ background: '#1C1C1E', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#2C2C2E',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {r.client.photo
                      ? <img src={r.client.photo} alt="" style={{ width: '100%', objectFit: 'cover' }} />
                      : '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{r.client.name}</div>
                    <div style={{ color: '#FF9500', fontSize: 13 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  </div>
                </div>
                {r.text && <p style={{ fontSize: 14, color: '#8E8E93', lineHeight: 1.5 }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Кнопка Записаться */}
      <div style={{
        position: 'fixed', bottom: 60, left: 0, right: 0,
        padding: '12px 16px',
        background: 'linear-gradient(to top, #000 60%, transparent)',
      }}>
        <button
          onClick={handleBook}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            background: '#2688EB', color: '#fff', fontWeight: 600, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          📅 Записаться
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
