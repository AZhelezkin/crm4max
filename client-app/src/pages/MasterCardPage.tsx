import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@/api/masters.api'
import { useBookingStore } from '@/store/booking.store'
import type { Master } from '@/types'
import BottomNav from '@/components/BottomNav'

// vuesax/linear icons (как в Figma — action buttons мастера)
function IcoBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.69 13.7h.01M15.69 16.7h.01M11.99 13.7h.01M11.99 16.7h.01M8.29 13.7h.01M8.29 16.7h.01" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoCall() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21.97 18.33c0 .36-.08.71-.25 1.05-.17.34-.39.66-.68.96-.49.54-1.03.8-1.6.8-.42 0-.87-.1-1.35-.31-.48-.21-.96-.5-1.41-.88a23.7 23.7 0 0 1-1.35-1.32 23.2 23.2 0 0 1-1.31-1.35c-.37-.45-.66-.9-.86-1.33-.2-.44-.3-.86-.3-1.26 0-.39.09-.76.27-1.1.18-.34.44-.65.79-.92L15.1 12c.24-.24.5-.36.78-.36.35 0 .63.17.9.5l1.87 2.5c.27.34.4.65.4.95 0 .37-.14.72-.43 1.06l-.44.47a.84.84 0 0 0-.19.56c0 .11.02.21.05.32.04.11.08.19.11.27.27.5.57.97.9 1.41.34.44.69.87 1.07 1.3.38.42.77.81 1.18 1.17.41.36.82.64 1.24.84l.24.08c.1.03.2.04.31.04Z" stroke="#007AFE" strokeWidth="1.5"/>
      <path d="M20.97 4.48c.55.96.87 2.06.87 3.22 0 2.25-1.09 4.25-2.77 5.5" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.7 7.7c0 .74-.23 1.43-.62 2" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8c-4 0-6-1-6-6V8c0-4 2-6 6-6h8c4 0 6 2 6 6v5c0 4-2 6-6 6h-.5c-.31 0-.61.15-.8.4l-1.5 2c-.66.88-1.74.88-2.4 0l-1.5-2c-.16-.22-.53-.4-.8-.4Z" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8h10M7 13h6" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoMore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM19 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Табы по Figma: Услуги | Фото | Отзывы
const TABS = ['services', 'photo', 'reviews'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = {
  services: 'Услуги',
  photo: 'Фото',
  reviews: 'Отзывы',
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

  const tabBadge = (t: Tab) => {
    if (t === 'photo') return workPhotos.length
    if (t === 'reviews') return master.reviews.length
    return 0
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 95 }}>

      {/* TopBar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-bg)',
        paddingTop: 48, paddingBottom: 12,
        paddingInline: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9.57 5.93L3.5 12l6.07 6.07M20.5 12H3.67" stroke="#D3D4D6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Рейтинг справа */}
        {master.rating > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginRight: 16,
          }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#D3D4D6' }}>
              {master.rating.toFixed(1)}
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={i < Math.round(master.rating) ? '#FF9500' : '#3A3A3C'}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Аватар + имя + описание — по центру */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'var(--color-card)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 44, color: 'var(--color-text-secondary)' }}>👤</span>
          }
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#D3D4D6', lineHeight: 1.2 }}>
            {master.name}
          </div>
          {master.description && (
            <div style={{ fontSize: 15, fontWeight: 400, color: '#7D7D7F', marginTop: 4 }}>
              {master.description}
            </div>
          )}
        </div>
      </div>

      {/* 4 кнопки действий — карточки 89x69 r:18 */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {([
          { label: 'Запись', Icon: IcoBook,  action: handleBook },
          { label: 'Звонок', Icon: IcoCall,  action: () => {} },
          { label: 'Чат',    Icon: IcoChat,  action: () => navigate('/messages') },
          { label: 'Ещё',    Icon: IcoMore,  action: () => {} },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              flex: 1, height: 69,
              background: '#25262B',
              borderRadius: 18,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <btn.Icon />
            <span style={{ fontSize: 14, fontWeight: 400, color: '#007AFE' }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Табы: Услуги | Фото | Отзывы */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingLeft: 16,
      }}>
        {TABS.map((key, idx) => {
          const active = tab === key
          const badge = tabBadge(key)
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flexShrink: 0,
                paddingTop: 10,
                paddingBottom: 14,
                paddingLeft: idx === 0 ? 0 : 20,
                paddingRight: 20,
                background: 'none',
                fontSize: 17, fontWeight: 500,
                color: active ? '#007AFE' : '#7D7D7F',
                borderBottom: active ? '2px solid #007AFE' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {TAB_LABELS[key]}
              {badge > 0 && (
                <span style={{
                  background: active ? '#007AFE' : '#45475B',
                  color: active ? '#fff' : '#7D7D7F',
                  borderRadius: 20, fontSize: 13, fontWeight: 400,
                  padding: '1px 7px', minWidth: 23, textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Контент */}
      <div style={{ padding: '12px 16px 0' }}>

        {/* Услуги — список категорий, карточки 384x78 r:20 как в Figma */}
        {tab === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {master.categories.map((cat) => {
              const hasDiscount = cat.services.some((s) => s.discountPercent)
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setMasterId(masterId)
                    navigate('/book/services', { state: { categoryId: cat.id } })
                  }}
                  style={{
                    background: 'rgba(37,38,43,0.6)',
                    borderRadius: 20,
                    height: 78,
                    padding: '0 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', textAlign: 'left',
                  }}
                >
                  {/* Аватар категории 46x46 r:100 */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-border)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {cat.photo
                      ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>✂️</span>
                    }
                  </div>

                  {/* Название + услуги */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 500, color: '#D3D4D6' }}>{cat.name}</span>
                      {hasDiscount && (
                        <span style={{
                          background: '#CE4259', color: '#fff',
                          borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 6px',
                        }}>
                          Скидка
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: '#7D7D7F', marginTop: 2 }}>
                      {cat.services.slice(0, 2).map((s) => s.name).join(', ')}
                      {cat.services.length > 2 ? '...' : ''}
                    </div>
                  </div>

                  {/* Стрелка */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M8.91 19.92l6.52-6.52c.77-.77.77-2.03 0-2.8L8.91 4.08" stroke="#7D7D7F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )
            })}
          </div>
        )}

        {/* Фото — сетка 3 колонки */}
        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>
              Нет фотографий
            </div>
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
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }}>
                Пока нет отзывов
              </div>
            )}
            {master.reviews.map((r) => (
              <div key={r.id} style={{ background: '#25262B', borderRadius: 20, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--color-border)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {r.client.photo
                      ? <img src={r.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20 }}>👤</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#D3D4D6' }}>{r.client.name}</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < r.rating ? '#FF9500' : '#3A3A3C'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {r.text && (
                  <p style={{ fontSize: 15, color: '#7D7D7F', lineHeight: 1.5, margin: 0 }}>{r.text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
