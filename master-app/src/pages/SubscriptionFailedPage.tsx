import { text } from '@/styles/typography'
import { HeroHeader } from '@/components/onboardingShared'

// «Неуспех оплаты» (макет 10256-55004): розовый hero, плитка-✕,
// «Оплата не прошла» + подпись, кнопка «Повторить оплату».
// Показывается, когда после hosted-формы подписка не перешла в ACTIVE и
// появилась ошибка списания (детект в App.tsx). Повтор — возврат к экрану «Подписка».

interface Props {
  onRetry: () => void
  onBack: () => void
}

export default function SubscriptionFailedPage({ onRetry, onBack }: Props) {
  return (
    <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Розовый hero-градиент сверху, затухает к фону страницы */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 320, pointerEvents: 'none',
        background: 'linear-gradient(180deg, var(--color-error-surface-lite) 0%, var(--color-background) 70%)',
        opacity: 0.7,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <HeroHeader title="Подписка" onBack={onBack} />
      </div>

      {/* Центр: плитка-✕ + заголовок + подпись */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 72, gap: 36 }}>
        <FailTile />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center', padding: '0 16px' }}>
          <span style={{ ...text.h4, color: 'var(--color-on-surface)' }}>Оплата не прошла</span>
          <span style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)' }}>
            Подписка не оформилась, повтори попытку ещё раз, пожалуйста
          </span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      {/* Повторить оплату */}
      <div style={{ padding: '8px 12px calc(48px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={onRetry}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
          }}
        >
          Повторить оплату
        </button>
      </div>
    </div>
  )
}

// Плитка-лого 71×73 (белая, скруг. 16, боковые выемки) с серым ✕ (неуспех).
function FailTile() {
  return (
    <div style={{ position: 'relative', width: 71, height: 73, filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', borderRadius: 16 }} />
      <span style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <span style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M8 8L22 22M22 8L8 22" stroke="var(--color-interactive-element)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}
