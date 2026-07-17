import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuthStore } from '@/store/auth.store'
import { colors } from '@/styles/tokens'
import { text } from '@/styles/typography'

// «Успех оплаты» (макет 10256-55423): зелёный hero с конфетти + плитка-лого,
// «Подписка оформлена! / Поздравляем 🎉», карточка с QR клиентской ссылки и
// кнопками «Поделиться» / «Перейти в профиль». Показывается после того, как
// оплата подписки перевела мастера в ACTIVE (детект в App.tsx).

// Праздничное конфетти — декоративная иллюстрация (растр в макете); фиксированные
// координаты и цвета, без Math.random.
const CONFETTI: Array<{ x: number; y: number; c: string; r?: number; w?: number; h?: number; rot?: number }> = [
  { x: 12, y: 40, c: '#F0AF2D', w: 6, h: 6, rot: 20 },
  { x: 34, y: 22, c: '#40C4AA', r: 3 },
  { x: 58, y: 46, c: '#EB80F0', w: 5, h: 5, rot: 45 },
  { x: 74, y: 26, c: '#62ADFF', r: 3 },
  { x: 88, y: 52, c: '#F0AF2D', r: 3 },
  { x: 20, y: 74, c: '#62ADFF', w: 5, h: 5, rot: 30 },
  { x: 46, y: 88, c: '#EB80F0', r: 3 },
  { x: 66, y: 78, c: '#40C4AA', w: 6, h: 6, rot: 15 },
  { x: 90, y: 84, c: '#F0AF2D', r: 3 },
  { x: 8, y: 58, c: '#EB80F0', r: 2.5 },
  { x: 82, y: 40, c: '#40C4AA', r: 2.5 },
  { x: 52, y: 30, c: '#62ADFF', w: 4, h: 4, rot: 40 },
]

interface Props {
  onGoProfile: () => void
}

export default function SubscriptionSuccessPage({ onGoProfile }: Props) {
  const { master } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const clientBotName = (import.meta.env.VITE_CLIENT_BOT_NAME as string | undefined) || 'id9706002253_1_bot'
  const masterId = master?.id ?? ''
  const deepLink = `https://max.ru/${clientBotName}?start=${masterId}`
  const hasLink = masterId.length > 0

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: master?.name ?? 'Записаться ко мне',
          text: `Записывайтесь ко мне через Max: ${master?.name ?? ''}`,
          url: deepLink,
        })
      } catch { /* пользователь отменил */ }
    } else {
      try { await navigator.clipboard.writeText(deepLink) } catch { /* ignore */ }
    }
  }

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Зелёный hero-градиент сверху, затухает к фону страницы */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 320, pointerEvents: 'none',
        background: 'linear-gradient(180deg, var(--color-grad-green-vibrance-100) 0%, var(--color-grad-green-vibrance-0) 45%, var(--color-background) 100%)',
        opacity: 0.9,
      }} />
      {/* Конфетти */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300, pointerEvents: 'none' }}>
        {CONFETTI.map((p, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.w ?? (p.r ?? 3) * 2, height: p.h ?? (p.r ?? 3) * 2,
            background: p.c, borderRadius: p.r ? '50%' : 2,
            transform: p.rot ? `rotate(${p.rot}deg)` : undefined,
          }} />
        ))}
      </div>

      {/* Hero-контент */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
        <Wordmark />
        <div style={{ height: 40 }} />
        <LogoTile />
        <div style={{ height: 36 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
          <span style={{ ...text.h4, color: 'var(--color-on-surface)' }}>Подписка оформлена!</span>
          <span style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)' }}>Поздравляем 🎉</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      {/* Карточка: QR + текст + кнопки */}
      <div style={{
        margin: '0 16px', marginBottom: 'calc(48px + env(safe-area-inset-bottom))',
        background: 'var(--color-surface)', borderRadius: 12, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 165, height: 165, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasLink ? (
              <QRCodeCanvas ref={canvasRef} value={deepLink} size={165} bgColor={colors.black00} fgColor={colors.black100} level="M" />
            ) : (
              <span style={{ ...text.footnote, color: 'var(--color-on-surface-muted)', textAlign: 'center' }}>QR-код появится после авторизации</span>
            )}
          </div>
          <p style={{ margin: 0, ...text.callout1, color: 'var(--color-on-surface)', textAlign: 'center' }}>
            Поделись профилем с клиентами.<br />Их встретит твой ИИ-ассистент
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            onClick={handleShare}
            style={{
              height: 60, borderRadius: 20, border: 'none', padding: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)', ...text.callout1,
            }}
          >
            <ExportIcon />
            Поделиться
          </button>
          <button
            type="button"
            onClick={onGoProfile}
            style={{
              height: 60, borderRadius: 20, border: 'none', padding: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-chat-bg-elements)', color: 'var(--color-interactive-element-accented)', ...text.callout1,
            }}
          >
            Перейти в профиль
          </button>
        </div>
      </div>
    </div>
  )
}

// Словесный знак «s·l·o·t·o» (макет: серые буквы с точками-разделителями).
function Wordmark() {
  return (
    <span style={{ ...text.h4, fontWeight: 800, color: 'var(--color-interactive-element-secondary)', letterSpacing: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {['s', 'l', 'o', 't', 'o'].map((ch, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-interactive-element-secondary)', display: 'inline-block' }} />}
          {ch}
        </span>
      ))}
    </span>
  )
}

// Плитка-лого 71×73 (белая, скруг. 16, боковые выемки как у DaysTile) с зелёной ∞.
function LogoTile() {
  return (
    <div style={{ position: 'relative', width: 71, height: 73, filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', borderRadius: 16 }} />
      <span style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <span style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <InfinityIcon />
      </div>
    </div>
  )
}

// Лемниската ∞ (лого Sloto), зелёная.
function InfinityIcon() {
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" fill="none">
      <path
        d="M12 4C7.6 4 4 7.6 4 12s3.6 8 8 8c4.4 0 6.9-3.6 10-8 3.1-4.4 5.6-8 10-8 4.4 0 8 3.6 8 8s-3.6 8-8 8c-4.4 0-6.9-3.6-10-8"
        stroke="var(--color-on-success-surface-lite)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// vuesax/linear/export — стрелка вверх + лоток (кнопка «Поделиться»).
function ExportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-on-primary-surface)' }}>
      <path d="M12 15V3.62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.35 5.85L12 2.5 8.65 5.85" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9.5H7c-3 0-4 1.5-4 5v2c0 3.5 1 5 4 5h10c3 0 4-1.5 4-5v-2c0-3.5-1-5-4-5h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
