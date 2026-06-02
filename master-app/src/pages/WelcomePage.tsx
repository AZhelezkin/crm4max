import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'

import illustrationAi from '@/assets/welcome-slider/illustration-ai.png'
import illustrationCatalog from '@/assets/welcome-slider/illustration-catalog.png'
import illustrationCalendar from '@/assets/welcome-slider/illustration-calendar.png'
import illustrationBell from '@/assets/welcome-slider/illustration-bell.png'
import illustrationAnalytics from '@/assets/welcome-slider/illustration-analytics.png'
import illustrationCheck from '@/assets/welcome-slider/illustration-check.png'
import ellipseGlow from '@/assets/welcome-slider/ellipse-glow.png'

// ─── Данные ───────────────────────────────────────────────────────────────────

const SLIDES = [
  { illustration: illustrationAi,        title: 'AI-ассистент',                       subtitle: 'Поможет в управлении бизнесом' },
  { illustration: illustrationCatalog,   title: 'Каталог услуг и цены',               subtitle: 'Расскажите клиентам о ваших услугах' },
  { illustration: illustrationCalendar,  title: 'Календарь записей и график работы',  subtitle: 'Больше вы ни о чём не забудете' },
  { illustration: illustrationBell,      title: 'Уведомления',                        subtitle: 'Пришлём за 1 час до записи' },
  { illustration: illustrationAnalytics, title: 'Аналитика дохода',                   subtitle: 'Планируйте свой заработок' },
] as const

const FEATURES = [
  { Icon: BubbleIcon,       title: 'AI-ассистент',         subtitle: 'Поможет в управлении бизнесом' },
  { Icon: NoteIcon,         title: 'Каталог услуг и цены', subtitle: 'Расскажите клиентам о ваших услугах' },
  { Icon: CalendarIcon,     title: 'Календарь записей',    subtitle: 'Больше вы ни о чём не забудете' },
  { Icon: NotificationIcon, title: 'Уведомления',          subtitle: 'Пришлём за 1 час до записи' },
  { Icon: TrendUpIcon,      title: 'Аналитика дохода',     subtitle: 'Планируйте свой заработок' },
] as const

// Слайды (0..4) + paywall (5) = 6 точек прогресса; success (6) — без точек.
const TOTAL_DOTS = 6

// ─── Локальные типографические переопределения ────────────────────────────────
// Figma «H3» 22/26/700 ls -0.66 — экранный заголовок (нет в общих токенах).
const slideTitleStyle: CSSProperties = { fontSize: 22, lineHeight: '26px', fontWeight: 700, letterSpacing: -0.66 }
// Figma «Caption 1» 15/20/400 ls -0.15 — подзаголовок.
const slideSubtitleStyle: CSSProperties = { ...text.body, letterSpacing: -0.15 }
// Figma «H1» 32/40/800 ls -1.28 — цена на paywall.
const priceStyle: CSSProperties = { fontSize: 32, lineHeight: '40px', fontWeight: 800, letterSpacing: -1.28 }

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const navigate = useNavigate()
  // 0..4 — слайды с иллюстрациями, 5 — paywall, 6 — success после «оплаты».
  const [step, setStep] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const goNext = () => setStep((s) => Math.min(s + 1, 6))
  const goPrev = () => setStep((s) => Math.max(s - 1, 0))
  const handleStartProfile = () => navigate('/onboarding', { replace: true })

  // Горизонтальный swipe для слайдов 0..4 (на paywall/success — без свайпа).
  const handleTouchStart = (e: React.TouchEvent) => {
    if (step >= 5) return
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext()
      else goPrev()
    }
    touchStartX.current = null
  }

  // ── Шаг 6: «Подписка оплачена» ──
  if (step === 6) {
    return (
      <Layout>
        <div style={{ flex: 1 }} />
        <CenteredContent>
          <IllustrationCard illustration={illustrationCheck} />
          <TextBlock title="Подписка оплачена" subtitle={'Расскажите другим о своих услугах\nи начните бизнес'} />
        </CenteredContent>
        <div style={{ flex: 1 }} />
        <Footer>
          <PrimaryButton onClick={handleStartProfile}>Заполнить профиль</PrimaryButton>
        </Footer>
      </Layout>
    )
  }

  // ── Шаг 5: paywall ──
  if (step === 5) {
    return (
      <Layout onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <Paywall />
        <Footer>
          <PaginationDots current={step} total={TOTAL_DOTS} />
          <div style={{ height: 40 }} />
          <PrimaryButton onClick={goNext}>Попробовать бесплатно 7 дней</PrimaryButton>
        </Footer>
      </Layout>
    )
  }

  // ── Шаги 0..4: слайды ──
  const slide = SLIDES[step]
  return (
    <Layout onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div style={{ flex: 1 }} />
      <CenteredContent>
        <IllustrationCard illustration={slide.illustration} />
        <TextBlock title={slide.title} subtitle={slide.subtitle} />
      </CenteredContent>
      <div style={{ flex: 1 }} />
      <Footer>
        <PaginationDots current={step} total={TOTAL_DOTS} />
        <div style={{ height: 40 }} />
        <SecondaryButton onClick={goNext}>Дальше</SecondaryButton>
      </Footer>
    </Layout>
  )
}

