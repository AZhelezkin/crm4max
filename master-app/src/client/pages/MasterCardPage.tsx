import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { mastersApi } from '@client/api/masters.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Category, Master, Service } from '@client/types'
import { discountedPrice, formatPrice, formatDuration } from '@client/types'
import BottomNav from '@client/components/BottomNav'

function IcoBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5M16 2V5M3.5 9.09H20.5" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="#007AFE" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 13.7H12.01M8.3 13.7H8.31M8.3 16.7H8.31" stroke="#007AFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
function IcoDirections() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" fill="#007AFE" fillOpacity="0.4"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill="#007AFE"/>
    </svg>
  )
}

const TABS = ['services', 'photo', 'reviews'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { services: 'Услуги', photo: 'Фото', reviews: 'Отзывы' }

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
  const lbStripRef   = useRef<HTMLDivElement>(null)
  const lbOverlayRef = useRef<HTMLDivElement>(null)
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
      navigate('/book/services')
    }
  }

  // Lightbox touch handlers
  function onLbStart(e: React.TouchEvent) {
    e.stopPropagation()
    const t = e.touches[0]
    lbTouch.current = { startX: t.clientX, startY: t.clientY, dir: null, moved: false }
    if (lbStripRef.current)   lbStripRef.current.style.transition = 'none'
    if (lbOverlayRef.current) lbOverlayRef.current.style.transition = 'none'
  }
  function onLbMove(e: React.TouchEvent) {
    e.stopPropagation()
    const dx = e.touches[0].clientX - lbTouch.current.startX
    const dy = e.touches[0].clientY - lbTouch.current.startY
    lbTouch.current.moved = true
    if (!lbTouch.current.dir) {
      if (Math.abs(dx) > Math.abs(dy) + 5) lbTouch.current.dir = 'h'
      else if (Math.abs(dy) > Math.abs(dx) + 5) lbTouch.current.dir = 'v'
      else return
    }
    if (lbTouch.current.dir === 'h' && lbStripRef.current)
      lbStripRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`
    if (lbTouch.current.dir === 'v' && lbOverlayRef.current) {
      const p = Math.max(0, dy)
      lbOverlayRef.current.style.transform = `translateY(${p}px)`
      lbOverlayRef.current.style.opacity = String(Math.max(0, 1 - p / 300))
    }
  }
  function onLbEnd(e: React.TouchEvent) {
    e.preventDefault(); e.stopPropagation()
    const { startX, startY, dir, moved } = lbTouch.current
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    if (!moved) { setLightboxIndex(null); return }
    if (dir === 'v') {
      if (dy > 100 && lbOverlayRef.current) {
        lbOverlayRef.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
        lbOverlayRef.current.style.transform = 'translateY(100%)'
        lbOverlayRef.current.style.opacity = '0'
        setTimeout(() => setLightboxIndex(null), 250)
      } else if (lbOverlayRef.current) {
        lbOverlayRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease'
        lbOverlayRef.current.style.transform = 'translateY(0)'
        lbOverlayRef.current.style.opacity = '1'
      }
      return
    }
    if (dir === 'h') {
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

  const tabBadge = (t: Tab) => {
    if (t === 'photo') return workPhotos.length
    if (t === 'reviews') return master.reviews.length
    return 0
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: 80 }}>

      {/* Аватар + рейтинг + имя */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 16, textAlign: 'center' }}>
        {master.rating > 0 && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--color-card)', borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ color: '#FFD60A', fontSize: 14 }}>★</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#D3D4D6' }}>{master.rating.toFixed(1)}</span>
          </div>
        )}

        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'var(--color-card)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 44, color: 'var(--color-text-secondary)' }}>👤</span>
          }
        </div>

        <div style={{ fontSize: 28, fontWeight: 600, color: '#D3D4D6', lineHeight: 1.2 }}>{master.name}</div>
        {master.description && (
          <div style={{ fontSize: 15, color: '#7D7D7F', marginTop: 4, padding: '0 24px' }}>{master.description}</div>
        )}
      </div>

      {/* 4 кнопки действий */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {([
          { label: 'Запись',        Icon: IcoBook,       action: () => handleBook() },
          { label: 'Звонок',        Icon: IcoCall,       action: () => {} },
          { label: 'Чат',           Icon: IcoChat,       action: () => navigate('/messages') },
          { label: 'Как добраться', Icon: IcoDirections, action: () => {
            if (master.lat && master.lng)
              window.location.href = `geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`
          }, disabled: !master.lat || !master.lng },
        ] as const).map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={'disabled' in btn ? btn.disabled : false}
            style={{
              flex: 1, height: 69, background: '#25262B', borderRadius: 18,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: 'none', cursor: 'disabled' in btn && btn.disabled ? 'default' : 'pointer',
              opacity: 'disabled' in btn && btn.disabled ? 0.4 : 1,
            }}
          >
            <btn.Icon />
            <span style={{ fontSize: 14, fontWeight: 400, color: '#007AFE' }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Табы */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', overflowX: 'auto', scrollbarWidth: 'none', paddingLeft: 16 }}>
        {TABS.map((key, idx) => {
          const active = tab === key
          const badge = tabBadge(key)
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flexShrink: 0,
                paddingTop: 10, paddingBottom: 14,
                paddingLeft: idx === 0 ? 0 : 20, paddingRight: 20,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 17, fontWeight: 500,
                color: active ? '#007AFE' : '#7D7D7F',
                borderBottom: active ? '2px solid #007AFE' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
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

      {/* Контент табов */}
      <div style={{ padding: '12px 16px 0' }}>

        {tab === 'services' && (
          <ServicesList categories={master.categories} onBook={handleBook} />
        )}

        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>Нет фотографий</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, margin: '0 -16px' }}>
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
              <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 32 }}>Пока нет отзывов</div>
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
                {r.text && <p style={{ fontSize: 15, color: '#7D7D7F', lineHeight: 1.5, margin: 0 }}>{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Лайтбокс */}
      {lightboxIndex !== null && (
        <div
          ref={lbOverlayRef}
          onTouchStart={onLbStart}
          onTouchMove={onLbMove}
          onTouchEnd={onLbEnd}
          onClick={() => setLightboxIndex(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', overflow: 'hidden' }}
        >
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

// ─── ServicesList ──────────────────────────────────────────────────────────────

function ServicesList({ categories, onBook }: { categories: Category[]; onBook: (s: Service) => void }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map((cat) => {
        const expanded = expandedIds.has(cat.id)
        const hasDiscount = cat.services.some((s) => s.discountPercent)
        const preview = cat.services.map((s) => s.name).join(' • ')

        return (
          <div key={cat.id}>
            {/* Заголовок категории */}
            <div
              onClick={() => toggle(cat.id)}
              style={{
                display: 'flex', alignItems: 'center',
                background: '#25262B',
                borderRadius: expanded ? '20px 20px 0 0' : 20,
                minHeight: 78, padding: '0 16px 0 0',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                overflow: 'hidden', background: 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 12px 0 16px',
              }}>
                {cat.photo
                  ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>✂️</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#D3D4D6' }}>{cat.name}</span>
                  {hasDiscount && (
                    <span style={{ background: 'rgba(206,66,89,0.3)', color: '#CE4259', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>
                      % скидки
                    </span>
                  )}
                </div>
                <div style={{ color: '#7D7D7F', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.description || preview}
                </div>
              </div>
              <div style={{ flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginLeft: 8 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Услуги */}
            {expanded && (
              <div style={{ background: '#25262B', borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
                {cat.services.map((s) => {
                  const dPrice = discountedPrice(s.price, s.discountPercent)
                  return (
                    <button
                      key={s.id}
                      onClick={() => onBook(s)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        padding: '12px 16px',
                        borderTop: '1px solid var(--color-border)',
                        background: 'none', cursor: 'pointer', textAlign: 'left',
                        gap: 12,
                      }}
                    >
                      {s.photo && (
                        <img src={s.photo} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#D3D4D6' }}>{s.name}</span>
                          {s.discountPercent && (
                            <span style={{ background: 'rgba(206,66,89,0.3)', color: '#CE4259', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px' }}>
                              -{s.discountPercent}%
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#7D7D7F', fontSize: 12, marginTop: 2 }}>
                          {formatDuration(s.duration)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: dPrice !== null ? '#007AFE' : '#D3D4D6' }}>
                            {formatPrice(dPrice ?? s.price)}
                          </span>
                          {dPrice !== null && (
                            <span style={{ fontSize: 12, color: '#7D7D7F', textDecoration: 'line-through' }}>
                              {formatPrice(s.price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg width="9" height="16" viewBox="0 0 9 16" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M1 1l7 7-7 7" stroke="#007AFE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
