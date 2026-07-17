import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { HeroHeader } from '@/components/onboardingShared'

// «Переход в подписку» (макет 10256-54945): плитка оставшихся дней триала
// (варианты 10256-55033…55098), выбор периода (месяц 499 ₽ / год 4 790 ₽ со
// скидкой 20%), список преимуществ и «Подключить» → hosted-форма T-Bank.
// Показывается после привязки карты на велкоме; доступна по роуту /subscription.

type Period = 'MONTH' | 'YEAR'

// Градиент цифры (макет: radial 62ADFF → 84A2FB → A697F8 → EB80F0) — линейная
// аппроксимация для background-clip: text.
const DIGIT_GRADIENT = 'linear-gradient(180deg, #62ADFF 0%, #84A2FB 25%, #A697F8 50%, #EB80F0 100%)'
// «Пробный период закончился» (макет 10256-55751): серый градиент «0» (EDF6FF → D3D7DC → B9B9B9).
const DIGIT_GRADIENT_EXPIRED = 'linear-gradient(180deg, #EDF6FF 0%, #D3D7DC 50%, #B9B9B9 100%)'

// Документы для шага «Согласия» (макет 10261-55965). TODO: подставить реальные URL.
const OFFER_URL = ''
const PRIVACY_URL = ''

function openDoc(url: string) {
  if (!url) return
  if (window.WebApp?.openLink) window.WebApp.openLink(url)
  else window.open(url, '_blank')
}

function daysLeft(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

export default function SubscriptionPlanPage() {
  const navigate = useNavigate()
  const [sub, setSub] = useState<SubscriptionState | null>(null)
  const [period, setPeriod] = useState<Period>('YEAR')
  // Шаг «Согласия» (макет 10261-55965) — между выбором периода и оплатой.
  const [step, setStep] = useState<'plan' | 'consents'>('plan')
  const [offerAccepted, setOfferAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  // «Подключить» без согласий: подсветить невыбранные чекбоксы ошибкой (макет 10261-56252).
  const [consentError, setConsentError] = useState(false)
  // paymentURL префетчим по выбранному периоду: openLink требует синхронного
  // user-gesture (await его рвёт), поэтому по тапу открываем уже готовый URL.
  const [payUrls, setPayUrls] = useState<Partial<Record<Period, string>>>({})

  useEffect(() => {
    subscriptionApi.getMe().then(setSub).catch(() => {})
  }, [])

  useEffect(() => {
    if (payUrls[period]) return
    subscriptionApi.pay(period)
      .then((r) => setPayUrls((prev) => ({ ...prev, [period]: r.paymentURL })))
      .catch(() => {})
  }, [period, payUrls])

  const trialDays = sub?.status === 'TRIALING' ? daysLeft(sub.trialEndsAt) : 0

  const handleConnect = () => {
    const url = payUrls[period]
    if (!url) return
    // Флаг «оплата открыта» → при возврате: ACTIVE → «Подписка оформлена!»,
    // новая ошибка списания → «Оплата не прошла». preErr — чтобы не спутать со старой.
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', sub?.lastChargeError ?? '')
    if (window.WebApp?.openLink) window.WebApp.openLink(url)
    else window.open(url, '_blank')
    navigate('/', { replace: true })
  }

  // ── Шаг «Согласия» (макеты 10261-55965 / 10261-56252) ──
  if (step === 'consents') {
    // «Подключить» всегда активна: без согласий подсвечиваем невыбранные чекбоксы ошибкой.
    const handleConsentConnect = () => {
      if (!offerAccepted || !privacyAccepted) { setConsentError(true); return }
      handleConnect()
    }
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <HeroHeader title="Подписка" onBack={() => setStep('plan')} />

        <div style={{ flex: 1, padding: '40px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ ...text.h4, color: 'var(--color-on-surface)', textAlign: 'center' }}>Необходимые согласия</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            <ConsentCard
              title="Оферта"
              label={'Я принимаю условия\nПубличной оферты'}
              checked={offerAccepted}
              error={consentError && !offerAccepted}
              onToggle={() => setOfferAccepted((v) => !v)}
              onRead={() => openDoc(OFFER_URL)}
            />
            <ConsentCard
              title="Персональные данные"
              label="Я даю согласие на обработку персональных данных"
              checked={privacyAccepted}
              error={consentError && !privacyAccepted}
              onToggle={() => setPrivacyAccepted((v) => !v)}
              onRead={() => openDoc(PRIVACY_URL)}
            />
          </div>
        </div>

        <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={handleConsentConnect}
            style={{
              width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
              cursor: 'pointer',
              background: 'var(--color-primary-surface)',
              color: 'var(--color-on-primary-surface)',
            }}
          >
            Подключить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Подписка" onBack={() => navigate('/', { replace: true })} />

      <div style={{ flex: 1, padding: '40px 16px 24px', display: 'flex', flexDirection: 'column', gap: 60 }}>
        {/* Плитка дней триала (макеты 10256-55033…55098) */}
        {sub && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <DaysTile value={trialDays} expired={trialDays <= 0} />
            <span style={{ ...text.body1, color: 'var(--color-on-surface)', width: 167, whiteSpace: 'pre-wrap' }}>
              {trialDays > 0 ? 'дней пробного\nпериода осталось' : 'пробный период закончился'}
            </span>
          </div>
        )}

        {/* Выбор периода */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ ...text.h4, color: 'var(--color-on-surface)', textAlign: 'center' }}>Выберите период подписки</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {/* Ежемесячно */}
            <PlanCard selected={period === 'MONTH'} onSelect={() => setPeriod('MONTH')} title="Ежемесячно">
              <div style={{ ...text.h2, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>499 ₽ / месяц</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Зарплата ассистента намного дороже :)</div>
            </PlanCard>
            {/* Ежегодно */}
            <PlanCard selected={period === 'YEAR'} onSelect={() => setPeriod('YEAR')} title="Ежегодно">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...text.h2, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>4 790 ₽ / год</span>
                <span style={{ ...text.label2Caps, flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '8px', borderRadius: 8, background: 'var(--color-success-surface-lite)', color: 'var(--color-on-success-surface-lite)' }}>
                  Скидка 20%
                </span>
              </div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
                <span style={{ textDecoration: 'line-through' }}>5 988 ₽ </span>
                <span>  Экономия 1198 ₽</span>
              </div>
            </PlanCard>
          </div>
        </div>

        {/* Преимущества */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <span style={{ ...text.h4, color: 'var(--color-on-surface)', textAlign: 'center' }}>Всё в одной подписке!</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {['Кабинет для управления бизнесом', 'Личный AI-ассистент', 'Помощник для твоих клиентов'].map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <CheckCircle28 />
                <span style={{ ...text.body1, color: 'var(--color-on-surface)', flex: 1, minWidth: 0 }}>{label}</span>
              </div>
            ))}
          </div>
          <span style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)', textAlign: 'center', width: '100%' }}>
            Управляй бизнесом грамотно!
          </span>
        </div>
      </div>

      {/* Подключить */}
      <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={() => setStep('consents')}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            cursor: 'pointer',
            background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)',
          }}
        >
          {/* «Далее» — вариант закончившегося триала (макет 10256-55751); дальше — шаг согласий. */}
          {sub && trialDays <= 0 ? 'Далее' : 'Подключить'}
        </button>
      </div>
    </div>
  )
}

