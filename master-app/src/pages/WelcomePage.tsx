import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { mastersApi } from '@/api/masters.api'
import { useAuthStore } from '@/store/auth.store'
import ConsentsStep from '@/components/ConsentsStep'

// ─── Ассеты слайдера (Figma 10084-40089): глоу-подложки (SVG) + мокапы (PNG 2x) ──
import profilePhoneLeft from '@/assets/welcome-v2/profile-phone-left.png'
import profilePhoneRight from '@/assets/welcome-v2/profile-phone-right.png'
import calendGlow from '@/assets/welcome-v2/calend-glow.svg'
import calendCard from '@/assets/welcome-v2/calend-card.png'
import moneyGlow from '@/assets/welcome-v2/money-glow.svg'
import moneyCards from '@/assets/welcome-v2/money-cards.png'
import notifyShot from '@/assets/welcome-v2/notify-shot.png'
import agentGlow from '@/assets/welcome-v2/agent-glow.svg'
import agentArt from '@/assets/welcome-v2/agent-art.png'
import trialShield from '@/assets/welcome-v2/trial-shield.png'
import illustrationCheck from '@/assets/welcome-slider/illustration-check.png'

// ─── Типографика (Figma) ───────────────────────────────────────────────────────
// «H4» 20/24/700 ls -0.4 — заголовок слайда.
const slideTitleStyle: CSSProperties = { fontSize: 20, lineHeight: '24px', fontWeight: 700, letterSpacing: -0.4 }
// «Caption 1» 15/20/400 ls -0.15 — подзаголовки, описания.
const captionStyle: CSSProperties = { ...text.body, letterSpacing: -0.15 }
// «H1» 32/40/800 ls -1.28 — цена.
const priceStyle: CSSProperties = { fontSize: 32, lineHeight: '40px', fontWeight: 800, letterSpacing: -1.28 }

// ─── Слайды (Figma 10084-40089) ────────────────────────────────────────────────
// Каждый слой-картинка воспроизводит структуру Figma: контейнер (left/top/w/h,
// при offsetX — центрирование translateX) → поворот (rot/flipY) → бокс (iw/ih) →
// img с отрицательным inset (bleed тени/свечения за границы бокса).

interface Layer {
  src: string
  top: number
  w: number
  h: number
  left?: number
  offsetX?: number      // задан → центрирование по X со смещением
  rot?: number
  flipY?: boolean
  /** Глоу-подложка: доп. CSS-blur — SVG-экспорт режет гаусс по рамке файла,
      и у прямоугольника видна грань (особенно на повёрнутых слоях). */
  soften?: boolean
  iw: number
  ih: number
  inset: [number, number, number, number] // top right bottom left, в % (отрицательные = bleed)
}

interface SlideDef {
  key: string
  title: string
  subtitle: string
  layers: Layer[]        // порядок: глоу (сзади) → мокапы (спереди)
}

const SLIDES: SlideDef[] = [
  {
    key: 'profile',
    title: 'Личная страница',
    subtitle: 'Клиенты смогут записываться самостоятельно',
    layers: [
      { src: calendGlow, soften: true, offsetX: 0.04, top: 56.5, w: 357.082, h: 175.826, iw: 357.082, ih: 175.826, inset: [-15.92, -7.84, -15.92, -7.84] },
      { src: profilePhoneLeft, left: 36.84, top: -0.5, w: 176.425, h: 246.168, rot: -16.04, iw: 119.825, ih: 221.687, inset: [-1.16, -3.95, -2.94, -3.7] },
      { src: profilePhoneRight, left: 147, top: -4, w: 155.486, h: 253.477, rot: 5.09, iw: 134.5, ih: 242.5, inset: [-6.43, -14.63, -9.82, -14.33] },
    ],
  },
  {
    key: 'calend',
    title: 'Календарь записей',
    subtitle: 'Все записи в одном месте',
    layers: [
      { src: calendGlow, soften: true, offsetX: 0.04, top: 56.5, w: 357.082, h: 175.826, iw: 357.082, ih: 175.826, inset: [-15.92, -7.84, -15.92, -7.84] },
      { src: calendCard, offsetX: -7.77, top: 0, w: 238, h: 236, iw: 238, ih: 236, inset: [-4.24, -12.61, -12.71, -4.2] },
    ],
  },
  {
    key: 'money',
    title: 'Доходы',
    subtitle: 'Покажем, сколько вы заработали',
    layers: [
      { src: moneyGlow, soften: true, offsetX: -3, top: 82.78, w: 347.863, h: 115.938, rot: 180, flipY: true, iw: 347.863, ih: 115.938, inset: [-24.15, -8.05, -24.15, -8.05] },
      { src: moneyCards, left: 44, top: 18, w: 270, h: 210, iw: 270, ih: 210, inset: [-7.14, -3.7, -11.9, -11.11] },
    ],
  },
  {
    key: 'notify',
    title: 'Уведомления',
    subtitle: 'ИИ-ассистент отправит уведомления о записях и изменениях прямо в Max',
    layers: [
      { src: calendGlow, soften: true, offsetX: 0.04, top: 56.5, w: 357.082, h: 175.826, iw: 357.082, ih: 175.826, inset: [-15.92, -7.84, -15.92, -7.84] },
      { src: notifyShot, left: 27, top: 49, w: 307, h: 162, iw: 307, ih: 162, inset: [-6.17, -6.51, -18.52, -6.51] },
    ],
  },
  {
    key: 'agent',
    title: 'ИИ-ассистент',
    subtitle: 'Записывает клиентов и помогает управлять расписанием',
    layers: [
      { src: agentGlow, soften: true, offsetX: 0.7, top: 9.89, w: 374.078, h: 207.008, rot: 167.62, flipY: true, iw: 353.496, ih: 134.335, inset: [-20.84, -7.92, -20.84, -7.92] },
      { src: agentArt, left: 42, top: 0, w: 279, h: 240, iw: 279, ih: 240, inset: [-6.67, -10.75, -10, -3.58] },
    ],
  },
]

