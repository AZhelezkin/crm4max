import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { Category } from '@/types'
import { formatPrice, formatDuration, discountedPrice } from '@/types'

type Tab = 'services' | 'photos' | 'reviews'

export default function ProfilePage() {
  const { master } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('services')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const lbStripRef  = useRef<HTMLDivElement>(null)
  const lbOverlayRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  const totalServices = master?.categories.reduce((acc, c) => acc + c.services.length, 0) ?? 0

  const allPhotos = (master?.categories ?? [])
    .flatMap(c => c.services)
    .flatMap(s => s.workPhotos ?? [])
    .sort((a, b) => a.order - b.order)

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
    if (lbTouch.current.dir === 'h' && lbStripRef.current) {
      lbStripRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`
    }
    if (lbTouch.current.dir === 'v' && lbOverlayRef.current) {
      const p = Math.max(0, dy)
      lbOverlayRef.current.style.transform = `translateY(${p}px)`
      lbOverlayRef.current.style.opacity = String(Math.max(0, 1 - p / 300))
    }
  }

  function onLbEnd(e: React.TouchEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { startX, startY, dir, moved } = lbTouch.current
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY

    // Tap — close
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
      const goNext = dx < -60 && lightboxIndex! < allPhotos.length - 1
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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', overflowX: 'hidden' }}>

      {/* Шапка */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 20, textAlign: 'center' }}>

        {/* Рейтинг */}
        {!!master?.rating && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--color-card)', borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{ color: '#FFD60A', fontSize: 14 }}>★</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{master.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Аватар */}
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          border: '3px solid var(--color-primary)',
          overflow: 'hidden', margin: '0 auto 12px',
          background: 'var(--color-card2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master?.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 36 }}>👤</span>
          }
        </div>

        {/* Имя */}
        <div style={{ fontSize: 20, fontWeight: 700 }}>{master?.name || 'Мастер'}</div>

        {/* Специальность */}
        {master?.description && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
            {master.description}
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, padding: '0 16px' }}>
          {[
            {
              label: 'Услуги', action: () => navigate('/services'),
              icon: <CatalogIcon active />,
            },
            {
              label: 'Профиль', action: () => navigate('/about'),
              icon: <EditIcon active />,
            },
            {
              label: 'Поделиться', action: () => navigate('/share'),
              icon: <ShareIcon active />,
            },
            { label: 'Еще', action: () => {}, icon: <MoreIcon active /> },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
                background: 'var(--color-card)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '10px 4px',
                cursor: 'pointer',
              }}
            >
              {icon}
              <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Табы */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 16px' }}>
        {([
          { key: 'services', label: 'Услуги', count: totalServices },
          { key: 'photos',   label: 'Фото',   count: 0 },
          { key: 'reviews',  label: 'Отзывы', count: 0 },
        ] as { key: Tab; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, background: 'none', border: 'none',
              padding: '12px 0', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-card2)',
                color: activeTab === tab.key ? '#fff' : 'var(--color-text-secondary)',
                borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div style={{ padding: '12px 16px 80px' }}>
        {activeTab === 'services' && (
          master?.categories.length
            ? <ServicesList categories={master.categories} />
            : <EmptyState
                text="Услуги ещё не добавлены"
                action={{ label: '+ Добавить услуги', onClick: () => navigate('/services') }}
              />
        )}
        {activeTab === 'photos' && (
          !allPhotos.length
            ? <EmptyState text="Фото работ появятся здесь" />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '0 -16px' }}>
                {allPhotos.map((p, i) => (
                  <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIndex(i)}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
        )}
        {activeTab === 'reviews' && <EmptyState text="Отзывы появятся после первых записей" />}
      </div>

      {/* Лайтбокс */}
      {lightboxIndex !== null && (
        <div
          ref={lbOverlayRef}
          onTouchStart={onLbStart}
          onTouchMove={onLbMove}
          onTouchEnd={onLbEnd}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Strip: prev | current | next */}
          <div
            ref={lbStripRef}
            style={{
              display: 'flex', width: '300vw', height: '100%',
              transform: 'translateX(-100vw)',
              willChange: 'transform',
            }}
          >
            {[lightboxIndex - 1, lightboxIndex, lightboxIndex + 1].map((idx) => (
              <div
                key={idx}
                style={{
                  width: '100vw', height: '100%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {allPhotos[idx] && (
                  <img
                    src={allPhotos[idx].url}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Точки */}
          {allPhotos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
              {allPhotos.map((_, i) => (
                <div key={i} style={{
                  width: i === lightboxIndex ? 8 : 6,
                  height: i === lightboxIndex ? 8 : 6,
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

// ─── ServicesList ─────────────────────────────────────────────────────────────

function ServicesList({ categories }: { categories: Category[] }) {
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
            {/* Категория */}
            <div
              onClick={() => toggle(cat.id)}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--color-card)',
                borderRadius: expanded ? '20px 20px 0 0' : 20,
                minHeight: 78,
                padding: '0 16px 0 0',
                cursor: 'pointer',
              }}
            >
              {/* Круглое фото категории */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                flexShrink: 0, overflow: 'hidden',
                background: 'var(--color-card2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 12px 0 16px',
              }}>
                {cat.photo
                  ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>✂️</span>
                }
              </div>

              {/* Текст */}
              <div style={{ flex: 1, minWidth: 0, padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{cat.name}</span>
                  {hasDiscount && (
                    <span style={{
                      background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                      fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                    }}>% скидки</span>
                  )}
                </div>
                <div style={{
                  color: 'var(--color-text-secondary)', fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cat.description || preview}
                </div>
              </div>

              {/* Шеврон */}
              <div style={{
                flexShrink: 0,
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                marginLeft: 8,
              }}>
                <ChevronRightIcon />
              </div>
            </div>

            {/* Услуги — раскрываются */}
            {expanded && (
              <div style={{ background: 'var(--color-card)', borderRadius: '0 0 20px 20px', overflow: 'hidden' }}>
                {cat.services.map((s) => {
                  const dPrice = discountedPrice(s.price, s.discountPercent)
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                          {formatDuration(s.durationMin, s.durationMax)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        {dPrice !== null ? (
                          <>
                            <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 14 }}>
                              {formatPrice(dPrice)}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>
                              {formatPrice(s.price)}
                            </div>
                            <div style={{
                              background: 'rgba(206,66,89,0.3)', color: '#CE4259',
                              fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 5px',
                            }}>
                              -{s.discountPercent}%
                            </div>
                          </>
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(s.price)}</div>
                        )}
                      </div>
                    </div>
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

function EmptyState({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>{text}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 16, background: 'var(--color-primary)',
            color: '#fff', border: 'none', borderRadius: 'var(--radius)',
            padding: '10px 20px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function CalendarIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="3" stroke={c} strokeWidth="2" />
      <path d="M8 2v4M16 2v4M3 9h18" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" rx="1" fill={c} />
      <rect x="14" y="13" width="3" height="3" rx="1" fill={c} />
    </svg>
  )
}

function AddIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EditIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CatalogIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {/* Документ */}
      <rect x="3" y="3" width="13" height="17" rx="2" stroke={c} strokeWidth="2" />
      {/* Строки списка */}
      <path d="M7 8h6M7 12h6M7 16h4" stroke={c} strokeWidth="1.75" strokeLinecap="round" />
      {/* Плюс в правом нижнем углу */}
      <circle cx="19" cy="19" r="4" fill={c} />
      <path d="M19 17v4M17 19h4" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2" fill={c} />
      <circle cx="12" cy="12" r="2" fill={c} />
      <circle cx="19" cy="12" r="2" fill={c} />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M7 5L11 9L7 13" stroke="#7D7D7F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShareIcon({ active }: { active?: boolean }) {
  const c = active ? '#2688EB' : '#8E8E93'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 6 12 2 8 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="2" x2="12" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
