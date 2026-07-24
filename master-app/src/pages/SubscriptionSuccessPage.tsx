import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuthStore } from '@/store/auth.store'
import { colors } from '@/styles/tokens'
import { text } from '@/styles/typography'
import wordmarkSvg from '@/assets/sub-wordmark.svg'
import logoTileSvg from '@/assets/sub-logo-tile.svg'
import confettiGif from '@/assets/sub-confetti.gif'

// «Успех оплаты» (макет 10256-55423): зелёный hero с конфетти + плитка-лого,
// «Подписка оформлена! / Поздравляем 🎉», карточка с QR клиентской ссылки и
// кнопками «Поделиться» / «Перейти в профиль». Показывается после того, как
// оплата подписки перевела мастера в ACTIVE (детект в App.tsx).

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
      {/* Hero-фон (макет: Ellipse16 зелёная + Ellipse17 + blur-плёнка, зона 390px).
          Тот же приём, что глобальный --gradient-hero-background в index.css
          (radial-круги с soft-falloff + плёнка background-blur) — element-blur
          через filter в WebView давал кислотное пятно вместо мягкого залива. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 390, overflow: 'hidden', pointerEvents: 'none',
        background: [
          'radial-gradient(circle 184px at 50% -34px, var(--color-hero-circle-2) 0%, var(--color-hero-circle-2) 50%, transparent 100%) center top / 100% 390px no-repeat',
          'radial-gradient(circle 287px at 50% -72px, #29C643 0%, #29C643 50%, transparent 100%) center top / 100% 390px no-repeat',
          'linear-gradient(var(--color-background-blur), var(--color-background-blur)) center top / 100% 390px no-repeat',
          'linear-gradient(180deg, var(--color-surface) 0px, var(--color-background) 390px)',
        ].join(', '),
      }}>
        <img src={confettiGif} alt="" style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, display: 'block' }} />
      </div>

      {/* Hero-контент */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 38 }}>
        {/* SVG-ассеты экспортированы с width/height=100% и preserveAspectRatio=none —
            без ОБОИХ явных размеров WebView растягивает их на весь контейнер. */}
        <img src={wordmarkSvg} alt="sloto" style={{ width: 121, height: 24, display: 'block' }} />
        <div style={{ height: 66 }} />
        {/* 75×77 = плитка 71×73 + тень из viewBox. */}
        <img src={logoTileSvg} alt="" style={{ width: 75, height: 77, display: 'block' }} />
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
              <QRCodeCanvas ref={canvasRef} value={deepLink} size={165} bgColor={colors.black00} fgColor={colors.black100} level="M" style={{ width: 165, height: 165 }} />
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