// Ширина слайда/слайдера (Figma Component1 = 357). Внутренние left/top слоёв —
// в этой системе координат.
const SLIDE_W = 357
const SLIDE_H = 381

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const navigate = useNavigate()
  const setMaster = useAuthStore((s) => s.setMaster)
  const [finishing, setFinishing] = useState(false)
  // Шаг согласий (макет 10261-55965) — между стартовым экраном и кабинетом.
  const [step, setStep] = useState<'start' | 'consents'>('start')

  // Согласия приняты → завершаем онбординг и ведём в кабинет. Карта на онбординге
  // не привязывается: триал стартует на бэке автоматически (getOrCreate подписки),
  // оплата — позже через «Другое» → «Подписка» или плашку триала на главной.
  const finishToCabinet = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      await mastersApi.updateProfile({ isOnboarded: true })
      const master = await mastersApi.getMe()
      setMaster(master)
      navigate('/', { replace: true })
    } catch {
      setFinishing(false)
    }
  }

  if (step === 'consents') {
    return (
      <ConsentsStep
        onBack={() => setStep('start')}
        onConfirm={() => { void finishToCabinet() }}
        busy={finishing}
      />
    )
  }

  // ── Экран активации ──
  return (
    <div
      style={{
        minHeight: '100dvh',
        color: 'var(--color-on-surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // sloto: Figma top 162 → под Max-тулбаром 38px (162 - 124).
        paddingTop: 38,
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
        overflowX: 'hidden',
      }}
    >
      {/* sloto-лого 116×24 */}
      <div style={{ width: 116, height: 24, color: 'var(--color-on-surface)' }}>
        <SlotoMark />
      </div>

      {/* Подзаголовок (Figma top 202 → gap 16 от лого; w 298) */}
      <div style={{ ...captionStyle, color: 'var(--color-on-surface-secondary)', textAlign: 'center', width: 298, marginTop: 16 }}>
        Ваш кабинет уже готов. Осталось активировать его
      </div>

      {/* Слайдер (Figma Component1, top 266 → gap 24) */}
      <div style={{ marginTop: 24 }}>
        <Slider />
      </div>

      {/* Цена 499 ₽/мес. (Figma top 664 → gap 17 от слайдера) */}
      <div style={{ ...priceStyle, color: 'var(--color-on-surface)', textAlign: 'center', marginTop: 17 }}>
        499 ₽/мес.
      </div>

      {/* Кнопка (Figma top 728 → gap 24) */}
      <div style={{ width: '100%', maxWidth: 393, padding: '0 16px', marginTop: 24, boxSizing: 'border-box' }}>
        {/* → шаг «Необходимые согласия» (10261-55965), после него — кабинет. */}
        <PrimaryButton onClick={() => setStep('consents')}>Попробовать бесплатно 7 дней</PrimaryButton>
      </div>

      {/* Блок «Никаких списаний» (Figma top 825 → gap 37; shield 153×107, gap 12) */}
      <div style={{ width: '100%', maxWidth: 393, padding: '0 16px', marginTop: 37, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <img src={trialShield} alt="" style={{ width: 153, height: 107, display: 'block', objectFit: 'contain' }} />
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)', textAlign: 'center' }}>
          Никаких списаний<br />во время пробного периода
        </div>
        <div style={{ ...captionStyle, color: 'var(--color-on-surface-secondary)', textAlign: 'center' }}>
          Оплата начнётся только после окончания 7 дней, если ты решишь продолжить пользоваться сервисом
        </div>
      </div>
    </div>
  )
}

