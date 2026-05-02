import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Booking, Category, Master, Service } from '@client/types'
import BottomNav from '@client/components/BottomNav'
import { startParam } from '@/App'
import { text } from '@/styles/typography'

dayjs.locale('ru')

/* ── Иконки кнопок действий (stroke var(--color-primary-surface), 24×24) ───────────────────────── */

function IcoBook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5M16 2V5M3.5 9.09H20.5" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 13.7H12.01M8.3 13.7H8.31M8.3 16.7H8.31" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoCall() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M21.97 18.33C21.97 18.69 21.89 19.06 21.72 19.42C21.55 19.78 21.33 20.12 21.04 20.44C20.55 20.98 20.01 21.37 19.4 21.62C18.8 21.87 18.15 22 17.45 22C16.43 22 15.34 21.76 14.19 21.27C13.04 20.78 11.89 20.12 10.75 19.29C9.6 18.45 8.51 17.52 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.27 13.75 11.79 14.24 12.32 14.69C12.84 15.13 13.27 15.43 13.61 15.61C13.66 15.63 13.72 15.66 13.79 15.69C13.87 15.72 13.95 15.73 14.04 15.73C14.21 15.73 14.34 15.67 14.45 15.56L15.21 14.81C15.46 14.56 15.7 14.37 15.93 14.25C16.16 14.11 16.39 14.04 16.64 14.04C16.83 14.04 17.03 14.08 17.25 14.17C17.47 14.26 17.7 14.39 17.95 14.56L21.26 16.91C21.52 17.09 21.7 17.3 21.81 17.55C21.91 17.8 21.97 18.05 21.97 18.33Z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10"/>
    </svg>
  )
}
function IcoChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8C4 19 2 18 2 13V8C2 4 4 2 8 2H16C20 2 22 4 22 8V13C22 17 20 19 16 19H15.5C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19Z" stroke="var(--color-primary-surface)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 8H17M7 13H13" stroke="var(--color-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IcoMore() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2" fill="var(--color-primary-surface)"/>
      <circle cx="12" cy="12" r="2" fill="var(--color-primary-surface)"/>
      <circle cx="19" cy="12" r="2" fill="var(--color-primary-surface)"/>
    </svg>
  )
}

/* ── Иконки контекстного меню (vuesax/linear, 20×20, stroke=onSurface | errorSurfaceAccented) ── */

type MenuIconProps = { destructive?: boolean }
const menuIconColor = (destructive?: boolean) =>
  destructive ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)'

function IcoShare({ destructive }: MenuIconProps) {
  // vuesax/linear/send-2
  const c = menuIconColor(destructive)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M14.46 7.93 5.41 12.45c-3.05 1.52-3.05 4.01 0 5.54l1.35.67 .67 1.35c1.52 3.05 4.02 3.05 5.54 0l4.53-9.05c1.01-2.04-.04-3.07-2.04-2.03Zm.16 2.27-5.71 5.71c-.22.22-.59.22-.81 0a.575.575 0 0 1 0-.81l5.71-5.71c.22-.22.59-.22.81 0 .22.22.22.59 0 .81Z" fill={c} transform="translate(-3, -3)"/>
    </svg>
  )
}

