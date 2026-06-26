import { text } from '@/styles/typography'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useAuthStore } from '@/store/auth.store'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { discountedPrice, UNCATEGORIZED_CATEGORY_ID, type Booking, type Category, type Review } from '@/types'
import ProfileSkeleton from '@/components/ProfileSkeleton'
import CategoryAvatar from '@/components/CategoryAvatar'

dayjs.locale('ru')

type Tab = 'services' | 'photos' | 'reviews'

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function ProfilePage() {
  const { master, refreshMaster } = useAuthStore()
  const navigate = useNavigate()

  // Подтягиваем свежий профиль при каждом заходе на главную: категории/услуги/фото
  // могли поменяться в /services и т.п. Стор уже содержит master — показываем его
  // сразу, refreshMaster обновляет на месте (без скелетона), и новые данные видны
  // сразу после возврата, без перезапуска мини-аппа.
  useEffect(() => { void refreshMaster() }, [refreshMaster])
  const [activeTab, setActiveTab] = useState<Tab>('services')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxMenuOpen, setLightboxMenuOpen] = useState(false)
  // Сбрасываем меню «Ещё», когда лайтбокс закрывается (параллель с MasterCardPage).
  useEffect(() => {
    if (lightboxIndex === null) setLightboxMenuOpen(false)
  }, [lightboxIndex])

  const lbStripRef = useRef<HTMLDivElement>(null)
  const lbTouch = useRef({ startX: 0, startY: 0, dir: null as 'h' | 'v' | null, moved: false })

  const totalServices = master?.categories.reduce((acc, c) => acc + c.services.length, 0) ?? 0

  const [reviews, setReviews]         = useState<Review[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const today = dayjs().format('YYYY-MM-DD')
  const todayDay = dayjs(today)

  useEffect(() => {
    if (reviewsLoaded || !master?.id) return
    mastersApi.getReviews(master.id)
      .then((r) => { setReviews(r); setReviewsLoaded(true) })
      .catch(() => setReviewsLoaded(true))
  }, [master?.id, reviewsLoaded])

  useEffect(() => {
    bookingsApi.list({ from: today, to: today })
      .then(setBookings)
      .catch(() => {})
  }, [today])

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== 'CANCELLED')
        .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, today],
  )
  const isTodayNonWorking = !!master?.schedule && !master.schedule.workingDays.includes(todayDay.day() || 7)

  // Подписка: баннер «Не смогли оплатить» в статусе GRACE. payUrl префетчим (openLink
  // требует синхронного user-gesture), открываем по тапу «Оплатить».
  const [subState, setSubState] = useState<SubscriptionState | null>(null)
  const [payUrl, setPayUrl] = useState<string | null>(null)
  useEffect(() => { subscriptionApi.getMe().then(setSubState).catch(() => {}) }, [])
  useEffect(() => {
    if (subState?.status === 'GRACE' && !payUrl) {
      subscriptionApi.pay().then((r) => setPayUrl(r.paymentURL)).catch(() => {})
    }
  }, [subState, payUrl])
  const handlePaySubscription = () => {
    if (!payUrl) return
    if (window.WebApp?.openLink) window.WebApp.openLink(payUrl)
    else window.open(payUrl, '_blank')
  }

  // Каждое фото несёт ссылку на свою услугу — нужно для подписи в лайтбоксе
  // (как в клиентском MasterCardPage).
  const workPhotos = (master?.categories ?? [])
    .flatMap((c) => c.services)
    .flatMap((s) => ((s as any).workPhotos ?? []).map((p: any) => ({ ...p, serviceName: s.name })))
    .sort((a: any, b: any) => a.order - b.order)

  /* ── Lightbox touch (только горизонтальный свайп — параллель с MasterCardPage) ── */
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

  /* ── Skeleton-загрузка пока master не пришёл из authStore ─────────────── */
  if (!master) return <ProfileSkeleton />

  return (
    <div style={{ minHeight: '100dvh', overflowX: 'hidden' }}>

      {/* ── Floating toolbar над hero (Figma toolbarTop, 8717:50168) — стиль обновлённых
            экранов: слева рейтинг, справа пилюля действий [Поделиться][Настройки]
            (bg-background, rounded22, p4, gap12). Не sticky, без своего bg, fold-в hero. */}
      <div style={{
        height: 56, padding: '6px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 5,
      }}>
        {/* Рейтинг (слева): звезда 18×16 + число (body / onSurfaceSecondary). */}
        {master.rating > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 6 }}>
            <svg width="18" height="16" viewBox="346 144 18 16" fill="none">
              <path d="M356.442 144.925L357.909 147.859C358.109 148.267 358.642 148.659 359.092 148.734L361.75 149.175C363.45 149.459 363.85 150.692 362.625 151.909L360.559 153.975C360.209 154.325 360.017 155 360.125 155.484L360.717 158.042C361.184 160.067 360.109 160.85 358.317 159.792L355.825 158.317C355.375 158.05 354.634 158.05 354.175 158.317L351.684 159.792C349.9 160.85 348.817 160.059 349.284 158.042L349.875 155.484C349.984 155 349.792 154.325 349.442 153.975L347.375 151.909C346.159 150.692 346.55 149.459 348.25 149.175L350.909 148.734C351.35 148.659 351.884 148.267 352.084 147.859L353.55 144.925C354.35 143.334 355.65 143.334 356.442 144.925" fill="var(--color-warning-surface-accented)"/>
            </svg>
            <span style={{ ...text.body, color: 'var(--color-on-surface-secondary)' }}>
              {master.rating.toFixed(1)}
            </span>
          </div>
        ) : <div />}

        {/* Действия (справа): пилюля — share слева от шестерёнки. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 4,
          background: 'var(--color-background)', borderRadius: 22,
        }}>
          <button type="button" onClick={() => navigate('/share')} aria-label="Поделиться" style={toolbarIconBtnStyle}>
            <ProfileShareIcon />
          </button>
          <button type="button" onClick={() => navigate('/settings')} aria-label="Настройки профиля" style={toolbarIconBtnStyle}>
            <SettingsCogIcon />
          </button>
        </div>
      </div>

      {/* HERO: декор (gradient + circles + blur) — глобальный, через --gradient-hero-background
          на #root > div. Здесь только layout: padding 0/24 (top сдвинут toolbar'ом). */}
      <div style={{ position: 'relative', paddingBottom: 24, background: 'var(--gradient-hero-background)' }}>

        {/* (Рейтинг переехал в тулбар слева.) */}

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

        {/* Имя + описание + адрес/homeVisit. marginTop 18 от аватара (gap из Figma).
            Внутри: gap 2 между name и value-блоком; внутри value-блока gap 4 между
            description и address-row. Внешний gap 12 — между text-stack и homeVisit-бейджем. */}
        <div style={{
          position: 'relative', zIndex: 1, marginTop: 18,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '0 16px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
            <div style={{ ...text.h2, color: 'var(--color-on-surface)', textAlign: 'center' }}>
              {master.name || 'Мастер'}
            </div>

            {master.description && (
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', textAlign: 'center' }}>
                {master.description}
              </div>
            )}

            {/* Адрес: pin 16 + текст primarySurface. Клик открывает геокоординаты в Картах.
                Скрыт, если homeVisit (тогда вместо адреса показываем бейдж выезда). */}
            {!master.homeVisit && master.location && (
              <button
                type="button"
                onClick={() => {
                  if (master.lat && master.lng) {
                    window.WebApp?.openLink?.(
                      `geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`,
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

          {/* Бейдж «Доступен выезд на дом» — только если homeVisit. */}
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

        <HomeSchedulePreview
          date={todayDay}
          bookings={todayBookings}
          isDayOff={isTodayNonWorking}
          onOpenSchedule={() => navigate('/bookings')}
          onAddBooking={() => navigate('/bookings/new', { state: { date: today } })}
          onOpenBooking={(bookingId) => navigate(`/bookings/${bookingId}`)}
        />
      </div>

      {/* Баннер «Не смогли оплатить подписку» (GRACE) — peach-градиент (Figma 8943-31215). */}
      {subState?.status === 'GRACE' && (
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <button
            type="button"
            onClick={handlePaySubscription}
            style={{
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '15px 16px', borderRadius: 16,
              background: 'linear-gradient(212.47deg, var(--color-grad-peach-100) 5.83%, var(--color-grad-peach-0) 90.48%)',
            }}
          >
            <span style={{ padding: 2, flexShrink: 0, display: 'inline-flex' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M2 9h20" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 16h3M11 16h4" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.44 3.5h11.11C21.11 3.5 22 4.39 22 7.92v8.16c0 3.53-.89 4.42-4.44 4.42H6.44C2.89 20.5 2 19.61 2 16.08V7.92C2 4.39 2.89 3.5 6.44 3.5Z" stroke="var(--color-on-surface)" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>
                Не смогли оплатить подписку с вашей карты. Пополните карту и повторите попытку
              </span>
              <span style={{ ...text.body2, fontWeight: 700, color: 'var(--color-on-surface)' }}>
                Оплатить
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Табы (Услуги / Фото / Отзывы). По Figma:
          container gap=32, padding 0 30; tab gap=4 между label и counter, py=7.
          Label — text.body2 (17/24/400 ls −0.17); counter — text.caption2 + pill (min-w 24,
          padding 3, rounded 20). Активный: text=primarySurface, counter bg=activeSurface;
          неактивный: text=onSurfaceSecondary, counter bg=secondarySurface.
          Под активным — 3px-полоска primarySurface (rounded 20px top), общего divider нет. */}
      <div style={{ display: 'flex', gap: 32, padding: '0 30px' }}>
        {([
          { key: 'services', label: 'Услуги', count: totalServices },
          { key: 'photos',   label: 'Фото',   count: workPhotos.length },
          { key: 'reviews',  label: 'Отзывы', count: reviews.length },
        ] as { key: Tab; label: string; count: number }[]).map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
                  {tab.label}
                </span>
                {tab.count > 0 && (
                  <span style={{
                    minWidth: 24, padding: 3, borderRadius: 20,
                    background: active ? 'var(--color-active-surface)' : 'var(--color-secondary-surface)',
                    color: active ? 'var(--color-primary-surface)' : 'var(--color-on-surface-secondary)',
                    ...text.caption2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tab.count}
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

      {/* Контент табов. gap=24 между underline табов и первой карточкой (Figma y 348→372). */}
      <div style={{ padding: '24px 16px 80px' }}>
        {activeTab === 'services' && (
          master.categories.length
            ? <ServicesList
                categories={master.categories}
                onCategoryClick={(cat) => navigate('/bookings/new', { state: { categoryId: cat.id } })}
              />
            : <EmptyState
                label="Услуги ещё не добавлены"
                action={{ label: '+ Добавить услуги', onClick: () => navigate('/services') }}
              />
        )}
        {activeTab === 'photos' && (
          !workPhotos.length
            ? <EmptyState label="Фото работ появятся здесь" />
            : (
              /* Сетка фото: 3 кол., gap=1, рамка rx=20 overflow:hidden до краёв экрана. */
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
        {activeTab === 'reviews' && (
          reviews.length === 0
            ? <EmptyState label={reviewsLoaded ? 'Пока нет отзывов' : 'Загрузка…'} />
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviews.map((r) => (
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

      {/* ── Лайтбокс (параллель с MasterCardPage 8534:33102) ────────────────
            Toolbar сверху: back-кнопка + (download / more) pill, без «1/6».
            Footer снизу bg=#0F0F11: dots + название услуги.
            More-меню → один пункт «Поделиться» через WebApp.shareContent. */}
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
          const t = photoServiceName ? `${photoServiceName}\n${photoUrl}` : photoUrl
          try { window.WebApp?.shareContent?.({ text: t }) } catch { /* ignore */ }
          setLightboxMenuOpen(false)
        }
        return (
          <div
            onClick={() => setLightboxMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              // Тот же hero-градиент что на самой странице (#root > div).
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
    </div>
  )
}

function HomeSchedulePreview({ date, bookings, isDayOff, onOpenSchedule, onAddBooking, onOpenBooking }: {
  date: dayjs.Dayjs
  bookings: Booking[]
  isDayOff: boolean
  onOpenSchedule: () => void
  onAddBooking: () => void
  onOpenBooking: (bookingId: string) => void
}) {
  return (
    <section style={{ padding: '0 32px 32px' }}>
      <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <button
          type="button"
          onClick={onOpenSchedule}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
        >
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>{date.format('D MMMM')}</span>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--color-success-surface-accented)', flexShrink: 0 }} />
          <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{capitalize(date.format('dddd'))}</span>
        </button>
        <button
          type="button"
          aria-label="Создать запись на сегодня"
          onClick={onAddBooking}
          style={{ width: 44, height: 44, borderRadius: 22, border: 'none', flexShrink: 0, background: '#007AFE', color: 'var(--color-on-primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
        >
          <ScheduleAddIcon />
        </button>
      </div>
      <div style={{ height: 1, background: 'var(--color-divider-low)' }} />
      {(isDayOff || bookings.length === 0) && (
        <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.body2, color: 'var(--color-on-surface-muted)' }}>
          {isDayOff ? 'Выходной' : 'Нет записей на сегодня'}
        </div>
      )}
      {bookings.map((booking) => {
        const endDateTime = dayjs(`${booking.date}T${booking.time}`).add(booking.service.duration, 'minute')
        const endTime = endDateTime.format('HH:mm')
        const price = booking.price ?? discountedPrice(booking.service.price, booking.service.discountPercent) ?? booking.service.price
        const isPast = endDateTime.isBefore(dayjs())
        const primaryColor = isPast ? 'var(--color-on-surface-muted)' : 'var(--color-on-surface)'
        const secondaryColor = isPast ? 'var(--color-on-surface-muted)' : 'var(--color-on-surface-secondary)'
        const statusColor = isPast ? 'var(--color-pattern-element)' : 'var(--color-success-surface-accented)'
        return (
          <button key={booking.id} type="button" onClick={() => onOpenBooking(booking.id)} style={{ width: '100%', height: 60, border: 'none', borderBottom: '1px solid var(--color-divider-low)', padding: 0, background: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 4, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 }}>
              <div style={{ width: 3, height: 40, borderRadius: 2, background: statusColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingLeft: 24, paddingRight: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ ...text.callout1, color: primaryColor, textDecoration: isPast ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {booking.service.name}
              </div>
              <div style={{ ...text.body2, color: secondaryColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatRub(price)}
              </div>
            </div>
            <div style={{ width: 68, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
              <div style={{ ...text.callout1, color: primaryColor }}>{booking.time}</div>
              <div style={{ ...text.body2, color: secondaryColor }}>{endTime}</div>
            </div>
          </button>
        )
      })}
    </section>
  )
}

// ─── Helper-стиль для floating toolbar-кнопок ─────────────────────────────────

// Иконка-кнопка внутри пилюли действий тулбара (без своего фона, padding 6 вокруг icon 24).
const toolbarIconBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6,
  background: 'none', border: 'none', cursor: 'pointer',
} as const

// ─── ServicesList ─────────────────────────────────────────────────────────────

/**
 * Карточки категорий по макету (как в клиентском MasterCardPage):
 * - rx=20, fill=surfaceTransparent, padding 16/16/16/20, gap=8 между карточками
 * - аватар категории 44×44 слева
 * - title (callout1) + опц. бейдж «% скидки», description (caption2, до 2 строк), chevron справа
 * - клик по категории → onCategoryClick(cat). Раскрытия нет — редактор живёт в /services.
 */
function ServicesList({
  categories,
  onCategoryClick,
}: {
  categories: Category[]
  onCategoryClick: (cat: Category) => void
}) {
  return (
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
            <CategoryAvatar photo={cat.photo} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                {hasDiscount && (
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
              {/* Подзаголовок — у синтетической категории «Услуги без категории» его нет (макет 8905:49213). */}
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

            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ label, action }: { label: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ color: 'var(--color-on-surface-secondary)', ...text.body }}>{label}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 16, background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)', border: 'none', borderRadius: 'var(--radius)',
            padding: '10px 20px', ...text.bodyMedium, cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

// Аватар категории «Услуги без категории» (макет 8905:49213): 44 circle с фиолетовым
// градиентом (те же токены, что у GradientAvatarButton) + белая папка 20px по центру.
function ScheduleAddIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M8 16H24M16 8V24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProfileShareIcon() {
  // vuesax-style share/upload, 24×24, stroke=onSurfaceSoften (контраст с background-pill).
  const c = 'var(--color-on-surface-soften)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M9.32031 6.49994L11.8803 3.93994L14.4403 6.49994"
        stroke={c} strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M11.8799 14.18V4.01001"
        stroke={c} strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M4 12C4 16.42 7 20 12 20C17 20 20 16.42 20 12"
        stroke={c} strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsCogIcon() {
  // vuesax/linear/setting-2, 24×24, stroke=onSurfaceSoften.
  const c = 'var(--color-on-surface-soften)'
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={c} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M2 12.88v-1.76c0-1.04.85-1.9 1.9-1.9 1.81 0 2.55-1.28 1.64-2.85-.52-.9-.21-2.07.7-2.59l1.73-.99c.79-.47 1.81-.19 2.28.6l.11.19c.9 1.57 2.38 1.57 3.29 0l.11-.19c.47-.79 1.49-1.07 2.28-.6l1.73.99c.91.52 1.22 1.69.7 2.59-.91 1.57-.17 2.85 1.64 2.85 1.04 0 1.9.85 1.9 1.9v1.76c0 1.04-.85 1.9-1.9 1.9-1.81 0-2.55 1.28-1.64 2.85.52.91.21 2.07-.7 2.59l-1.73.99c-.79.47-1.81.19-2.28-.6l-.11-.19c-.9-1.57-2.38-1.57-3.29 0l-.11.19c-.47.79-1.49 1.07-2.28.6l-1.73-.99a1.899 1.899 0 0 1-.7-2.59c.91-1.57.17-2.85-1.64-2.85-1.05 0-1.9-.86-1.9-1.9Z"
        stroke={c} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
