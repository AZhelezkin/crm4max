import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { text } from '@/styles/typography'

/*
 * Экран обрезки аватара — макет Figma 8794:56697 (mCRM «master-profile-photo-galley»).
 *
 * Геометрия из макета (кадр 390×812, контент начинается с y=124 — выше нативный
 * header Max с «CRM» + статус-бар, их не рисуем):
 *   - окно кропа:   x16 y208 w358 h460 rx16            → поля 16px по бокам, aspect 358/460
 *   - круг кропа:   cx194.5 cy438 r154                  → центр окна, r = 154/358 ширины окна
 *   - скрим:        #0E0F11 @ 60% вне круга             → var(--color-background) opacity .6
 *   - контур круга: white 1px                           → var(--color-on-primary-surface)
 *   - back-кнопка:  круг 44×44 x12 y130                 → header 56, padding 6/12
 *   - кнопка:       «Сохранить» x12 y704 w366 h60 rx20  → primary-surface
 *
 * Изображение можно двигать (drag) и масштабировать (pinch / колесо); круг всегда
 * полностью покрыт картинкой. По «Сохранить» квадрат, описанный вокруг круга,
 * рендерится в canvas → File('image/jpeg') и отдаётся в onConfirm.
 */

const WIN_W = 358          // ширина окна кропа в макете
const WIN_H = 460          // высота окна кропа в макете
const R_RATIO = 154 / 358  // радиус круга относительно ширины окна
const MAX_ZOOM = 8         // максимум относительно минимального масштаба
const OUTPUT_DEFAULT = 512 // сторона итогового квадрата, px

interface Geo {
  scale: number // масштаб картинки (displayed = natural * scale)
  ox: number    // смещение левого края картинки от левого края окна, px
  oy: number    // смещение верхнего края картинки от верхнего края окна, px
}

interface Props {
  open: boolean
  /** object URL или URL картинки для обрезки */
  src: string
  onCancel: () => void
  onConfirm: (file: File) => void
  /** сторона итогового квадрата (px), по умолчанию 512 */
  outputSize?: number
}

