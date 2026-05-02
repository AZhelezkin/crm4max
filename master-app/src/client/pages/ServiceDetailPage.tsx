import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBookingStore } from '@client/store/booking.store'
import { discountedPrice, formatDuration, formatPrice } from '@client/types'
import { text } from '@/styles/typography'
import capybaraNoPhotoImg from '@/assets/capybara-no-photo.png'

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

/* ── Кнопка «Записаться» (vuesax/linear/calendar-edit 24×24) ───────────────── */

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
  const { masterId, service, categoryName } = useBookingStore()

  useEffect(() => {
    if (!masterId || !service) navigate('/')
  }, [masterId, service, navigate])

  if (!service) return null

  const dPrice = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = dPrice !== null

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
            {service.workPhotos.map((p) => (
              <div key={p.id} style={{ height: 170, background: 'var(--color-surface)' }}>
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

      {/* ── Footer button «Записаться». bottom-fixed: pt-8 pb-48 px-12.
            Кнопка h=60, rx=20, bg=primarySurface, gap=8 (icon + text). */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px 48px',
        background: 'var(--color-background)',
      }}>
        <button
          onClick={() => navigate('/book/calendar')}
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
            Записаться
          </span>
        </button>
      </div>
    </div>
  )
}