// ─── Слайдер: авто-прокрутка + свайп по 5 слайдам, общие точки ─────────────────

// Экспортируется: тот же слайдер-карусель фич используется на «О платформе».
export function Slider() {
  const [index, setIndex] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)

  // Авто-прокрутка каждые 3.5с (зациклено). paused — на время касания.
  const paused = useRef(false)
  useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % SLIDES.length)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    paused.current = true
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    paused.current = false
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    // Горизонтальный жест (не вертикальный скролл) с порогом.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      setIndex((i) => (i + (dx < 0 ? 1 : SLIDES.length - 1)) % SLIDES.length)
    }
  }

  return (
    <div
      style={{ position: 'relative', width: SLIDE_W, height: SLIDE_H }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Вьюпорт шире слайда на page-padding: glow не режется, соседние слайды
          остаются скрыты, потому что каждый шаг трека равен ширине viewport. */}
      <div data-testid="feature-slider-viewport" style={{ position: 'absolute', top: 0, bottom: 0, left: -16, right: -16, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translate3d(-${index * 100}%, 0, 0)`,
            transition: 'transform 0.4s ease',
            willChange: 'transform',
          }}
        >
          {SLIDES.map((slide) => (
            <div key={slide.key} style={{ flex: '0 0 100%', position: 'relative', height: '100%' }}>
              <div style={{ position: 'absolute', left: 16, width: SLIDE_W, height: '100%' }}>
                {slide.layers.map((l, i) => <LayerImg key={i} {...l} />)}
                {/* Текст: Figma top 260, w 325, gap 2, центр */}
                <div style={{ position: 'absolute', top: 260, left: '50%', transform: 'translateX(-50%)', width: 325, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
                  <div style={{ ...slideTitleStyle, color: 'var(--color-on-surface)', width: '100%' }}>{slide.title}</div>
                  <div style={{ ...captionStyle, color: 'var(--color-on-surface-secondary)', width: '100%' }}>{slide.subtitle}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Общие точки (Figma top 349) */}
      <div style={{ position: 'absolute', top: 349, left: '50%', transform: 'translateX(-50%)' }}>
        <PaginationDots current={index} total={SLIDES.length} />
      </div>
    </div>
  )
}

// Слой-картинка: контейнер → поворот → бокс → img с bleed-inset (см. Figma).
function LayerImg({ src, top, w, h, left, offsetX, rot = 0, flipY, soften, iw, ih, inset }: Layer) {
  const [it, ir, ib, il] = inset
  const centered = offsetX !== undefined
  const transform = `${flipY ? 'scaleY(-1) ' : ''}${rot ? `rotate(${rot}deg)` : ''}`.trim()
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(centered ? { left: '50%', transform: `translateX(calc(-50% + ${offsetX}px))` } : { left }),
      }}
    >
      <div style={{ transform: transform || undefined, flexShrink: 0 }}>
        <div style={{ position: 'relative', width: iw, height: ih }}>
          <div style={{ position: 'absolute', top: `${it}%`, right: `${ir}%`, bottom: `${ib}%`, left: `${il}%` }}>
            <img src={src} alt="" style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none', ...(soften ? { filter: 'blur(14px)' } : {}) }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Точки-индикатор (Figma 72×8, активная крупнее) ───────────────────────────

function PaginationDots({ current, total }: { current: number; total: number }) {
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

// ─── Текст под иллюстрацией (success) ─────────────────────────────────────────

function TextBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: 280 }}>
      <div style={{ fontSize: 22, lineHeight: '26px', fontWeight: 700, letterSpacing: -0.66, color: 'var(--color-on-surface)', textAlign: 'center', width: '100%' }}>
        {title}
      </div>
      <div style={{ ...captionStyle, color: 'var(--color-on-surface-secondary)', textAlign: 'center', width: '100%', whiteSpace: 'pre-line' }}>
        {subtitle}
      </div>
    </div>
  )
}

// ─── Плоский layout (success) — без глобального hero-градиента ─────────────────

function FlatLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('no-hero-bg')
    return () => { document.body.classList.remove('no-hero-bg') }
  }, [])
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', color: 'var(--color-on-surface)' }}>
      {children}
    </div>
  )
}

// ─── Кнопка ───────────────────────────────────────────────────────────────────

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
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
        background: 'var(--color-primary-surface)',
        color: 'var(--color-on-primary-surface)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Логотип sloto (Figma «Group 62», 116×24) ─────────────────────────────────

export function SlotoMark() {
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