function IcoBookmark({ destructive }: MenuIconProps) {
  // vuesax/linear/bookmark-2
  const c = menuIconColor(destructive)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M14.585 2.583H5.41c-1.45 0-2.625 1.183-2.625 2.625v11.45c0 1.225.875 1.742 1.95 1.15l4.642-2.583c.354-.2.929-.2 1.275 0l4.641 2.583c1.075.6 1.95.084 1.95-1.15V5.208c.009-1.442-1.166-2.625-2.658-2.625Z" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoDocument({ destructive }: MenuIconProps) {
  // vuesax/linear/document-text
  const c = menuIconColor(destructive)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18.333 8.333v4.167c0 4.166-1.666 5.833-5.833 5.833H7.5c-4.167 0-5.833-1.667-5.833-5.833V7.5c0-4.167 1.666-5.833 5.833-5.833h4.167" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.333 8.333H15c-2.5 0-3.333-.833-3.333-3.333V1.667l6.666 6.666ZM6.667 10.833H10.833M6.667 14.167H9.167" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoTrash({ destructive }: MenuIconProps) {
  // vuesax/linear/trash
  const c = menuIconColor(destructive)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17.5 4.983c-2.775-.275-5.567-.416-8.35-.416-1.65 0-3.3.083-4.95.25l-1.7.166M8.084 4.142l.183-1.092c.133-.792.233-1.383 1.642-1.383h2.183c1.408 0 1.516.625 1.641 1.391l.184 1.084M16.146 7.617l-.541 8.391c-.092 1.309-.167 2.325-2.492 2.325H6.888c-2.325 0-2.4-1.016-2.492-2.325l-.541-8.391M8.108 13.75H11.883M7.5 10.417H12.5" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IcoBlock({ destructive }: MenuIconProps) {
  // vuesax/linear/forbidden — крест в круге
  const c = menuIconColor(destructive)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 18.333a8.333 8.333 0 1 0 0-16.666 8.333 8.333 0 0 0 0 16.666Z" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.108 4.108 15.892 15.892" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
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
  const masterId = (UUID_REGEX.test(startParam) ? startParam : null) ?? params.get('masterId') ?? ''
  const navigate = useNavigate()
  const { setMasterId, setService, setDateTime } = useBookingStore()

  const [master, setMaster] = useState<Master | null>(null)
  const [nextBooking, setNextBooking] = useState<Booking | null>(null)
  const [tab, setTab] = useState<Tab>('services')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const lbStripRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  useEffect(() => {
    if (!masterId) return
    const now = dayjs()
    const today = now.format('YYYY-MM-DD')
    bookingsApi.list({ status: 'CONFIRMED', from: today }).then((bookings) => {
      const forMaster = bookings
        .filter((b) => b.master.id === masterId)
        .filter((b) => dayjs(`${b.date} ${b.time}`).isAfter(now))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      setNextBooking(forMaster[0] ?? null)
    }).catch(() => {})
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: 'var(--color-on-surface-secondary)' }}>Откройте приложение через бота</span>
    </div>
  )
  if (!master) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
      <span style={{ color: 'var(--color-on-surface-secondary)' }}>Загрузка...</span>
    </div>
  )

  /* ── Рендер ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 95 }}>

      {/* ── HERO: paint0 (surface→background) + декор (animationV4 + gradMint100 + blur)
            + back + рейтинг + аватар + имя. Координаты — из design/dark/Profile_info.svg.
            borderTop{Left,Right}Radius:24 — Figma «corners» (M24 124.5 C 10.745 124.5, 0 135.245, 0 148.5
            V 124.5 H 24 Z), четверть-круг радиуса 24 у каждого верхнего угла.
            Градиент жёстко 390px (как в Figma `background` div h-[390px]) через
            background-size + no-repeat, ниже — плоский --color-background. */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        paddingTop: 16, paddingBottom: 24,
        background: 'var(--gradient-hero-background) 0 0 / 100% 390px no-repeat, var(--color-background)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
      }}>

        {/* Декор: 2 круга с filter:blur (вместо backdrop-filter — блюр-фильтр на самом
            элементе кешируется композитором и не глючит при скролле в iOS WebView)
            + полупрозрачный overlay для затемнения. paint0 наследуется от <body>. */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          pointerEvents: 'none', zIndex: 0,
        }}>
          {/* Большой круг animationV4: SVG cx=210 cy=52 r=227 → ø454, top=-(227+72)=-299 */}
          <div style={{
            position: 'absolute', left: '50%', top: -299, transform: 'translateX(-50%)',
            width: 454, height: 454, borderRadius: '50%',
            background: 'var(--color-hero-circle-1)',
            filter: 'blur(60px)',
          }} />
          {/* Малый круг gradMint100: SVG cx=210 cy=90 r=124 → ø248, top=-(124+34)=-158 */}
          <div style={{
            position: 'absolute', left: '50%', top: -158, transform: 'translateX(-50%)',
            width: 248, height: 248, borderRadius: '50%',
            background: 'var(--color-hero-circle-2)',
            filter: 'blur(60px)',
          }} />
          {/* Тёмный overlay (как в SVG: чёрная плёнка 10%). */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'var(--color-background-blur)',
          }} />
        </div>

        {/* Рейтинг (top-right): звезда + число, без подложки.
            Star 18×16 fill=warningSurfaceAccented (#F0AF2D), text onSurfaceSecondary. */}
        {master.rating > 0 && (
          <div style={{
            position: 'absolute', top: 21, right: 18, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="18" height="16" viewBox="346 144 18 16" fill="none">
              <path d="M356.442 144.925L357.909 147.859C358.109 148.267 358.642 148.659 359.092 148.734L361.75 149.175C363.45 149.459 363.85 150.692 362.625 151.909L360.559 153.975C360.209 154.325 360.017 155 360.125 155.484L360.717 158.042C361.184 160.067 360.109 160.85 358.317 159.792L355.825 158.317C355.375 158.05 354.634 158.05 354.175 158.317L351.684 159.792C349.9 160.85 348.817 160.059 349.284 158.042L349.875 155.484C349.984 155 349.792 154.325 349.442 153.975L347.375 151.909C346.159 150.692 346.55 149.459 348.25 149.175L350.909 148.734C351.35 148.659 351.884 148.267 352.084 147.859L353.55 144.925C354.35 143.334 355.65 143.334 356.442 144.925" fill="var(--color-warning-surface-accented)"/>
            </svg>
            <span style={{ ...text.body, color: 'var(--color-on-surface-secondary)' }}>
              {master.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Аватар + декоративное кольцо. Аватар 104×104 (rect 153.5,140), кольцо — 3 stroke-арки
            из SVG: gray (top-right) + 2× mint→green gradient. Контейнер 108×108 (по 2px overshoot). */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 108, height: 108, margin: '0 auto',
        }}>
          <svg
            width="108" height="108"
            viewBox="151 138 108 108"
            fill="none"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="masterRingGradBottom" x1="183.053" y1="222.351" x2="187.834" y2="253.309" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--color-grad-green-vibrance-0)"/>
                <stop offset="1" stopColor="var(--color-grad-green-vibrance-100)"/>
              </linearGradient>
              <linearGradient id="masterRingGradTopLeft" x1="165.911" y1="138.15" x2="217.52" y2="195.274" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--color-grad-green-vibrance-0)"/>
                <stop offset="1" stopColor="var(--color-grad-green-vibrance-100)"/>
              </linearGradient>
            </defs>
            {/* Gray arc (top-right): «пустая» часть кольца, stroke=onSurfaceMuted */}
            <path
              d="M209.419 138.143C218.204 138.782 226.7 141.562 234.164 146.238C241.629 150.914 247.837 157.346 252.246 164.972C256.655 172.598 259.131 181.186 259.459 189.989C259.787 198.791 257.957 207.54 254.128 215.473"
              stroke="var(--color-on-surface-muted)" strokeLinecap="round"
            />
            {/* Bottom arc (gradient mint→green) */}
            <path
              d="M250.155 222.354C245.203 229.639 238.545 235.603 230.76 239.724C222.975 243.846 214.3 246.001 205.492 246C196.683 246 188.008 243.845 180.224 239.723C172.439 235.601 165.781 229.637 160.83 222.352"
              stroke="url(#masterRingGradBottom)" strokeWidth="2" strokeLinecap="round"
            />
            {/* Top-left arc (gradient mint→green) */}
            <path
              d="M156.905 215.561C153.062 207.635 151.216 198.889 151.528 190.086C151.84 181.283 154.302 172.69 158.697 165.056C163.092 157.422 169.288 150.98 176.745 146.29C184.201 141.6 192.691 138.806 201.476 138.15"
              stroke="url(#masterRingGradTopLeft)" strokeWidth="2" strokeLinecap="round"
            />
          </svg>

          <div style={{
            position: 'absolute', top: 2, left: 2,
            width: 104, height: 104, borderRadius: 52,
            overflow: 'hidden', background: 'var(--color-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {master.photo
              ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 44, color: 'var(--color-on-surface-secondary)' }}>👤</span>
            }
          </div>
        </div>

        {/* Name + description блок: gap 12 между text-стопкой и тэгом homeVisit.
            Внутри text-стопки gap 2 между name, subtitle, address-row. */}
        <div style={{
          position: 'relative', zIndex: 1, marginTop: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '0 16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
            {/* Имя — Figma «H2»: Nunito Sans ExtraBold 28/36 ls −0.84. */}
            <div style={{
              ...text.h2, color: 'var(--color-on-surface)', textAlign: 'center',
            }}>
              {master.name}
            </div>

            {/* Подзаголовок — Figma «Caption 2» 14/16/500 ls −0.028. */}
            {master.description && (
              <div style={{
                ...text.caption2, color: 'var(--color-on-surface-secondary)', textAlign: 'center',
              }}>
                {master.description}
              </div>
            )}

            {/* Адрес — pin (16×16) + текст в primarySurface, кликабельный →
                открывает системные карты через geo: schema с lat/lng мастера
                (как в ContactsPage). Только если location есть. */}
            {master.location && (
              <button
                type="button"
                onClick={() => {
                  if (master.lat && master.lng) {
                    window.WebApp?.openLink(
                      `geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`
                    )
                  }
                }}
                disabled={!master.lat || !master.lng}
                style={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 3,
                  background: 'none', border: 'none', padding: 0,
                  cursor: master.lat && master.lng ? 'pointer' : 'default',
                }}
              >
                {/* vuesax/linear/location 16×16 stroke=primarySurface */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 8.953a2.08 2.08 0 1 0 0-4.16 2.08 2.08 0 0 0 0 4.16Z" stroke="var(--color-primary-surface)" strokeWidth="1.2"/>
                  <path d="M2.413 5.66c1.314-5.773 9.867-5.767 11.174.007.766 3.387-1.34 6.253-3.187 8.026a3.4 3.4 0 0 1-4.807 0c-1.84-1.773-3.946-4.646-3.18-8.033Z" stroke="var(--color-primary-surface)" strokeWidth="1.2"/>
                </svg>
                <span style={{ ...text.caption2, color: 'var(--color-primary-surface)', textAlign: 'center' }}>
                  {master.location}
                </span>
              </button>
            )}
          </div>

          {/* Тэг «Доступен выезд на дом». Figma: 20px высоты (cap-height 7 + padding 7/6).
              CSS line-height 14 даёт +7px воздуха → 27px, что слишком. Поэтому фиксируем
              height:20 + line-height:20 (центрирует 10px текст в коробке) и убираем
              вертикальные паддинги. */}
          {master.homeVisit && (
            <span style={{
              background: 'var(--color-active-surface)',
              borderRadius: 4,
              display: 'inline-block',
              height: 20,
              padding: '0 6px',
              boxSizing: 'border-box',
              ...text.label3Caps,
              lineHeight: '20px',
              color: 'var(--color-primary-surface)',
            }}>
              Доступен выезд на дом
            </span>
          )}
        </div>
      </div>

      {/* ── Блок ближайшей записи ─────────────────────────────────────── */}
      {nextBooking && (
        <div
          onClick={() => {
            setMasterId(masterId)
            setService(nextBooking.service)
            setDateTime(nextBooking.date, nextBooking.time)
            navigate('/book/success', { state: { bookingId: nextBooking.id } })
          }}
          style={{
            margin: '0 16px 24px', height: 106, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--color-grad-violet-100) 0%, var(--color-grad-violet-0) 100%)',
            display: 'flex', alignItems: 'center', padding: '0 20px',
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Calendar icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 22, flexShrink: 0,
            background: 'var(--color-success-surface-accented)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16.75 3.56V2C16.75 1.59 16.41 1.25 16 1.25C15.59 1.25 15.25 1.59 15.25 2V3.5H8.75V2C8.75 1.59 8.41 1.25 8 1.25C7.59 1.25 7.25 1.59 7.25 2V3.56C4.55 3.81 3.24 5.42 3.04 7.81C3.02 8.1 3.26 8.34 3.54 8.34H20.46C20.75 8.34 20.99 8.09 20.96 7.81C20.76 5.42 19.45 3.81 16.75 3.56Z" fill="white"/>
              <path d="M19 15C16.79 15 15 16.79 15 19C15 19.75 15.21 20.46 15.58 21.06C16.27 22.22 17.54 23 19 23C20.46 23 21.73 22.22 22.42 21.06C22.79 20.46 23 19.75 23 19C23 16.79 21.21 15 19 15ZM21.07 18.57L18.94 20.54C18.8 20.67 18.61 20.74 18.43 20.74C18.24 20.74 18.05 20.67 17.9 20.52L16.91 19.53C16.62 19.24 16.62 18.76 16.91 18.47C17.2 18.18 17.68 18.18 17.97 18.47L18.45 18.95L20.05 17.47C20.35 17.19 20.83 17.21 21.11 17.51C21.39 17.81 21.37 18.28 21.07 18.57Z" fill="white"/>
              <path d="M20 9.84H4C3.45 9.84 3 10.29 3 10.84V17C3 20 4.5 22 8 22H12.93C13.62 22 14.1 21.33 13.88 20.68C13.68 20.1 13.51 19.46 13.51 19C13.51 15.97 15.98 13.5 19.01 13.5C19.3 13.5 19.59 13.52 19.87 13.57C20.47 13.66 21.01 13.19 21.01 12.59V10.85C21 10.29 20.55 9.84 20 9.84ZM9.21 18.21C9.02 18.39 8.76 18.5 8.5 18.5C8.24 18.5 7.98 18.39 7.79 18.21C7.61 18.02 7.5 17.76 7.5 17.5C7.5 17.24 7.61 16.98 7.79 16.79C7.89 16.7 7.99 16.63 8.12 16.58C8.49 16.42 8.93 16.51 9.21 16.79C9.39 16.98 9.5 17.24 9.5 17.5C9.5 17.76 9.39 18.02 9.21 18.21ZM9.21 14.71C9.16 14.75 9.11 14.79 9.06 14.83C9 14.87 8.94 14.9 8.88 14.92C8.82 14.95 8.76 14.97 8.7 14.98C8.63 14.99 8.56 15 8.5 15C8.24 15 7.98 14.89 7.79 14.71C7.61 14.52 7.5 14.26 7.5 14C7.5 13.74 7.61 13.48 7.79 13.29C8.02 13.06 8.37 12.95 8.7 13.02C8.76 13.03 8.82 13.05 8.88 13.08C8.94 13.1 9 13.13 9.06 13.17C9.11 13.21 9.16 13.25 9.21 13.29C9.39 13.48 9.5 13.74 9.5 14C9.5 14.26 9.39 14.52 9.21 14.71ZM12.71 14.71C12.52 14.89 12.26 15 12 15C11.74 15 11.48 14.89 11.29 14.71C11.11 14.52 11 14.26 11 14C11 13.74 11.11 13.48 11.29 13.29C11.67 12.92 12.34 12.92 12.71 13.29C12.89 13.48 13 13.74 13 14C13 14.26 12.89 14.52 12.71 14.71Z" fill="white"/>
            </svg>
          </div>
          {/* Text — 3 lines (gaps from mockup: 22.6px, 33.4px between glyph tops) */}
          <div style={{ flex: 1, marginLeft: 16, minWidth: 0 }}>
            <div style={{ ...text.body, color: 'var(--color-on-primary-surface)', lineHeight: '20px' }}>
              Вы записаны
            </div>
            <div style={{ ...text.footnote, color: 'var(--color-on-primary-surface)', marginTop: 3, lineHeight: '18px' }}>
              {nextBooking.service.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 19, marginTop: 15 }}>
              <span style={{ ...text.footnote, color: 'var(--color-on-surface)', lineHeight: '18px' }}>
                {dayjs(nextBooking.date).format('D MMMM')} в {nextBooking.time}
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                <path d="M10.894 8.327l-.667-1.107c-.14-.247-.267-.713-.267-.987V4.547c0-1.567-.92-2.92-2.247-3.553A1.76 1.76 0 006.994.007c-.727 0-1.38.393-1.727 1.013-1.3.647-2.2 1.987-2.2 3.533v1.687c0 .273-.127.74-.267.98l-.673 1.113c-.267.447-.327.94-.16 1.393.16.447.54.793 1.033.96 1.294.44 2.654.653 4.014.653s2.72-.213 4.013-.647c.467-.153.827-.507 1-.967.173-.46.127-.967-.133-1.393z" fill="var(--color-success-surface-accented)"/>
                <path d="M8.887 12.007c-.28.773-1.02 1.327-1.887 1.327-.527 0-1.047-.214-1.413-.594a2.03 2.03 0 01-.467-.74c.087.014.173.02.267.034.153.02.313.04.473.053.38.033.767.053 1.153.053.38 0 .76-.02 1.134-.053.14-.013.28-.02.413-.04.107-.013.213-.027.327-.04z" fill="var(--color-success-surface-accented)"/>
              </svg>
            </div>
          </div>
          {/* Chevron */}
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1.94 16.28L6.287 11.933C6.8 11.42 6.8 10.58 6.287 10.067L1.94 5.72" stroke="white" strokeOpacity="0.6" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* ── 4 действия. Макет: 4 карточки 91.75×69, gap 4, rx 18, fill=surfaceTransparent.
            Иконка 24×24 (stroke=primarySurface) + label text.action (primarySurface).
            Контейнер relative — чтобы повесить контекст-меню (от «Ещё») absolute снизу-справа. */}
      <div style={{ position: 'relative', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([
            { label: 'Запись',  Icon: IcoBook, action: () => handleBook() },
            { label: 'Звонок', Icon: IcoCall, action: () => {
              if (master.phone)
                window.WebApp?.openLink(`tel:${master.phone.replace(/\D/g, '').replace(/^7/, '+7')}`)
            }, disabled: !master.phone },
            { label: 'Чат',    Icon: IcoChat, action: () => {
              window.WebApp?.openMaxLink('https://max.ru/u/f9LHodD0cOIigfttbzyjUqKELI60m9aczxqqW1rkNwoQQg8IKRZa3afRH24')
            } },
            { label: 'Ещё',    Icon: IcoMore, action: () => setMenuOpen(true) },
          ] as const).map((btn) => {
            const dis = 'disabled' in btn ? btn.disabled : false
            return (
              <button
                key={btn.label}
                onClick={btn.action}
                disabled={dis}
                style={{
                  flex: 1, height: 69, borderRadius: 18,
                  background: 'var(--color-surface-transparent)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  border: 'none', cursor: dis ? 'default' : 'pointer',
                  opacity: dis ? 0.4 : 1, padding: '12px 8px',
                }}
              >
                <btn.Icon />
                {/* Label — Figma «Caption 2»: Nunito Sans Medium 14/16 ls −0.028. */}
                <span style={{ ...text.caption2, color: 'var(--color-primary-surface)' }}>{btn.label}</span>
              </button>
            )
          })}
        </div>

        {/* Контекстное меню — открывается от «Ещё». Bg=surface, rx=16, w=262, padding 20/12.
            Пункты — text.body2 (17/24/400), последний destructive — errorSurfaceAccented.
            Иконки 20×20 справа. Между пунктами 8px-divider (просто gap). */}
        {menuOpen && (
          <>
            {/* Backdrop — захватывает клики вне меню */}
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 99, background: 'transparent',
              }}
            />
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 16, zIndex: 100,
                width: 262, padding: '12px 20px', borderRadius: 16,
                background: 'var(--color-surface)',
                boxShadow: '0 16px 32px rgba(12,12,13,0.10), 0 4px 4px rgba(12,12,13,0.05)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {([
                { label: 'Поделиться контактом', Icon: IcoShare, destructive: false },
                { label: 'В избранное',          Icon: IcoBookmark, destructive: false },
                { label: 'Правила отмены',       Icon: IcoDocument, destructive: false },
                { label: 'Очистить историю',     Icon: IcoTrash, destructive: false },
                { label: 'Заблокировать',        Icon: IcoBlock, destructive: true },
              ] as const).map((item, idx, arr) => (
                <div key={item.label}>
                  <button
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: '100%', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      flex: 1, textAlign: 'left',
                      ...text.body2,
                      color: item.destructive ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)',
                    }}>
                      {item.label}
                    </span>
                    <item.Icon destructive={item.destructive} />
                  </button>
                  {idx < arr.length - 1 && <div style={{ height: 8 }} aria-hidden="true" />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Табы (Услуги / Фото / Отзывы). Макет (Figma):
            tabs container: gap=32, px=30; tab item: gap=4 (text↔counter), py=7 (внутри label-row).
            Лейбл — text.body2 (17/24/400 ls −0.17), счётчик — text.caption2 (14/16/500 ls −0.028).
            Counter pill: min-w 24, padding 3, rounded 20.
            Активный: text=primarySurface, counter bg=activeSurface, текст внутри counter=primarySurface.
            Неактивный: text=onSurfaceSecondary, counter bg=secondarySurface.
            Под активным — 3px-полоска primarySurface (rounded 20px top); сплошного divider нет. */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', gap: 32, padding: '0 30px' }}>
          {TABS.map((key) => {
            const active = tab === key
            const badge = tabBadge(key)
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 'none', background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '7px 0' }}>
                  <span style={{
                    ...text.body2,
                    color: active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)',
                  }}>
                    {TAB_LABELS[key]}
                  </span>
                  {badge > 0 && (
                    <span style={{
                      minWidth: 24, padding: 3, borderRadius: 20,
                      background: active ? 'var(--color-active-surface)' : 'var(--color-secondary-surface)',
                      color: active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)',
                      ...text.caption2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {badge}
                    </span>
                  )}
                </div>
                <div style={{
                  width: '100%', height: 3,
                  background: active ? 'var(--color-primary-surface)' : 'transparent',
                  borderRadius: '20px 20px 0 0',
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Контент табов. Между underline табов (page y=348) и первой карточкой (page y=372) gap=24. */}
      <div style={{ padding: '24px 16px 0' }}>

        {tab === 'services' && (
          <ServicesList categories={master.categories} onCategoryClick={(cat) => {
            setMasterId(masterId)
            navigate(`/book/services?categoryId=${cat.id}`)
          }} />
        )}

        {tab === 'photo' && (
          workPhotos.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Нет фотографий</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {master.reviews.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 32 }}>Пока нет отзывов</div>
            )}
            {master.reviews.map((r) => (
              <div key={r.id} style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 23,
                    background: 'var(--color-divider-low)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {r.client.photo
                      ? <img src={r.client.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ ...text.titleSmall, color: 'var(--color-on-surface-secondary)' }}>👤</span>
                    }
                  </div>
                  <div>
                    <div style={{ ...text.bodyMedium, color: 'var(--color-on-surface)' }}>{r.client.name}</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < r.rating ? 'var(--color-warning-surface-accented)' : 'var(--color-divider-low)'}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                {r.text && <p style={{ ...text.body, color: 'var(--color-on-surface-secondary)', lineHeight: 1.5, margin: 0 }}>{r.text}</p>}
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
              <path d="M1 1l14 14M15 1L1 15" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round"/>
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
                  background: i === lightboxIndex ? 'var(--color-on-primary-surface)' : 'rgba(255,255,255,0.35)',
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
    /* Макет: карточки 379×88 (с бейджем) / 379×76 (без), rx=20, fill=surfaceTransparent.
       Между карточками gap=8. Padding внутри подгоняется под содержимое. */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {categories.map((cat) => {
        const hasDiscount = cat.services.some((s) => s.discountPercent)
        const preview = cat.services.map((s) => s.name).join(' • ')

        return (
          <div
            key={cat.id}
            onClick={() => onCategoryClick(cat)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--color-surface-transparent)',
              borderRadius: 20,
              padding: '16px 16px 16px 20px',
              cursor: 'pointer',
            }}
          >
            {/* Аватар категории 44×44 (макет: rect 36,518 → 36,518+44 ⇒ 44×44, rx=22). */}
            <div style={{
              width: 44, height: 44, borderRadius: 22, flexShrink: 0,
              overflow: 'hidden', background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cat.photo
                ? <img src={cat.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ ...text.titleSmall, color: 'var(--color-on-surface-secondary)' }}>✂️</span>
              }
            </div>

            {/* Название + (опц. бейдж скидки) + описание.
                Title — Figma «Callout 1» (17/24/700 ls −0.17), gap=6 между title и tag. */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{cat.name}</span>
                {hasDiscount && (
                  /* Tag: высота 20 (Figma metadata), горизонт. padding 6, текст
                     центрирован через line-height:20. См. комментарий у homeVisit-тэга. */
                  <span style={{
                    borderRadius: 4,
                    display: 'inline-block',
                    height: 20,
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    background: 'var(--color-error-surface-lite)',
                    color: 'var(--color-on-error-surface-lite)',
                    ...text.label3Caps,
                    lineHeight: '20px',
                  }}>
                    % скидки
                  </span>
                )}
              </div>
              {/* Description — Figma «Caption 2» (14/16/500). До 2 строк, далее ellipsis;
                  обрезка идёт по доступной ширине между аватаром и шевроном. */}
              <div style={{
                color: 'var(--color-on-surface-secondary)', ...text.caption2,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {cat.description || preview}
              </div>
            </div>

            {/* Chevron → 16×16 (interactiveElementSecondary) */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )
      })}
    </div>
  )
}
