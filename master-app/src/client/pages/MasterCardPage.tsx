import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Category, Master, Service } from '@client/types'
import BottomNav from '@client/components/BottomNav'

/* ── Иконки кнопок действий (stroke #007AFE, 24×24) ───────────────────────── */

function IcoBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 2V5" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 9.09H20.5" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.21 15.77L15.67 19.31C15.53 19.45 15.4 19.71 15.37 19.9L15.18 21.25C15.11 21.74 15.45 22.08 15.94 22.01L17.29 21.82C17.48 21.79 17.75 21.66 17.88 21.52L21.42 17.98C22.03 17.37 22.32 16.66 21.42 15.76C20.53 14.87 19.82 15.16 19.21 15.77Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.7 16.28C19 17.36 19.84 18.2 20.92 18.5" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5V12" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.995 13.7H12.005" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.294 13.7H8.303" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.294 16.7H8.303" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoCall() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10"/>
    </svg>
  )
}
function IcoChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8H17M7 13H13" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

/* ── Типы ──────────────────────────────────────────────────────────────────── */

const TABS = ['services', 'photo', 'reviews'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { services: 'Услуги', photo: 'Фото', reviews: 'Отзывы' }

/* ── Страница ──────────────────────────────────────────────────────────────── */

export default function MasterCardPage() {
  const [params] = useSearchParams()
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const startParam = window.WebApp?.initDataUnsafe?.start_param ?? ''
  const masterId = (UUID_REGEX.test(startParam) ? startParam : null) ?? params.get('masterId') ?? ''
  const navigate = useNavigate()
  const { setMasterId, setService } = useBookingStore()

  const [master, setMaster] = useState<Master | null>(null)
  const [tab, setTab] = useState<Tab>('services')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const lbStripRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  const workPhotos = (master?.categories ?? [])
    .flatMap((c) => c.services)
    .flatMap((s) => (s as any).workPhotos ?? [])
    .sort((a: any, b: any) => a.order - b.order)

  const handleBook = (service?: Service) => {
    setMasterId(masterId)
    if (service) {
      setService(service)
      navigate('/book/calendar')
    } else {
      navigate('/book/categories')
    }
  }

  const tabBadge = (t: Tab) => {
    if (!master) return 0
    if (t === 'services') return master.categories.flatMap((c) => c.services).length
    if (t === 'photo') return workPhotos.length
    if (t === 'reviews') return master.reviews.length
    return 0
  }

  /* ── Lightbox touch ────────────────────────────────────────────────────── */
  function onLbStart(e: React.TouchEvent) {
    e.stopPropagation()
    const t = e.touches[0]
    lbTouch.current = { startX: t.clientX, startY: t.clientY, dir: null, moved: false }
    if (lbStripRef.current) lbStripRef.current.style.transition = 'none'
  }
  function onLbMove(e: React.TouchEvent) {
    e.stopPropagation()
    const dx = e.touches[0].clientX - lbTouch.current.startX
    const dy = e.touches[0].clientY - lbTouch.current.startY
    lbTouch.current.moved = true
    if (!lbTouch.current.dir) {
      if (Math.abs(dx) > Math.abs(dy) + 5) lbTouch.current.dir = 'h'
      else lbTouch.current.dir = 'v'
    }
    if (lbTouch.current.dir === 'h' && lbStripRef.current)
      lbStripRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`
  }
  function onLbEnd(e: React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    const { startX, dir } = lbTouch.current
    const dx = e.changedTouches[0].clientX - startX
    if (dir !== 'h') return
    const W = window.innerWidth
    const goNext = dx < -60 && lightboxIndex! < workPhotos.length - 1
    const goPrev = dx > 60 && lightboxIndex! > 0
    if (goNext || goPrev) {
      if (lbStripRef.current) {
        lbStripRef.current.style.transition = 'transform 0.25s ease'
        lbStripRef.current.style.transform = `translateX(calc(-100vw + ${goNext ? -W : W}px))`
      }
      setTimeout(() => {
        setLightboxIndex(i => i !== null ? i + (goNext ? 1 : -1) : null)
        if (lbStripRef.current) {
          lbStripRef.current.style.transition = 'none'
          lbStripRef.current.style.transform = 'translateX(-100vw)'
        }
      }, 250)
    } else if (lbStripRef.current) {
      lbStripRef.current.style.transition = 'transform 0.3s ease'
      lbStripRef.current.style.transform = 'translateX(-100vw)'
    }
  }

  /* ── Загрузка / ошибки ─────────────────────────────────────────────────── */

  if (!masterId) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: '#0F0F11' }}>
      <span style={{ color: '#7D7D7F' }}>Откройте приложение через бота</span>
    </div>
  )
  if (!master) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', background: '#0F0F11' }}>
      <span style={{ color: '#7D7D7F' }}>Загрузка...</span>
    </div>
  )

  /* ── Рендер ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', paddingBottom: 95 }}>

      {/* ── Шапка: рейтинг ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', padding: '16px 14px 0' }}>
        {master.rating > 0 && (
          <div style={{
            position: 'absolute', top: 16, right: 14,
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#25262B', borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ color: '#F0AF2D', fontSize: 14 }}>★</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#D3D4D6' }}>{master.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* ── Аватар ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 28 }}>
        <div style={{
          width: 104, height: 104, borderRadius: 52,
          overflow: 'hidden', background: '#25262B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 44, color: '#7D7D7F' }}>👤</span>
          }
        </div>
      </div>

      {/* ── Имя + описание ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#D3D4D6', lineHeight: 1.2 }}>
          {master.name}
        </div>
        {master.description && (
          <div style={{ fontSize: 15, color: '#7D7D7F', marginTop: 6, padding: '0 14px' }}>
            {master.description}
          </div>
        )}
      </div>

      {/* ── 4 кнопки действий (89×69, gap 9, rx 18) ──────────────────── */}
      <div style={{ display: 'flex', gap: 9, padding: '20px 14px 0' }}>
        {([
          { label: 'Запись',  Icon: IcoBook, action: () => handleBook() },
          { label: 'Звонок', Icon: IcoCall, action: () => {
            if (master.phone)
              window.WebApp?.openLink(`tel:${master.phone.replace(/\D/g, '').replace(/^7/, '+7')}`)
          }, disabled: !master.phone },
          { label: 'Чат',    Icon: IcoChat, action: () => {
            window.WebApp?.openMaxLink('https://max.ru/u/f9LHodD0cOIigfttbzyjUqKELI60m9aczxqqW1rkNwoQQg8IKRZa3afRH24')
          } },
          { label: 'Ещё',    Icon: IcoMore, action: () => {} },
        ] as const).map((btn) => {
          const dis = 'disabled' in btn ? btn.disabled : false
          return (
            <button
              key={btn.label}
              onClick={btn.action}
              disabled={dis}
              style={{
                flex: 1, height: 69, background: '#25262B', borderRadius: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: 'none', cursor: dis ? 'default' : 'pointer',
                opacity: dis ? 0.4 : 1, padding: 0,
              }}
            >
              <btn.Icon />
              <span style={{ fontSize: 14, fontWeight: 400, color: '#007AFE' }}>{btn.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Табы (Услуги / Фото / Отзывы) ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, padding: '20px 14px 0',
      }}>
        {TABS.map((key) => {
          const active = tab === key
          const badge = tabBadge(key)
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 'none', background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 12 }}>
                <span style={{
                  fontSize: 17, fontWeight: 500,
                  color: active ? '#007AFE' : '#7D7D7F',
                }}>
                  {TAB_LABELS[key]}
                </span>
                {badge > 0 && (
                  <span style={{
                    background: active ? 'rgba(0,122,254,0.3)' : '#454757',
                    color: active ? '#007AFE' : '#7D7D7F',
                    borderRadius: 11.5, fontSize: 13, fontWeight: 500,
                    padding: '2px 8px', minWidth: 24, textAlign: 'center',
                    lineHeight: '19px',
                  }}>
                    {badge}
                  </span>
                )}
              </div>
              <div style={{
                width: '100%', height: 3,
                background: active ? '#007AFE' : 'transparent',
                borderRadius: '3px 3px 0 0',
              }} />
            </button>
          )
        })}
      </div>

      {/* ── Контент табов ──────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px 0' }}>

        {tab === 'services' && (
          <ServicesList categories={master.categories} onCategoryClick={(cat) => {
            setMasterId(masterId)
            navigate(`/book/services?categoryId=${cat.id}`)
          }} />
        )}

        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>Нет фотографий</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, margin: '0 -14px' }}>
              {workPhotos.map((p: any, i: number) => (
                <div key={p.id} style={{ aspectRatio: '134/170', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIndex(i)}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {master.reviews.length === 0 && (
              <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 32 }}>Пока нет отзывов</div>
            )}
            {master.reviews.map((r) => (
              <div key={r.id} style={{ background: '#25262B', borderRadius: 20, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 23,
                    background: '#454757', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {r.client.photo
                      ? <img src={r.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20, color: '#7D7D7F' }}>👤</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#D3D4D6' }}>{r.client.name}</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < r.rating ? '#F0AF2D' : '#454757'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {r.text && <p style={{ fontSize: 15, color: '#7D7D7F', lineHeight: 1.5, margin: 0 }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* ── Лайтбокс ──────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div
          onTouchStart={onLbStart}
          onTouchMove={onLbMove}
          onTouchEnd={onLbEnd}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', overflow: 'hidden', touchAction: 'none' }}
        >
          <button
            onTouchEnd={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 1l14 14M15 1L1 15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div
            ref={lbStripRef}
            style={{ display: 'flex', width: '300vw', height: '100%', transform: 'translateX(-100vw)', willChange: 'transform' }}
          >
            {[lightboxIndex - 1, lightboxIndex, lightboxIndex + 1].map((idx) => (
              <div key={idx} style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {workPhotos[idx] && (
                  <img src={(workPhotos[idx] as any).url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                )}
              </div>
            ))}
          </div>
          {workPhotos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', gap: 6, justifyContent: 'center', pointerEvents: 'none' }}>
              {workPhotos.map((_: any, i: number) => (
                <div key={i} style={{
                  width: i === lightboxIndex ? 8 : 6, height: i === lightboxIndex ? 8 : 6,
                  borderRadius: '50%',
                  background: i === lightboxIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s',
                }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── ServicesList ──────────────────────────────────────────────────────────── */

function ServicesList({ categories, onCategoryClick }: { categories: Category[]; onCategoryClick: (cat: Category) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {categories.map((cat) => {
        const hasDiscount = cat.services.some((s) => s.discountPercent)
        const preview = cat.services.map((s) => s.name).join(' • ')

        return (
          <div
            key={cat.id}
            onClick={() => onCategoryClick(cat)}
            style={{
              display: 'flex', alignItems: 'center',
              background: '#25262B',
              borderRadius: 20,
              minHeight: 78, padding: '0 16px 0 0',
              cursor: 'pointer',
            }}
          >
            {/* Аватар категории 46×46 */}
            <div style={{
              width: 46, height: 46, borderRadius: 23, flexShrink: 0,
              overflow: 'hidden', background: '#454757',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 12px 0 16px',
            }}>
              {cat.photo
                ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 22 }}>✂️</span>
              }
            </div>

            {/* Название + описание */}
            <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>{cat.name}</span>
                {hasDiscount && (
                  <span style={{
                    background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                    fontSize: 11, fontWeight: 700, borderRadius: 6,
                    padding: '2px 8px', lineHeight: '18px',
                  }}>
                    % скидки
                  </span>
                )}
              </div>
              <div style={{
                color: '#7D7D7F', fontSize: 13,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {cat.description || preview}
              </div>
            </div>

            {/* Шеврон */}
            <div style={{ flexShrink: 0, marginLeft: 8 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}