// ─── Layout-обёртки ───────────────────────────────────────────────────────────

interface LayoutProps {
  children: ReactNode
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchEnd?: (e: React.TouchEvent) => void
}
function Layout({ children, onTouchStart, onTouchEnd }: LayoutProps) {
  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--color-on-surface)',
      }}
    >
      {children}
    </div>
  )
}

function CenteredContent({ children }: { children: ReactNode }) {
  // Figma: 8px gap между иллюстрацией и текстом.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
      {children}
    </div>
  )
}

function Footer({ children }: { children: ReactNode }) {
  // Figma: кнопка top 744, page bottom 844 → ниже кнопки 40px + safe-area.
  return (
    <div style={{ padding: '0 16px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))' }}>
      {children}
    </div>
  )
}

// ─── Карточка с иллюстрацией ──────────────────────────────────────────────────

function IllustrationCard({ illustration }: { illustration: string }) {
  // Figma: контейнер 300×300, эллипс 270.801×171.242 rotate 8° в центре, иллюстрация поверх.
  return (
    <div style={{ position: 'relative', width: 300, height: 300, overflow: 'hidden' }}>
      <img
        src={ellipseGlow}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          width: 270.801,
          height: 171.242,
          left: '50%',
          top: 'calc(50% + 7px)',
          transform: 'translate(-50%, -50%) rotate(8deg)',
        }}
      />
      <img
        src={illustration}
        alt=""
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

// ─── Текст под иллюстрацией ───────────────────────────────────────────────────

function TextBlock({ title, subtitle }: { title: string; subtitle: string }) {
  // Figma: 280×58, gap 12, центрирование.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: 280 }}>
      <div style={{ ...slideTitleStyle, color: 'var(--color-on-surface)', textAlign: 'center', width: '100%' }}>
        {title}
      </div>
      <div style={{ ...slideSubtitleStyle, color: 'var(--color-on-surface-secondary)', textAlign: 'center', width: '100%', whiteSpace: 'pre-line' }}>
        {subtitle}
      </div>
    </div>
  )
}

// ─── Точки-индикатор ──────────────────────────────────────────────────────────

function PaginationDots({ current, total }: { current: number; total: number }) {
  // Figma: 72×8 — 6 точек, активная крупнее. Активный цвет — onSurface, неактивный — onSurfaceMuted.
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', height: 8 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current
        const size = active ? 8 : 6
        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-muted)',
              transition: 'width 0.2s, height 0.2s, background 0.2s',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Кнопки ───────────────────────────────────────────────────────────────────

interface BtnProps { children: ReactNode; onClick: () => void }

const buttonBaseStyle: CSSProperties = {
  width: '100%',
  height: 60,
  borderRadius: 20,
  border: 'none',
  padding: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  ...text.callout1,
}

