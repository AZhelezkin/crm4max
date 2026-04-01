import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Master } from '@/types'
import BottomNav from '@/components/BottomNav'

// Иконки кнопок действий (из Figma: calendar-2, call, message-text, more)
function IcoBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 8.5C3 5.46 5.46 3 8.5 3h7C18.54 3 21 5.46 21 8.5v7C21 18.54 18.54 21 15.5 21h-7C5.46 21 3 18.54 3 15.5v-7Z" fill="#007AFE" opacity="0.4"/>
      <path d="M8 2v3M16 2v3" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 9h18" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 13h2M8 17h5" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IcoCall() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.05 14.95L9.2 16.8c-.39.39-1.01.39-1.41.01-.11-.11-.22-.21-.33-.32a16.46 16.46 0 0 1-1.6-2.01c-.52-.82-1.01-1.81-1.38-2.91C4.17 10.56 4 9.52 4 8.53c0-.66.12-1.27.35-1.81a4.53 4.53 0 0 1 1.09-1.53C6.09 4.54 6.79 4.25 7.5 4.25c.25 0 .5.05.72.15.23.1.43.25.59.47l2.02 2.84c.16.22.28.43.36.63.09.19.13.38.13.55 0 .22-.06.44-.18.65-.11.21-.27.43-.48.65l-.65.67c-.1.1-.14.21-.14.34 0 .07.01.13.03.2.03.07.06.12.08.18.25.46.54.89.87 1.3.35.41.72.83 1.12 1.24.08.08.17.14.23.2ZM19.72 17.37c-.03.44-.13.87-.29 1.29-.16.42-.38.79-.66 1.11-.47.52-1 .73-1.55.73-.21 0-.42-.04-.62-.13L14.75 19c-.44-.2-.85-.43-1.22-.69a10.23 10.23 0 0 1-1.04-.88" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M19.75 14.5c0-.66-.13-1.3-.38-1.93a5.06 5.06 0 0 0-1.11-1.69M14.5 4.25c2.9.68 5.07 2.85 5.75 5.75" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IcoChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M17 3H7C4.24 3 2 5.24 2 8v6c0 2.76 2.24 5 5 5h1c.28 0 .64.18.82.42l1 1.33c.44.59 1.16.59 1.6 0l1-1.33c.2-.27.52-.42.82-.42h1c2.76 0 5-2.24 5-5V8c0-2.76-2.24-5-5-5Z" fill="#007AFE" opacity="0.4"/>
      <path d="M7 11h10M7 8h5" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
function IcoMore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2" fill="#007AFE"/>
      <circle cx="12" cy="12" r="2" fill="#007AFE"/>
      <circle cx="19" cy="12" r="2" fill="#007AFE"/>
    </svg>
  )
}

const TAB_KEYS = ['services', 'photo', 'reviews', 'myBookings', 'portfolio'] as const
type Tab = typeof TAB_KEYS[number]
const TAB_LABELS: Record<Tab, string> = {
  services: 'Услуги',
  photo: 'Фото',
  reviews: 'Отзывы',
  myBookings: 'Мои записи',
  portfolio: 'Портфолио',
}

