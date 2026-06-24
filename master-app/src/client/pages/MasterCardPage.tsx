import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { reviewsApi } from '@client/api/reviews.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Booking, Category, Master, Service } from '@client/types'
import { UNCATEGORIZED_CATEGORY_ID } from '@/types'
import BottomNav from '@client/components/BottomNav'
import MasterCardSkeleton from '@client/components/MasterCardSkeleton'
import { startParam } from '@/App'
import { text } from '@/styles/typography'
import capybaraBookingImg from '@/assets/capybara-booking.png'

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
  const { setMasterId, setService, setDateTime, setMasterProfileLink, masterId: storeMasterId } = useBookingStore()
  const masterId = (UUID_REGEX.test(startParam) ? startParam : null)
    ?? params.get('masterId')
    ?? storeMasterId
    ?? ''
  const navigate = useNavigate()

  const [master, setMaster] = useState<Master | null>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [bookingsExpanded, setBookingsExpanded] = useState(false)
  const [tab, setTab] = useState<Tab>('services')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxMenuOpen, setLightboxMenuOpen] = useState(false)
  // Сбрасываем меню «Ещё», когда лайтбокс закрывается.
  useEffect(() => {
    if (lightboxIndex === null) setLightboxMenuOpen(false)
  }, [lightboxIndex])
  const [menuOpen, setMenuOpen] = useState(false)
  const lbStripRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  // Отзыв: последняя завершённая запись этого мастера без отзыва → промо-блок + форма.
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [reviewDismissed, setReviewDismissed] = useState(false)
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewToast, setReviewToast] = useState(false)

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId)
      .then((m) => { setMaster(m); setMasterProfileLink(m.maxProfileLink) })
      .catch(() => {})
  }, [masterId, setMasterProfileLink])

  useEffect(() => {
    if (!masterId) return
    const now = dayjs()
    const today = now.format('YYYY-MM-DD')
    bookingsApi.list({ status: 'CONFIRMED', from: today }).then((bookings) => {
      const forMaster = bookings
        .filter((b) => b.master.id === masterId)
        .filter((b) => dayjs(`${b.date} ${b.time}`).isAfter(now))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      setUpcomingBookings(forMaster)
    }).catch(() => {})
  }, [masterId])

  // Последняя завершённая запись этого мастера без отзыва — для промо-блока «Оцените услуги».
  useEffect(() => {
    if (!masterId) return
    bookingsApi.list({ status: 'COMPLETED' }).then((bookings) => {
      const latest = bookings
        .filter((b) => b.master.id === masterId && !b.review)
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0]
      setReviewBooking(latest ?? null)
    }).catch(() => {})
  }, [masterId])

  // Каждое фото несёт ссылку на свою услугу — нужно для подписи в лайтбоксе.
  const workPhotos = (master?.categories ?? [])
    .flatMap((c) => c.services)
    .flatMap((s) => ((s as any).workPhotos ?? []).map((p: any) => ({ ...p, serviceName: s.name })))
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
      // Не фиксируем направление, пока жест не превысил порог: шум первого
      // touchmove (2–3px) иначе лочит 'v', и листание перестаёт срабатывать.
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
    // Быстрый флик может не дать ни одного touchmove (dir === null) — тогда
    // определяем направление по финальному смещению, иначе листание «теряется».
    const horiz = dir === 'h' || (dir === null && Math.abs(dx) > Math.abs(dy))
    if (!horiz) return
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
    <>
      <MasterCardSkeleton />
      <BottomNav />
    </>
  )

  // Мастер заблокирован (не оплатил подписку) — вместо карточки показываем заглушку.
  if (master.blocked) return (
    <>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px 95px', textAlign: 'center', gap: 12 }}>
        <div style={{ ...text.titleSmall, color: 'var(--color-on-surface)' }}>
          Личный кабинет недоступен
        </div>
        <div style={{ ...text.body, color: 'var(--color-on-surface-secondary)' }}>
          У мастера больше нет личного кабинета. Попробуйте связаться с ним другим способом.
        </div>
      </div>
      <BottomNav />
    </>
  )

  // «Поделиться контактом» — расшарить ссылку на этого мастера (клиент-бот,
  // ?start=<masterId> — тот же формат, что в ShareLinkPage у мастера).
  const handleShareContact = () => {
    const clientBotName = (import.meta.env.VITE_CLIENT_BOT_NAME as string | undefined) || 'id9706002253_1_bot'
    const link = `https://max.ru/${clientBotName}?start=${masterId}`
    const text = `Запишитесь к мастеру ${master.name} в Max:\n${link}`
    try { window.WebApp?.shareContent?.({ text }) } catch { /* ignore */ }
  }

  // Подпись «{услуга}, {когда}» для промо-блока/формы отзыва.
  const reviewSubtitle = reviewBooking
    ? `${reviewBooking.service.name}, ${reviewBooking.date === dayjs().format('YYYY-MM-DD') ? 'сегодня' : dayjs(reviewBooking.date).format('D MMMM')}`
    : ''

  const openReviewSheet = () => {
    setReviewRating(0)
    setReviewText('')
    setReviewSheetOpen(true)
  }

  const submitReview = async () => {
    if (!reviewBooking || reviewRating === 0 || reviewSubmitting) return
    setReviewSubmitting(true)
    try {
      await reviewsApi.create({ bookingId: reviewBooking.id, rating: reviewRating, text: reviewText.trim() || undefined })
      setReviewSheetOpen(false)
      setReviewDismissed(true)
      setReviewBooking(null)
      setReviewToast(true)
      setTimeout(() => setReviewToast(false), 2500)
      // Обновляем карточку — рейтинг и список отзывов пересчитаны на бэкенде.
      mastersApi.getById(masterId).then(setMaster).catch(() => {})
    } catch {
      /* ignore */
    } finally {
      setReviewSubmitting(false)
    }
  }

  const showReviewPromo = !!reviewBooking && !reviewDismissed

  /* ── Рендер ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 95 }}>

      {/* ── HERO: layout-only. Декор (paint0 + 2 цветных круга + blur-overlay) —
            глобальный, на #root > div через --gradient-hero-background.
            Контент сидит на этом фоне напрямую. */}
      <div style={{ position: 'relative', paddingTop: 16, paddingBottom: 24 }}>

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

        {/* Аватар 104×104 (без декоративного кольца). */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 104, height: 104, margin: '0 auto',
          borderRadius: 52, overflow: 'hidden', background: 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 44, color: 'var(--color-on-surface-secondary)' }}>👤</span>
          }
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
                открывает системные карты через geo: schema с lat/lng мастера.
                Показываем только если мастер НЕ выезжает на дом и есть location. */}
            {!master.homeVisit && master.location && (
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
                  maxWidth: '100%',
                }}
              >
                {/* vuesax/linear/location 16×16 stroke=primarySurface */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M8 8.953a2.08 2.08 0 1 0 0-4.16 2.08 2.08 0 0 0 0 4.16Z" stroke="var(--color-primary-surface)" strokeWidth="1.2"/>
                  <path d="M2.413 5.66c1.314-5.773 9.867-5.767 11.174.007.766 3.387-1.34 6.253-3.187 8.026a3.4 3.4 0 0 1-4.807 0c-1.84-1.773-3.946-4.646-3.18-8.033Z" stroke="var(--color-primary-surface)" strokeWidth="1.2"/>
                </svg>
                <span style={{
                  ...text.caption2, color: 'var(--color-primary-surface)', textAlign: 'center',
                  minWidth: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', wordBreak: 'break-word',
                }}>
                  {master.location}
                </span>
              </button>
            )}
          </div>

          {/* Тэг «Доступен выезд на дом» — только если мастер выезжает на дом.
              Адрес выше в этом случае скрыт (взаимоисключаются по homeVisit).
              Figma: 20px высоты (cap-height 7 + padding 7/6). CSS line-height 14
              даёт +7px воздуха → 27px, что слишком. Фиксируем height:20 +
              line-height:20 (центрирует 10px текст) и убираем верт. паддинги. */}
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

      {/* ── Блок ближайших записей (Figma 8534:16529 «appointmentWidget») ────
            Контейнер: pl=8 pr=20 py=16, rx=20, gap=8, items-center.
            Background: linear-gradient(206.87°, gradViolet100 5.83% → gradViolet0 90.48%).
            Слева — capybara-стикер 80×80, справа — flex-col gap=8:
              caption3Caps «ВЫ ЗАПИСАНЫ» (service-text)
              N row(ов) с (callout1 «D MMMM в HH:mm» + 15/20/400 service-text service.name) + arrow-right 16
              Если bookings > 1: divider + «И ещё N» / «Свернуть» + arrow-down/up 16. */}
      {upcomingBookings.length > 0 && (() => {
        const visibleBookings = bookingsExpanded
          ? upcomingBookings
          : upcomingBookings.slice(0, 1)
        const goToBooking = (b: Booking) => {
          setMasterId(masterId)
          setService(b.service)
          setDateTime(b.date, b.time)
          navigate('/book/success', { state: { bookingId: b.id } })
        }
        const moreCount = upcomingBookings.length - 1
        return (
          <div style={{ padding: '0 16px', marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '16px 20px 16px 8px',
              borderRadius: 20,
              background: 'linear-gradient(206.87deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
              width: '100%',
            }}>
              <img
                src={capybaraBookingImg}
                alt=""
                style={{
                  width: 80, height: 80,
                  objectFit: 'contain',
                  flexShrink: 0,
                  // Якорим к верху всегда — иначе при раскрытии списка
                  // вертикальное центрирование смещает капибару вниз.
                  alignSelf: 'flex-start',
                }}
              />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{
                  ...text.caption3Caps,
                  color: 'var(--color-service-text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  Вы записаны
                </span>

                {visibleBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => goToBooking(b)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        // on-surface (не on-primary-surface): фиолетовый градиент карточки
                        // в светлой теме бледный, а #FFF был нечитаем. on-surface = белый
                        // в тёмной (как было) и тёмный в светлой.
                        ...text.callout1, color: 'var(--color-on-surface)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {dayjs(b.date).format('D MMMM')} в {b.time}
                      </div>
                      <div style={{
                        fontSize: 15, lineHeight: '20px', fontWeight: 400, letterSpacing: -0.15,
                        color: 'var(--color-service-text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {b.service.name}
                      </div>
                    </div>
                    {/* vuesax/linear/arrow-right 16×16 */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M8.91 19.92L15.43 13.4c.77-.77.77-2.03 0-2.8L8.91 4.08" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}

                {upcomingBookings.length > 1 && (
                  <div
                    onClick={() => setBookingsExpanded((v) => !v)}
                    style={{
                      cursor: 'pointer',
                      borderTop: '1px solid rgba(255,255,255,0.18)',
                      paddingTop: 8,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{
                      fontSize: 14, lineHeight: '20px', fontWeight: 700, letterSpacing: -0.14,
                      color: 'var(--color-service-text)',
                    }}>
                      {bookingsExpanded ? 'Свернуть' : `И ещё ${moreCount}`}
                    </span>
                    {/* vuesax/linear/arrow-down 16×16, поворот на 180° когда раскрыто */}
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      style={{
                        flexShrink: 0,
                        transform: bookingsExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    >
                      <path d="M19.92 8.95l-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95" stroke="var(--color-service-text)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Промо «Оцените услуги мастера» (Figma 9844:68568) — последняя завершённая
            запись без отзыва. Фиолетовый градиент, заголовок + услуга/дата + кнопка + крестик. */}
      {showReviewPromo && (
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <div style={{
            position: 'relative',
            display: 'flex', flexDirection: 'column', gap: 24,
            padding: 20, borderRadius: 20,
            background: 'linear-gradient(214.51deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 230 }}>
              <div style={{ ...text.titleSmall, color: 'var(--color-on-surface)' }}>Оцените услуги мастера</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{reviewSubtitle}</div>
            </div>
            <button
              type="button"
              onClick={openReviewSheet}
              style={{
                height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'var(--color-primary-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...text.callout1, color: 'var(--color-on-primary-surface)',
              }}
            >
              Оставить отзыв
            </button>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setReviewDismissed(true)}
              style={{
                position: 'absolute', top: 12, right: 12, width: 28, height: 28,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="var(--color-on-surface)" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
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
              if (master.maxProfileLink) window.WebApp?.openMaxLink(master.maxProfileLink)
            }, disabled: !master.maxProfileLink },
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
                { label: 'Поделиться контактом', Icon: IcoShare, destructive: false, onSelect: handleShareContact },
                { label: 'Правила отмены',       Icon: IcoDocument, destructive: false, onSelect: () => {} },
                { label: 'Заблокировать',        Icon: IcoBlock, destructive: true, onSelect: () => {} },
              ] as const).map((item, idx, arr) => (
                <div key={item.label}>
                  <button
                    onClick={() => { item.onSelect(); setMenuOpen(false) }}
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
            /* Figma 8534:30813: grid 3-col gap=1px, container rx=20 overflow:hidden,
               каждая ячейка с маленьким rx=2. Сетка растягивается до краёв
               экрана (margin: 0 -16) — rx=20 виден в верхних/нижних углах. */
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              margin: '0 -16px',
              borderRadius: 20,
              overflow: 'hidden',
            }}>
              {workPhotos.map((p: any, i: number) => (
                <div
                  key={p.id}
                  onClick={() => setLightboxIndex(i)}
                  style={{
                    aspectRatio: '134/170',
                    overflow: 'hidden',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
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

      {/* ── Лайтбокс (Figma 8534:33102) ────────────────────────────────────
            Toolbar сверху: back-кнопка + (download / more) pill, без «1/6».
            Footer снизу bg=#0F0F11: dots + название услуги (имя мастера игнорируем).
            More-меню → один пункт «Поделиться» через WebApp.shareContent (скопировать игнорируем). */}
      {lightboxIndex !== null && (() => {
        const current = workPhotos[lightboxIndex] as any | undefined
        const photoUrl: string = current?.url ?? ''
        const photoServiceName: string = current?.serviceName ?? ''
        const fileNameFromUrl = (() => {
          try {
            const path = new URL(photoUrl).pathname
            const name = path.split('/').pop() || 'photo.jpg'
            return name
          } catch {
            return 'photo.jpg'
          }
        })()
        const handleDownload = () => {
          if (!photoUrl) return
          try { window.WebApp?.downloadFile?.(photoUrl, fileNameFromUrl) } catch { /* ignore */ }
        }
        const handleShare = () => {
          if (!photoUrl) return
          const text = photoServiceName ? `${photoServiceName}\n${photoUrl}` : photoUrl
          try { window.WebApp?.shareContent?.({ text }) } catch { /* ignore */ }
          setLightboxMenuOpen(false)
        }
        return (
          <div
            onClick={() => setLightboxMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              // Тот же hero-градиент что на самой странице (#root > div).
              // Последний слой переменной — linear-gradient surface→background,
              // он же заливает всю область, так что отдельный bg-color не нужен.
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
                  // none (не manipulation): WebView иначе перехватывает чуть
                  // сдвинутый тап как пан → pointercancel, и закрытие «теряется».
                  touchAction: 'none',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Trailing pill: download + more, gap=12, padding=4 */}
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
                  {/* vuesax/linear/import 24×24 */}
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
                  {/* vuesax/linear/more 24×24 (3 dots horizontal) */}
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

            {/* Photo strip — touch swipe только тут, не на toolbar/footer.
                top=56 (toolbar), bottom=74 (footer dots+text) — так hero-градиент
                с outer-обёртки видим в toolbar-зоне и фото туда не залезает. */}
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
                  {workPhotos[idx] && (
                    <img src={(workPhotos[idx] as any).url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Footer: dots + service name. bg=#0F0F11. */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
                background: '#0F0F11',
                padding: '12px 16px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              {workPhotos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
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

      {/* ── Bottom-sheet формы отзыва (Figma 9844:67759) ───────────────────── */}
      {reviewSheetOpen && (
        <div
          onClick={() => setReviewSheetOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', boxSizing: 'border-box',
              background: 'var(--color-background)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: '24px 16px calc(40px + env(safe-area-inset-bottom))',
              display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center',
            }}
          >
            <button
              type="button" aria-label="Закрыть" onClick={() => setReviewSheetOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="var(--color-on-surface)" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>

            {/* Заголовок + услуга/дата + звёзды */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
                <div style={{ ...text.titleSmall, color: 'var(--color-on-surface)' }}>Оцените услуги мастера</div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{reviewSubtitle}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 267, maxWidth: '100%' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n} type="button" aria-label={`Оценка ${n}`} onClick={() => setReviewRating(n)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24"
                      fill={n <= reviewRating ? 'var(--color-warning-surface-accented)' : 'none'}
                      stroke={n <= reviewRating ? 'none' : 'var(--color-on-surface-secondary)'} strokeWidth="1.5">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Поле «Расскажите о своём опыте». Лимит 200, счётчик за 10 символов до лимита. */}
            <div style={{ width: '100%', boxSizing: 'border-box', borderRadius: 20, background: 'var(--color-surface)', border: '2px solid var(--color-primary-surface)', padding: '16px 12px 8px' }}>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', padding: '0 8px' }}>Расскажите о своём опыте</div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: 'none', border: 'none', outline: 'none',
                  padding: '2px 8px 0',
                  ...text.callout1, color: 'var(--color-on-surface)', fontFamily: 'inherit',
                }}
              />
              {reviewText.length >= 190 && (
                <div style={{ textAlign: 'right', padding: '0 8px', fontSize: 13, lineHeight: '16px', letterSpacing: 0.13, color: 'var(--color-service-text)' }}>
                  {reviewText.length} / 200
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { void submitReview() }}
              disabled={reviewRating === 0 || reviewSubmitting}
              style={{
                width: '100%', height: 60, borderRadius: 20, border: 'none',
                cursor: reviewRating === 0 || reviewSubmitting ? 'default' : 'pointer',
                background: reviewRating === 0 ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
                color: reviewRating === 0 ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
                ...text.callout1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {reviewSubmitting ? 'Отправляем…' : 'Оставить отзыв'}
            </button>
          </div>
        </div>
      )}

      {/* ── Тост «Отзыв отправлен» (Figma 9844:69095) — mint-градиент сверху. */}
      {reviewToast && (
        <div style={{
          position: 'fixed', top: 'calc(12px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, width: 'calc(100% - 32px)', maxWidth: 340, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 8, padding: '15px 16px', borderRadius: 16,
          background: 'linear-gradient(195.23deg, var(--color-grad-mint-100) 5.83%, var(--color-grad-mint-0) 90.48%)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="var(--color-on-surface)" strokeWidth="1.5"/>
            <path d="m7.75 12 2.83 2.83 5.67-5.66" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>Отзыв отправлен</span>
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
        const isUncat = cat.id === UNCATEGORIZED_CATEGORY_ID
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
            {/* Аватар категории 44×44 (макет: rect 36,518 → 36,518+44 ⇒ 44×44, rx=22).
                Для «Услуги без категории» — фиолетовый градиент + белая папка (макет 8905:49213). */}
            {isUncat ? (
              <div style={{
                width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                background: 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* vuesax/linear/folder 20×20, белая */}
                <svg width="20" height="20" viewBox="46 214 24 24" fill="none">
                  <path d="M68 225V231C68 235 67 236 63 236H53C49 236 48 235 48 231V221C48 217 49 216 53 216H54.5C56 216 56.33 216.44 56.9 217.2L58.4 219.2C58.78 219.7 59 220 60 220H63C67 220 68 221 68 225Z" stroke="#FFFFFF" strokeWidth="1.75" strokeMiterlimit="10"/>
                </svg>
              </div>
            ) : (
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
            )}

            {/* Название + (опц. бейдж скидки) + описание.
                Title — Figma «Callout 1» (17/24/700 ls −0.17), gap=6 между title и tag. */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                {hasDiscount && (
                  /* Tag: высота 20 (Figma metadata), горизонт. padding 6, текст
                     центрирован через line-height:20. См. комментарий у homeVisit-тэга. */
                  <span style={{
                    borderRadius: 4,
                    display: 'inline-block',
                    flexShrink: 0,
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
              {/* Description — Figma «Caption 2» (14/16/500). До 2 строк, далее ellipsis.
                  У синтетической «Услуги без категории» подзаголовка нет (макет 8905:49213). */}
              {!isUncat && (
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
              )}
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