// Плитка-«перекидной календарь» 71×73 (surface, скруг. 16, Card Soft) с боковыми
// выемками и градиентной цифрой 64/68 ExtraBold. expired → серый градиент «0».
function DaysTile({ value, expired }: { value: number; expired?: boolean }) {
  return (
    <div style={{ position: 'relative', width: 71, height: 73, flexShrink: 0, filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.1))' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', borderRadius: 16 }} />
      {/* Боковые выемки перекидного календаря */}
      <span style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <span style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 9, height: 9, borderRadius: '50%', background: 'var(--color-background)' }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, lineHeight: '68px', fontWeight: 800,
        backgroundImage: expired ? DIGIT_GRADIENT_EXPIRED : DIGIT_GRADIENT,
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
      }}>
        {value}
      </div>
    </div>
  )
}

// Карточка периода: surface rx20, тень; выбранная — рамка selected-surface + радио с галкой.
function PlanCard({ selected, onSelect, title, children }: {
  selected: boolean
  onSelect: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'var(--color-surface)', borderRadius: 20,
        border: selected ? '1px solid var(--color-selected-surface)' : '1px solid transparent',
        boxShadow: '0px 1px 1px rgba(0,0,0,0.1)',
        padding: '12px 12px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <Radio44 checked={selected} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </button>
  )
}

// Радио 44: выключено — кольцо; включено — синий круг с белой галкой;
// error (обязательное согласие не отмечено, макет 10261-56252) — красная подсветка.
function Radio44({ checked, error }: { checked: boolean; error?: boolean }) {
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

// Карточка согласия (макет 10261-55965): заголовок по центру + чекбокс с текстом +
// центрированная ссылка «Прочитать». surface-transparent rounded-20 Card Soft.
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

// Галка-пункт 28: синий круг + белая галка (список преимуществ).
function CheckCircle28() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="13" fill="var(--color-primary-surface)" />
      <path d="M8.5 14.3L12.2 18L19.5 10.5" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
