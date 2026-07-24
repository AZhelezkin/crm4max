import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { HeroHeader } from '@/components/onboardingShared'
import { Radio44 } from '@/components/ConsentsStep'

// «Переход в подписку» (макет 10256-54945): плитка оставшихся дней триала
// (варианты 10256-55033…55098), выбор периода (месяц 499 ₽ / год 4 790 ₽ со
// скидкой 20%), список преимуществ и «Подключить» → hosted-форма T-Bank.
// Открывается из «Другое» → «Подписка» и по плашке триала на главной; согласия
// даны на онбординге, поэтому «Подключить» сразу открывает привязку/оплату.

type Period = 'MONTH' | 'YEAR'

// Градиент цифры (макет: radial 62ADFF → 84A2FB → A697F8 → EB80F0) — линейная
// аппроксимация для background-clip: text.
const DIGIT_GRADIENT = 'linear-gradient(180deg, #62ADFF 0%, #84A2FB 25%, #A697F8 50%, #EB80F0 100%)'
// «Пробный период закончился» (макет 10256-55751): серый градиент «0» (EDF6FF → D3D7DC → B9B9B9).
const DIGIT_GRADIENT_EXPIRED = 'linear-gradient(180deg, #EDF6FF 0%, #D3D7DC 50%, #B9B9B9 100%)'

function daysLeft(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}

export default function SubscriptionPlanPage() {
  const navigate = useNavigate()
  const [sub, setSub] = useState<SubscriptionState | null>(null)
  const [period, setPeriod] = useState<Period>('YEAR')
  // paymentURL префетчим по выбранному периоду: openLink требует синхронного
  // user-gesture (await его рвёт), поэтому по тапу открываем уже готовый URL.
  const [payUrls, setPayUrls] = useState<Partial<Record<Period, string>>>({})

  useEffect(() => {
    subscriptionApi.getMe().then(setSub).catch(() => {})
  }, [])

  const trialDays = sub?.status === 'TRIALING' ? daysLeft(sub.trialEndsAt) : 0
  // Онбординг-триал (дни ещё есть): «Подключить» = привязка карты БЕЗ списания
  // (startTrial), период сохраняется и спишется после триала. Иначе (истёкший
  // триал / grace / blocked) — обычная оплата сразу (pay).
  const isTrial = sub?.status === 'TRIALING' && trialDays > 0

  useEffect(() => {
    // Ждём загрузки sub — иначе не знаем, триал это или оплата (кэшировали бы не тот URL).
    if (!sub || payUrls[period]) return
    const req = isTrial ? subscriptionApi.startTrial(period) : subscriptionApi.pay(period)
    req.then((r) => setPayUrls((prev) => ({ ...prev, [period]: r.paymentURL }))).catch(() => {})
  }, [period, payUrls, sub, isTrial])

  const handleConnect = () => {
    const url = payUrls[period]
    if (!url) return
    // В триале — только привязка карты, списания нет, поэтому флаги результата
    // оплаты не ставим (иначе в кабинете покажется «Подписка оформлена/не прошла»).
    if (!isTrial) {
      // Флаг «оплата открыта» → при возврате: ACTIVE → «Подписка оформлена!»,
      // новая ошибка списания → «Оплата не прошла». preErr — чтобы не спутать со старой.
      localStorage.setItem('sub:payPending', '1')
      localStorage.setItem('sub:preErr', sub?.lastChargeError ?? '')
    }
    if (window.WebApp?.openLink) window.WebApp.openLink(url)
    else window.open(url, '_blank')
    // Независимо от исхода привязки/оплаты — в кабинет.
    navigate('/', { replace: true })
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
          onClick={handleConnect}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            cursor: 'pointer',
            background: 'var(--color-primary-surface)',
            color: 'var(--color-on-primary-surface)',
          }}
        >
          {/* Согласия даны на онбординге — сразу привязка карты (триал) или оплата.
              «Далее» — вариант закончившегося триала (макет 10256-55751). */}
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

// Галка-пункт 28: синий круг + белая галка (список преимуществ).
function CheckCircle28() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="13" fill="var(--color-primary-surface)" />
      <path d="M8.5 14.3L12.2 18L19.5 10.5" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