export default function AvatarCropPortal({ open, src, onCancel, onConfirm, outputSize = OUTPUT_DEFAULT }: Props) {
  const winRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const natRef = useRef<{ w: number; h: number } | null>(null)   // натуральный размер картинки
  const winSizeRef = useRef<{ w: number; h: number }>({ w: WIN_W, h: WIN_H })
  const geoRef = useRef<Geo>({ scale: 1, ox: 0, oy: 0 })

  const [geo, setGeoState] = useState<Geo>({ scale: 1, ox: 0, oy: 0 })
  const [ready, setReady] = useState(false)

  const setGeo = (g: Geo) => { geoRef.current = g; setGeoState(g) }

  // Круг кропа в px текущего окна (центр окна, r = доля ширины).
  const circle = () => {
    const { w, h } = winSizeRef.current
    return { cx: w / 2, cy: h / 2, r: w * R_RATIO }
  }

  // Минимальный масштаб — при котором меньшая сторона картинки равна диаметру круга.
  const minScale = () => {
    const nat = natRef.current
    if (!nat) return 1
    return (2 * circle().r) / Math.min(nat.w, nat.h)
  }

  // Зажим позиции: круг всегда полностью внутри картинки (без пустот в кадре).
  const clampGeo = (g: Geo): Geo => {
    const nat = natRef.current
    if (!nat) return g
    const { cx, cy, r } = circle()
    const W = nat.w * g.scale
    const H = nat.h * g.scale
    const ox = Math.min(cx - r, Math.max(cx + r - W, g.ox))
    const oy = Math.min(cy - r, Math.max(cy + r - H, g.oy))
    return { scale: g.scale, ox, oy }
  }

  // Замер окна + первичная установка картинки (cover) после загрузки/ресайза.
  const init = () => {
    const img = imgRef.current
    const win = winRef.current
    if (!img || !win || !img.naturalWidth) return
    const rect = win.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) { requestAnimationFrame(init); return }  // окно ещё не разложено
    winSizeRef.current = { w: rect.width, h: rect.height }
    natRef.current = { w: img.naturalWidth, h: img.naturalHeight }

    const { w: W0, h: H0 } = winSizeRef.current
    const coverScale = Math.max(W0 / img.naturalWidth, H0 / img.naturalHeight)
    const scale = Math.max(coverScale, minScale())
    const W = img.naturalWidth * scale
    const H = img.naturalHeight * scale
    setGeo(clampGeo({ scale, ox: (W0 - W) / 2, oy: (H0 - H) / 2 }))
    setReady(true)
  }

  // Масштаб вокруг точки (px в координатах окна).
  const applyZoom = (factor: number, px: number, py: number) => {
    const g = geoRef.current
    const ms = minScale()
    const newScale = Math.min(ms * MAX_ZOOM, Math.max(ms, g.scale * factor))
    const k = newScale / g.scale
    setGeo(clampGeo({ scale: newScale, ox: px - (px - g.ox) * k, oy: py - (py - g.oy) * k }))
  }

  // ── Жесты: drag (1 палец/мышь) + pinch (2 пальца) ────────────────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragRef = useRef<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const pinchRef = useRef<{ dist: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      dragRef.current = { ox: geoRef.current.ox, oy: geoRef.current.oy, x: e.clientX, y: e.clientY }
      pinchRef.current = null
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) }
      dragRef.current = null
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const rect = winRef.current!.getBoundingClientRect()

    if (pointers.current.size >= 2 && pinchRef.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchRef.current.dist > 0) {
        applyZoom(dist / pinchRef.current.dist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
      }
      pinchRef.current.dist = dist
    } else if (dragRef.current) {
      const ox = dragRef.current.ox + (e.clientX - dragRef.current.x)
      const oy = dragRef.current.oy + (e.clientY - dragRef.current.y)
      setGeo(clampGeo({ scale: geoRef.current.scale, ox, oy }))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()]
      dragRef.current = { ox: geoRef.current.ox, oy: geoRef.current.oy, x: p.x, y: p.y }
      pinchRef.current = null
    } else if (pointers.current.size === 0) {
      dragRef.current = null
      pinchRef.current = null
    }
  }

  // Колесо мыши — нативный non-passive слушатель, чтобы можно было preventDefault.
  useEffect(() => {
    if (!open) return
    const el = winRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      applyZoom(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready])

  // Пересчёт при ресайзе вьюпорта.
  useEffect(() => {
    if (!open) return
    const onResize = () => init()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Сброс состояния при закрытии.
  useEffect(() => {
    if (!open) {
      setReady(false)
      pointers.current.clear()
      dragRef.current = null
      pinchRef.current = null
    }
  }, [open])

  // Экспорт квадрата вокруг круга в canvas → File.
  const handleSave = () => {
    const img = imgRef.current
    if (!img || !natRef.current) return
    const { cx, cy, r } = circle()
    const g = geoRef.current
    const sx = (cx - r - g.ox) / g.scale
    const sy = (cy - r - g.oy) / g.scale
    const sSize = (2 * r) / g.scale

    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize)
    canvas.toBlob(
      (blob) => { if (blob) onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })) },
      'image/jpeg',
      0.9,
    )
  }

  if (!open) return null

  const nat = natRef.current

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // hero-композиция как у #root>div (paint0-градиент + 2 круга + плёнка); портал
        // рендерится в document.body, поэтому глобальный hero не наследуется — задаём явно.
        background: 'var(--gradient-hero-background)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Header: back 44×44 слева, заголовок центрирован относительно viewport. */}
      <div style={{ position: 'relative', flexShrink: 0, height: 76, boxSizing: 'border-box', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Назад"
          style={{
            position: 'absolute', left: 16,
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'var(--color-background)',
            color: 'var(--color-on-surface-soften)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeftIcon />
        </button>
        <div style={{
          position: 'absolute', left: 64, right: 64,
          overflow: 'hidden', color: 'var(--color-on-surface)', textAlign: 'center',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...text.callout1,
        }}>
          Профиль
        </div>
      </div>

      {/* Main: окно кропа (макет 358×460 rx16, поля по 16px) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div
          ref={winRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: `${WIN_W} / ${WIN_H}`,
            maxHeight: '100%',
            borderRadius: 16,
            overflow: 'hidden',
            background: 'var(--color-secondary-surface)',
            touchAction: 'none',
            cursor: 'grab',
          }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={init}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: nat ? nat.w : 'auto',
              height: nat ? nat.h : 'auto',
              maxWidth: 'none',
              transformOrigin: 'top left',
              transform: `translate(${geo.ox}px, ${geo.oy}px) scale(${geo.scale})`,
              visibility: ready ? 'visible' : 'hidden',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />

          {/* Скрим 60% с круглым вырезом + белый контур (макет) */}
          <svg
            viewBox={`0 0 ${WIN_W} ${WIN_H}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <defs>
              <mask id="avatarCropMask">
                <rect width={WIN_W} height={WIN_H} fill="white" />
                <circle cx={WIN_W / 2} cy={WIN_H / 2} r={WIN_W * R_RATIO} fill="black" />
              </mask>
            </defs>
            <rect
              width={WIN_W}
              height={WIN_H}
              mask="url(#avatarCropMask)"
              style={{ fill: 'var(--color-background)', fillOpacity: 0.6 }}
            />
            <circle
              cx={WIN_W / 2}
              cy={WIN_H / 2}
              r={WIN_W * R_RATIO}
              fill="none"
              strokeWidth={1}
              style={{ stroke: 'var(--color-on-primary-surface)' }}
            />
          </svg>
        </div>
      </div>

      {/* Footer: кнопка «Сохранить» (макет x12 y704 w366 h60 rx20) */}
      <div style={{ flexShrink: 0, padding: '16px 12px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            width: '100%',
            height: 60,
            border: 'none',
            borderRadius: 20,
            background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)',
            cursor: 'pointer',
            ...text.subheadline,
          }}
        >
          Сохранить
        </button>
      </div>
    </div>,
    document.body,
  )
}

// Двухпутевая стрелка «Назад» (как в Step0 онбординга / макете).
function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
