import { useState } from 'react'
import { text } from '@/styles/typography'
import { HeroHeader } from '@/components/onboardingShared'
import { OFFER_URL, PERSONAL_DATA_URL, openLegalDocument } from '@/lib/legalDocuments'

// Шаг «Необходимые согласия» (макеты 10261-55965 / 10261-56252 с ошибкой).
// Используется на онбординге (Welcome → согласия → кабинет). Кнопка всегда
// активна: без обоих согласий подсвечиваем невыбранные чекбоксы ошибкой.

export default function ConsentsStep({ onBack, onConfirm, confirmLabel = 'Подключить', busy = false }: {
  onBack: () => void
  /** Вызывается только когда оба согласия отмечены. */
  onConfirm: () => void
  confirmLabel?: string
  busy?: boolean
}) {
  const [offerAccepted, setOfferAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [consentError, setConsentError] = useState(false)

  const handleConfirm = () => {
    if (!offerAccepted || !privacyAccepted) { setConsentError(true); return }
    onConfirm()
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Подписка" onBack={onBack} />

      <div style={{ flex: 1, padding: '40px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ ...text.h4, color: 'var(--color-on-surface)', textAlign: 'center' }}>Необходимые согласия</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <ConsentCard
            title="Оферта"
            label={'Я принимаю условия\nПубличной оферты'}
            checked={offerAccepted}
            error={consentError && !offerAccepted}
            onToggle={() => setOfferAccepted((v) => !v)}
            onRead={() => openLegalDocument(OFFER_URL)}
          />
          <ConsentCard
            title="Персональные данные"
            label="Я даю согласие на обработку персональных данных"
            checked={privacyAccepted}
            error={consentError && !privacyAccepted}
            onToggle={() => setPrivacyAccepted((v) => !v)}
            onRead={() => openLegalDocument(PERSONAL_DATA_URL)}
          />
        </div>
      </div>

      <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            cursor: busy ? 'default' : 'pointer',
            background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

// Карточка согласия: заголовок-секция, строка чекбокс+текст, строка «Прочитать».
function ConsentCard({ title, label, checked, error, onToggle, onRead }: {
  title: string
  label: string
  checked: boolean
  /** Подсветка обязательности (макет 10261-56252): тап «Подключить» без согласия. */
  error?: boolean
  onToggle: () => void
  onRead: () => void
}) {
  return (
    <div style={{ width: '100%', background: 'var(--color-surface-transparent)', borderRadius: 20, boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: '1px solid var(--color-secondary-surface-muted)',
        }}
      >
        <Radio44 checked={checked} error={error} />
        <span style={{ ...text.body2, color: 'var(--color-on-surface)', flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' }}>{label}</span>
      </button>
      <button
        type="button"
        onClick={onRead}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ ...text.body2, color: 'var(--color-primary-surface)' }}>Прочитать</span>
      </button>
    </div>
  )
}

// Радио 44: выключено — кольцо; включено — синий круг с белой галкой; error —
// красная подсветка. Экспортируется: тем же радио выбираются планы подписки.
export function Radio44({ checked, error }: { checked: boolean; error?: boolean }) {
  if (checked) {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="22" cy="22" r="16" fill="var(--color-primary-surface)" />
        <path d="M15.5 22.3L20 26.8L28.5 17.9" stroke="var(--color-on-primary-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (error) {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="22" cy="22" r="15.25" fill="var(--color-error-surface-lite)" stroke="var(--color-error-element-muted)" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r="15.25" stroke="var(--color-interactive-element)" strokeWidth="1.5" />
    </svg>
  )
}
