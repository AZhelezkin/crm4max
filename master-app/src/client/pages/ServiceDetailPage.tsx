import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'
import { discountedPrice, formatDuration, formatPrice } from '@client/types'
import { text } from '@/styles/typography'
import capybaraNoPhotoImg from '@/assets/capybara-no-photo.png'
import { trackEventOnce } from '@/lib/metrics'

/* ── Иконки toolbar (vuesax/linear, 24×24, stroke=onSurfaceSoften) ─────────── */

function IcoArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
    </svg>
  )
}

function ToolbarButton({ onClick, ariaLabel, children }: {
  onClick: () => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--color-background)',
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

/* ── Кнопка «Выбрать дату» (vuesax/linear/calendar-edit 24×24) ───────────────── */

function IcoCalendarEdit() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h17" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5C3 5.5 4.5 3.5 8 3.5h8c3.5 0 5 2 5 5Z" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m15.695 13.7-3.61 3.61c-.14.14-.27.4-.3.59l-.19 1.35c-.07.49.27.83.76.76l1.35-.19c.19-.03.46-.16.59-.3l3.61-3.61c.62-.62.91-1.34 0-2.25-.9-.9-1.62-.6-2.21.04Z" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.205 14.19a3.193 3.193 0 0 0 2.25 2.25" stroke="var(--color-on-primary-surface)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Страница ──────────────────────────────────────────────────────────────── */

export default function ServiceDetailPage() {
  const navigate = useNavigate()
  const { masterId, service, categoryName, clearSlots } = useBookingStore()

  // Лайтбокс фото — та же логика свайпов/закрытия, что на карточке мастера.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxMenuOpen, setLightboxMenuOpen] = useState(false)
  useEffect(() => { if (lightboxIndex === null) setLightboxMenuOpen(false) }, [lightboxIndex])
  const lbStripRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  useEffect(() => {
    if (!masterId || !service) navigate('/')
  }, [masterId, service, navigate])

  useEffect(() => {
    if (!service) return
    trackEventOnce(`client-service-details:${service.id}`, 'client_service_details_viewed', {
      is_package: service.sessionsCount > 1,
      has_photos: service.workPhotos.length > 0,
    })
  }, [service])

  if (!service) return null

  const dPrice = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = dPrice !== null
  const photos = service.workPhotos

  /* ── Lightbox touch (только горизонтальный свайп) — копия MasterCardPage ── */
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
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      lbTouch.current.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (lbTouch.current.dir === 'h' && lbStripRef.current)
      lbStripRef.current.style.transform = `translateX(calc(-100vw + ${dx}px))`
  }
  function onLbEnd(e: React.TouchEvent) {
    e.stopPropagation()
    const { startX, startY, dir } = lbTouch.current
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    const horiz = dir === 'h' || (dir === null && Math.abs(dx) > Math.abs(dy))
    if (!horiz) return
    const W = window.innerWidth
    const goNext = dx < -60 && lightboxIndex! < photos.length - 1
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

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 124 /* footer-button + safe area */ }}>

      {/* ── Header (Figma toolbarTop). h=56, padding 6/12, gap=8.
            Заголовок abs-центрирован: title (Bold 17/24) + subtitle (Medium 14/16). */}
      <div style={{
        position: 'relative',
        height: 56,
        padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <ToolbarButton onClick={() => navigate(-1)} ariaLabel="Назад">
          <IcoArrowLeft />
        </ToolbarButton>

        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
            {service.name}
          </div>
          {categoryName && (
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {categoryName}
            </div>
          )}
        </div>

        {/* пустой trailing slot 44×44 для симметрии (как в Figma) */}
        <div style={{ width: 44, height: 44, marginLeft: 'auto', flexShrink: 0 }} />
      </div>

      {/* ── Контент (Figma form: top=180, padding 16/8, gap=16) ────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px' }}>

        {/* Описание услуги — Body 2 (17/24/400 ls −0.17), wrap padding 0/10. */}
        {service.description && (
          <div style={{ padding: '0 10px' }}>
            <p style={{
              ...text.body2,
              color: 'var(--color-on-surface)',
              margin: 0,
            }}>
              {service.description}
            </p>
          </div>
        )}

        {/* Карточка «Стоимость / Продолжительность». bg=surfaceTransparent, rx=20, padding 20/16. */}
        <div style={{
          background: 'var(--color-surface-transparent)',
          borderRadius: 20,
          padding: '16px 16px 16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              Стоимость
            </div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              Продолжительность
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              {hasDiscount ? formatPrice(dPrice!) : formatPrice(service.price)}
            </div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
              {formatDuration(service.duration)}
            </div>
          </div>
        </div>

        {/* Photo grid — 3 колонки, gap 1px, rx=20 на контейнере (overflow:hidden).
            Каждая ячейка фиксированной высоты 170px (per Figma).
            Если фото нет — empty-state с capybara 240×240 + «Фото пока нет»
            (Figma 8534:33636 «Placeholder», padding 24 vertical, text body2 secondary). */}
        {service.workPhotos.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            {service.workPhotos.map((p, i) => (
              <div
                key={p.id}
                onClick={() => setLightboxIndex(i)}
                style={{ height: 170, background: 'var(--color-surface)', cursor: 'pointer' }}
              >
                <img
                  src={p.url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '24px 0',
          }}>
            <img
              src={capybaraNoPhotoImg}
              alt=""
              style={{ width: 240, height: 240, objectFit: 'contain', display: 'block' }}
            />
            <div style={{
              padding: '0 40px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{
                ...text.body2,
                color: 'var(--color-on-surface-secondary)',
                textAlign: 'center',
                margin: 0,
              }}>
                Фото пока нет
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer button «Выбрать дату» (ведёт на выбор даты/курса). bottom-fixed: pt-8 pb-48 px-12.
            Кнопка h=60, rx=20, bg=primarySurface, gap=8 (icon + text). */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px 48px',
        background: 'var(--color-background)',
      }}>
        <button
          onClick={() => {
            // Услуга-абонемент (N приёмов) → экран выбора слотов на весь курс.
            if (service.sessionsCount > 1) { clearSlots(); navigate('/book/package') }
            else navigate('/book/calendar')
          }}
          style={{
            width: '100%', height: 60, borderRadius: 20,
            background: 'var(--color-primary-surface)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: 18,
          }}
        >
          <IcoCalendarEdit />
          <span style={{ ...text.callout1, color: 'var(--color-on-primary-surface)' }}>
            Выбрать дату
          </span>
        </button>
      </div>

      {/* ── Лайтбокс фото услуги — те же тулбар/свайп/закрытие, что на карточке мастера. */}
      {lightboxIndex !== null && (() => {
        const current = photos[lightboxIndex] as any | undefined
        const photoUrl: string = current?.url ?? ''
        const photoServiceName: string = service.name
        const fileNameFromUrl = (() => {
          try { return new URL(photoUrl).pathname.split('/').pop() || 'photo.jpg' } catch { return 'photo.jpg' }
        })()
        const handleDownload = () => {
          if (!photoUrl) return
          try { window.WebApp?.downloadFile?.(photoUrl, fileNameFromUrl) } catch { /* ignore */ }
        }
        const handleShare = () => {
          if (!photoUrl) return
          const t = photoServiceName ? `${photoServiceName}\n${photoUrl}` : photoUrl
          try { window.WebApp?.shareContent?.({ text: t }) } catch { /* ignore */ }
          setLightboxMenuOpen(false)
        }
        return (
          <div
            onClick={() => setLightboxMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'var(--gradient-hero-background)',
              overflow: 'hidden',
            }}
          >
            {/* Top toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
                height: 56, padding: '6px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <button
                onPointerUp={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
                aria-label="Назад"
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: 'var(--color-background)',
                  border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  touchAction: 'none',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
                </svg>
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 4,
                background: 'var(--color-background)', borderRadius: 22,
                position: 'relative',
              }}>
                <button
                  onClick={handleDownload}
                  aria-label="Скачать"
                  style={{
                    width: 36, height: 36,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 10h6m-3 0V3m0 0L9 6m3-3 3 3" stroke="var(--color-on-surface-soften)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12c0 6-2 9-9 9s-9-3-9-9" stroke="var(--color-on-surface-soften)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => setLightboxMenuOpen((v) => !v)}
                  aria-label="Ещё"
                  style={{
                    width: 36, height: 36,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="5" cy="12" r="2" fill="var(--color-on-surface-soften)"/>
                    <circle cx="12" cy="12" r="2" fill="var(--color-on-surface-soften)"/>
                    <circle cx="19" cy="12" r="2" fill="var(--color-on-surface-soften)"/>
                  </svg>
                </button>

                {lightboxMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--color-surface)',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                    overflow: 'hidden',
                    minWidth: 180,
                    zIndex: 20,
                  }}>
                    <button
                      onClick={handleShare}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '14px 16px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        ...text.body, color: 'var(--color-on-surface)',
                      }}
                    >
                      Поделиться
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Photo strip — touch swipe только тут, не на toolbar/footer. */}
            <div
              ref={lbStripRef}
              onTouchStart={onLbStart}
              onTouchMove={onLbMove}
              onTouchEnd={onLbEnd}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 56, bottom: 64, left: 0,
                display: 'flex',
                width: '300vw',
                transform: 'translateX(-100vw)',
                willChange: 'transform',
                touchAction: 'pan-y',
              }}
            >
              {[lightboxIndex - 1, lightboxIndex, lightboxIndex + 1].map((idx) => (
                <div key={idx} style={{ width: '100vw', height: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {photos[idx] && (
                    <img src={(photos[idx] as any).url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Footer: dots + название услуги. bg=#0F0F11. */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                background: '#0F0F11',
                padding: '12px 16px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {photos.map((_, i) => (
                    <div key={i} style={{
                      width: i === lightboxIndex ? 8 : 6, height: i === lightboxIndex ? 8 : 6,
                      borderRadius: '50%',
                      background: i === lightboxIndex ? 'var(--color-on-primary-surface)' : 'rgba(255,255,255,0.35)',
                      transition: 'all 0.2s',
                    }} />
                  ))}
                </div>
              )}
              {photoServiceName && (
                <span style={{
                  fontSize: 13, lineHeight: '16px', fontWeight: 400, letterSpacing: 0.26,
                  color: 'var(--color-on-primary-surface)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>
                  {photoServiceName}
                </span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