function PrimaryButton({ children, onClick }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...buttonBaseStyle,
        background: 'var(--color-primary-surface)',
        color: 'var(--color-on-primary-surface)',
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: BtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...buttonBaseStyle,
        background: 'var(--color-secondary-surface)',
        color: 'var(--color-interactive-element-accented)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Paywall (шаг 5) ──────────────────────────────────────────────────────────

function Paywall() {
  // Figma: блок отступ слева/справа 24, top 72, gap 48 между header'ом и списком.
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 48,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingLeft: 24,
        paddingRight: 24,
        width: '100%',
      }}
    >
      <PaywallHeader />
      <FeatureList />
    </div>
  )
}

function PaywallHeader() {
  // Figma: sloto-mark 116×24, gap 16, описание, цена 32/40/800.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 298 }}>
      <div
        aria-label="sloto"
        style={{ width: 116, height: 24, color: 'var(--color-on-surface)' }}
      >
        <SlotoMark />
      </div>
      <div
        style={{
          ...slideSubtitleStyle,
          color: 'var(--color-on-surface-secondary)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        Получите доступ к платформе, расскажите о своих услугах и увеличьте клиентскую базу
      </div>
      <div
        style={{
          ...priceStyle,
          color: 'var(--color-on-surface)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        499 RUB/мес.
      </div>
    </div>
  )
}

function FeatureList() {
  // Figma: gap 20 между строками; в строке gap 12 (иконка 24×24 — текст).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {FEATURES.map(({ Icon, title, subtitle }) => (
        <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, flexShrink: 0, color: 'var(--color-on-surface)' }}>
            <Icon />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</div>
            <div style={{ ...slideSubtitleStyle, color: 'var(--color-on-surface-secondary)' }}>{subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Иконки (vuesax/linear, viewBox 24×24, stroke: currentColor) ──────────────

function BubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.59 12.26C18.4232 12.26 20.72 9.96323 20.72 7.13C20.72 4.29678 18.4232 2 15.59 2C12.7568 2 10.46 4.29678 10.46 7.13C10.46 9.96323 12.7568 12.26 15.59 12.26Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M6.35999 19.44C8.06102 19.44 9.44 18.061 9.44 16.36C9.44 14.659 8.06102 13.28 6.35999 13.28C4.65895 13.28 3.28 14.659 3.28 16.36C3.28 18.061 4.65895 19.44 6.35999 19.44Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
      <path d="M16.62 22C18.0338 22 19.18 20.8539 19.18 19.44C19.18 18.0262 18.0338 16.88 16.62 16.88C15.2061 16.88 14.06 18.0262 14.06 19.44C14.06 20.8539 15.2061 22 16.62 22Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.66 10.44L20.68 14.62C19.84 18.23 18.18 19.69 15.06 19.39C14.56 19.35 14.02 19.26 13.44 19.12L11.76 18.72C7.59 17.73 6.3 15.67 7.28 11.49L8.26 7.3C8.46 6.45 8.7 5.71 9 5.1C10.17 2.68 12.16 2.03 15.5 2.82L17.17 3.21C21.36 4.19 22.64 6.26 21.66 10.44Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.06 19.39C14.44 19.81 13.66 20.16 12.71 20.47L11.13 20.99C7.16 22.27 5.07 21.2 3.78 17.23L2.5 13.28C1.22 9.31 2.28 7.21 6.25 5.93L7.83 5.41C8.24 5.28 8.63 5.17 9 5.1C8.7 5.71 8.46 6.45 8.26 7.3L7.28 11.49C6.3 15.67 7.59 17.73 11.76 18.72L13.44 19.12C14.02 19.26 14.56 19.35 15.06 19.39Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.64 8.53L17.49 9.76" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.66 12.4L14.56 13.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6947 13.7H15.7037" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6947 16.7H15.7037" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9955 13.7H12.0045" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9955 16.7H12.0045" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.29431 13.7H8.30329" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.29431 16.7H8.30329" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NotificationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.02 2.91C8.71 2.91 6.02 5.6 6.02 8.91V11.8C6.02 12.41 5.76 13.34 5.45 13.86L4.3 15.77C3.59 16.95 4.08 18.26 5.38 18.7C9.69 20.14 14.34 20.14 18.65 18.7C19.86 18.3 20.39 16.87 19.73 15.77L18.58 13.86C18.28 13.34 18.02 12.41 18.02 11.8V8.91C18.02 5.61 15.32 2.91 12.02 2.91Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" />
      <path d="M13.87 3.2C13.56 3.11 13.24 3.04 12.91 3C11.95 2.88 11.03 2.95 10.17 3.2C10.46 2.46 11.18 1.94 12.02 1.94C12.86 1.94 13.58 2.46 13.87 3.2Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.02 19.06C15.02 20.71 13.67 22.06 12.02 22.06C11.2 22.06 10.44 21.72 9.9 21.18C9.36 20.64 9.02 19.88 9.02 19.06" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
    </svg>
  )
}

function TrendUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.5 9.5L12.3 13.7L10.7 11.3L7.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 9.5H16.5V11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Логотип sloto (Figma «Group 62», 116×24, fill: currentColor + бренд-точка) ──

function SlotoMark() {
  return (
    <svg width="116" height="24" viewBox="0 0 116 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="111.577" cy="7.93651" rx="4.4231" ry="4.39427" fill="#FF667F" />
      <path
        d="M54.2803 6.67871C55.9033 6.67871 57.3749 7.0746 58.6943 7.86523C60.0134 8.64537 61.0499 9.69572 61.8037 11.0166C62.5576 12.3378 62.9346 13.7794 62.9346 15.3398C62.9345 16.9313 62.5524 18.3879 61.7881 19.709C61.0237 21.03 59.9814 22.0759 58.6621 22.8457C57.3429 23.6153 55.8822 24 54.2803 24C52.6259 24 51.1335 23.6155 49.8037 22.8457C48.4739 22.0759 47.4368 21.0302 46.6934 19.709C45.9604 18.3879 45.5948 16.9313 45.5947 15.3398C45.5947 13.6753 45.9604 12.1868 46.6934 10.876C47.4368 9.56532 48.4688 8.54132 49.7881 7.80273C51.1075 7.05372 52.6049 6.67872 54.2803 6.67871ZM104.042 6.68066C103.974 7.08924 103.937 7.50864 103.937 7.93652C103.937 8.58324 104.018 9.21118 104.171 9.81055C104.059 9.80359 103.947 9.79981 103.833 9.7998C102.87 9.7998 101.985 10.0548 101.179 10.5645C100.372 11.0638 99.7381 11.7397 99.2773 12.5928C98.8166 13.4458 98.5869 14.362 98.5869 15.3398C98.587 16.3175 98.8167 17.233 99.2773 18.0859C99.7381 18.939 100.378 19.6149 101.194 20.1143C102.011 20.6135 102.901 20.8633 103.864 20.8633C104.828 20.8633 105.712 20.6136 106.519 20.1143C107.325 19.615 107.953 18.9441 108.403 18.1016C108.854 17.259 109.079 16.3384 109.079 15.3398C109.079 15.2621 109.074 15.1844 109.071 15.1074C109.856 15.378 110.699 15.5263 111.576 15.5264C111.895 15.5264 112.208 15.5044 112.517 15.4668C112.497 17.0089 112.116 18.4231 111.372 19.709C110.608 21.0301 109.565 22.0759 108.246 22.8457C106.927 23.6153 105.466 24 103.864 24C102.21 24 100.718 23.6155 99.3877 22.8457C98.0579 22.0759 97.0208 21.0302 96.2773 19.709C95.5444 18.3879 95.1788 16.9313 95.1787 15.3398C95.1787 13.6753 95.5443 12.1868 96.2773 10.876C97.0208 9.56532 98.0528 8.54131 99.3721 7.80273C100.691 7.05371 102.189 6.67871 103.864 6.67871C103.924 6.67871 103.983 6.6796 104.042 6.68066ZM5.82715 6.89746C7.40823 6.89746 8.73789 7.20464 9.81641 7.81836V7.11621H12.6445V12.5615H9.81641V11.5635C8.87402 10.2215 7.58658 9.54985 5.95312 9.5498C5.0945 9.5498 4.39314 9.73782 3.84863 10.1123C3.30412 10.4868 3.03125 10.9705 3.03125 11.5635C3.03136 12.0937 3.23545 12.5099 3.64355 12.8115C4.06237 13.1132 4.99463 13.3786 6.43945 13.6074L8.62305 14.0283C11.8796 14.6213 13.5078 16.2081 13.5078 18.7881C13.5078 20.2964 12.9165 21.5084 11.7334 22.4238C10.5607 23.3393 9.00027 23.7968 7.05273 23.7969C6.27785 23.7969 5.51273 23.6882 4.75879 23.4697C4.01546 23.2409 3.3922 22.9598 2.88965 22.627V23.5166H0V17.8984H2.88965V18.46C3.04672 19.2506 3.48744 19.8857 4.20996 20.3643C4.94283 20.8426 5.79077 21.082 6.75391 21.082C7.81121 21.082 8.64368 20.9 9.25098 20.5361C9.85826 20.1617 10.1621 19.61 10.1621 18.8818C10.1621 18.3513 9.92113 17.9554 9.43945 17.6953C8.9576 17.4249 7.98918 17.1489 6.53418 16.8682L4.85352 16.5098C3.18857 16.1769 1.96824 15.6044 1.19336 14.793C0.418682 13.9816 0.03125 12.9461 0.03125 11.6875C0.0313222 10.6682 0.314502 9.79975 0.879883 9.08203C1.45572 8.35395 2.18825 7.80746 3.07812 7.44336C3.96814 7.07927 4.88478 6.89748 5.82715 6.89746ZM80.2812 7.11621H83.2979V10.0029H80.2812V18.6006C80.2812 19.4953 80.376 20.0782 80.5645 20.3486C80.7634 20.6086 81.0984 20.7382 81.5693 20.7383C82.1453 20.7383 82.7219 20.64 83.2979 20.4424V23.3604C82.2928 23.6516 81.481 23.7968 80.8633 23.7969C79.5022 23.7969 78.5227 23.4592 77.9258 22.7832C77.3289 22.0966 77.0303 20.9256 77.0303 19.2715V10.0029H74.8789V7.11621H77.0303V4.63477L80.2812 1.68555V7.11621ZM31.1689 20.6445H33.6816V23.5166H24.9961V20.6445H27.918V2.83984H24.9961V0H31.1689V20.6445ZM54.249 9.7998C53.2857 9.7998 52.401 10.0548 51.5947 10.5645C50.7885 11.0637 50.1551 11.7399 49.6943 12.5928C49.2336 13.4458 49.0029 14.362 49.0029 15.3398C49.003 16.3176 49.2337 17.233 49.6943 18.0859C50.1551 18.9388 50.7937 19.615 51.6104 20.1143C52.4271 20.6136 53.317 20.8633 54.2803 20.8633C55.2436 20.8633 56.1283 20.6136 56.9346 20.1143C57.7408 19.615 58.3691 18.9441 58.8193 18.1016C59.2695 17.259 59.495 16.3384 59.4951 15.3398C59.4951 14.362 59.2696 13.4511 58.8193 12.6084C58.3691 11.7659 57.7408 11.0898 56.9346 10.5801C56.1283 10.06 55.2332 9.79983 54.249 9.7998ZM22.7139 15.5264H17.8887V13.1299H22.7139V15.5264ZM40.4053 15.5264H35.5801V13.1299H40.4053V15.5264ZM71.7695 15.5264H66.9443V13.1299H71.7695V15.5264Z"
        fill="currentColor"
      />
    </svg>
  )
}