export default function MasterCardPage() {
  const [params] = useSearchParams()
  const masterId = window.WebApp?.initDataUnsafe?.start_param ?? params.get('masterId') ?? ''
  const navigate = useNavigate()
  const { setMasterId } = useBookingStore()

  const [master, setMaster] = useState<Master | null>(null)
  const [tab, setTab] = useState<Tab>('services')

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const handleBook = () => {
    setMasterId(masterId)
    navigate('/book/services')
  }

  if (!masterId) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>Откройте приложение через бота</span>
    </div>
  )

  if (!master) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>Загрузка...</span>
    </div>
  )

  const workPhotos = master.categories.flatMap((c) =>
    c.services.flatMap((s) => (s as any).workPhotos ?? [])
  )
  const serviceCount = master.categories.reduce((n, c) => n + c.services.length, 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 95 }}>

      {/* Шапка TopBar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-bg)',
        padding: '48px 16px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {master.rating > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--color-card)', borderRadius: 20,
              padding: '6px 12px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF9500">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#FF9500' }}>
                {master.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Аватар + имя + специальность */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            background: 'var(--color-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 0 0 3px var(--color-bg), 0 0 0 5px var(--color-border)',
          }}>
            {master.photo
              ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 48, color: 'var(--color-text-secondary)' }}>👤</span>
            }
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {master.name}
          </h1>
          {master.description && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 400, marginTop: 4 }}>
              {master.description}
            </p>
          )}
          {master.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="#7D7D7F"/>
              </svg>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{master.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 кнопки действий */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0' }}>
        {([
          { label: 'Запись',  Icon: IcoBook,  action: handleBook },
          { label: 'Звонок',  Icon: IcoCall,  action: () => {} },
          { label: 'Чат',     Icon: IcoChat,  action: () => navigate('/messages') },
          { label: 'Ещё',     Icon: IcoMore,  action: () => {} },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              flex: 1,
              background: 'var(--color-card)',
              borderRadius: 18,
              padding: '14px 4px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}
          >
            <btn.Icon />
            <span style={{ fontSize: 14, fontWeight: 400, color: '#007AFE' }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Табы (5 штук: Услуги, Фото, Отзывы, Мои записи, Портфолио) */}
      <div style={{
        display: 'flex',
        marginTop: 16,
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingInline: 16,
        gap: 0,
      }}>
        {TAB_KEYS.map((key) => {
          const active = tab === key
          let badge = 0
          if (key === 'services') badge = serviceCount
          if (key === 'photo') badge = workPhotos.length
          if (key === 'reviews') badge = master.reviews.length
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flexShrink: 0,
                padding: '10px 12px 0',
                background: 'none',
                fontSize: 15, fontWeight: 500,
                color: active ? '#007AFE' : 'var(--color-text-secondary)',
                borderBottom: active ? '3px solid #007AFE' : '3px solid transparent',
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 5,
                paddingBottom: 10,
              }}
            >
              {TAB_LABELS[key]}
              {badge > 0 && (
                <span style={{
                  background: active ? '#007AFE' : 'var(--color-card)',
                  color: active ? '#fff' : 'var(--color-text-secondary)',
                  borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '1px 7px',
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
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
                    background: 'var(--color-card)',
                    borderRadius: 'var(--radius)',
                    padding: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  {cat.photo && (
                    <img src={cat.photo} alt="" style={{
                      width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>{cat.name}</span>
                      {hasDiscount && (
                        <span style={{
                          background: 'var(--color-danger)', color: '#fff',
                          borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 6px',
                        }}>
                          % скидки
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                      {cat.services.slice(0, 2).map((s) => s.name).join(', ')}
                      {cat.services.length > 2 ? '...' : ''}
                    </div>
                    {cat.services[0] && (
                      <div style={{ color: 'var(--color-text)', fontSize: 17, marginTop: 4 }}>
                        {(cat.services[0].price / 100).toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                  </div>
                  <svg width="9" height="16" viewBox="0 0 9 16" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1 1l7 7-7 7" stroke="#7D7D7F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )
            })}
          </div>
        )}

        {/* Фото */}
        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>Нет фотографий</div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 3, margin: '0 -16px',
            }}>
              {workPhotos.map((p: any) => (
                <div key={p.id} style={{ aspectRatio: '134/170', overflow: 'hidden' }}>
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
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }}>Пока нет отзывов</div>
            )}
            {master.reviews.map((r) => (
              <div key={r.id} style={{ background: 'var(--color-card)', borderRadius: 'var(--radius)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--color-border)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {r.client.photo
                      ? <img src={r.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>👤</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text)' }}>{r.client.name}</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < r.rating ? '#FF9500' : '#3A3A3C'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {r.text && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Мои записи / Портфолио — заглушки */}
        {(tab === 'myBookings' || tab === 'portfolio') && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>
            Раздел в разработке
          </div>
        )}
      </div>

      {/* Фиксированная кнопка Записаться */}
      <div style={{
        position: 'fixed', bottom: 95, left: 0, right: 0,
        padding: '12px 16px',
        background: `linear-gradient(to top, var(--color-bg) 60%, transparent)`,
      }}>
        <button
          onClick={handleBook}
          style={{
            width: '100%', padding: '16px', borderRadius: 'var(--radius-btn)',
            background: '#007AFE', color: '#fff', fontWeight: 600, fontSize: 17,
          }}
        >
          Записаться
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
