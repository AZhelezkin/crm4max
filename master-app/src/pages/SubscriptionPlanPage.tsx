import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { HeroHeader } from '@/components/onboardingShared'
import { Radio44 } from '@/components/ConsentsStep'
import { openPaymentForm } from '@/lib/paymentForm'
import logoTileSvg from '@/assets/sub-logo-tile.svg'

// «Переход в подписку» (макет 10256-54945): плитка оставшихся дней триала
// (варианты 10256-55033…55098), выбор периода (месяц 499 ₽ / год 4 790 ₽ со
// скидкой 20%), список преимуществ и «Подключить» → hosted-форма T-Bank.
// Открывается из «Другое» → «Подписка» и по плашке триала на главной; согласия
// даны на онбординге, поэтому «Подключить» сразу открывает оплату.

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

/** «28.07.2027» — дата следующего списания (макет 10352-43925). */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function SubscriptionPlanPage() {
  const navigate = useNavigate()
  const [sub, setSub] = useState<SubscriptionState | null>(null)
  const [period, setPeriod] = useState<Period>('YEAR')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const paymentInFlight = useRef(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  // «Отменить подписку» (макеты 10352-43925 / диалог 10352-44386).
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    subscriptionApi.getMe()
      .then(setSub)
      .catch(() => setPaymentError('Не удалось загрузить подписку. Нажмите ещё раз.'))
      .finally(() => setSubscriptionLoading(false))
  }, [])

  const handleCancelSubscription = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      await subscriptionApi.cancel()
      setSub(await subscriptionApi.getMe())
      setConfirmCancel(false)
    } catch { /* остаёмся в диалоге — можно повторить */ } finally {
      setCancelling(false)
    }
  }

  const trialDays = sub?.status === 'TRIALING' ? daysLeft(sub.trialEndsAt) : 0
  // Оплаченная подписка: ни плитки триала, ни выбора периода, ни «Подключить» —
  // иначе экран выглядел как «пробный период закончился» и предлагал платить снова.
  const isActive = sub?.status === 'ACTIVE'

  const handleConnect = async () => {
    if (paymentInFlight.current || subscriptionLoading || !sub) return
    paymentInFlight.current = true
    setPaymentLoading(true)
    setPaymentError(null)
    try {
      // Init с Recurrent=Y одновременно проводит платёж и сохраняет введённую
      // карту. location.assign не требует предварительного user-gesture URL.
      const result = await subscriptionApi.pay(period)
      openPaymentForm(result.paymentURL)
    } catch (error) {
      const code = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPaymentError(code === 'SUBSCRIPTION_CONTACT_REQUIRED'
        ? 'Для оплаты укажите номер телефона в разделе «Обо мне».'
        : 'Не удалось подготовить оплату. Нажмите ещё раз.')
    } finally {
      paymentInFlight.current = false
      setPaymentLoading(false)
    }
  }

  // ── Оплаченная подписка (макет 10352-43925): зелёный hero + плитка-лого,
  //    «Подписка оформлена 🎉», карточка оплаченного плана, «Отменить подписку».
  if (isActive && sub) {
    // Автопродление живо, пока привязана карта; после отмены — «активна до…».
    const autoRenew = sub.autoRenewEnabled
    const isYear = sub.plannedPeriod === 'YEAR'
    return (
      <div style={{ minHeight: '100dvh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Зелёный hero (Ellipse16 #29C643 + плёнка), зона 390px — как на success. */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 390, pointerEvents: 'none',
          background: [
            'radial-gradient(circle 184px at 50% -34px, var(--color-hero-circle-2) 0%, var(--color-hero-circle-2) 50%, transparent 100%) center top / 100% 390px no-repeat',
            'radial-gradient(circle 287px at 50% -72px, #29C643 0%, #29C643 50%, transparent 100%) center top / 100% 390px no-repeat',
            'linear-gradient(var(--color-background-blur), var(--color-background-blur)) center top / 100% 390px no-repeat',
            'linear-gradient(180deg, var(--color-surface) 0px, var(--color-background) 390px)',
          ].join(', '),
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <HeroHeader title="Подписка" onBack={() => navigate('/', { replace: true })} />
        </div>

        {/* Плитка + заголовок (Figma top 196 → 32 от тулбара; gap 36, текст gap 2). */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 36 }}>
          <img src={logoTileSvg} alt="" style={{ width: 75, height: 77, display: 'block' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center', padding: '0 16px' }}>
            <span style={{ ...text.h4, color: 'var(--color-on-surface)' }}>
              {autoRenew ? 'Подписка оформлена 🎉' : 'Подписка отменена'}
            </span>
            <span style={{ ...text.caption1, color: 'var(--color-interactive-element-secondary)' }}>
              {sub.currentPeriodEnd
                ? autoRenew
                  ? `Следующий платёж спишется ${formatDate(sub.currentPeriodEnd)}`
                  : `Подписка активна до ${formatDate(sub.currentPeriodEnd)}`
                : 'Поздравляем 🎉'}
            </span>
          </div>
        </div>

        {/* Карточка оплаченного плана (Figma top 383 → 41 от блока выше). */}
        <div style={{ position: 'relative', zIndex: 1, padding: '41px 16px 0' }}>
          <PlanCard selected onSelect={() => {}} title={isYear ? 'Ежегодно' : 'Ежемесячно'}>
            {isYear ? (
              <>
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
              </>
            ) : (
              <>
                <div style={{ ...text.h2, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>499 ₽ / месяц</div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Зарплата ассистента намного дороже :)</div>
              </>
            )}
          </PlanCard>
        </div>

        {/* Преимущества (Figma top 579 → 52 от карточки; gap 20). */}
        <div style={{ position: 'relative', zIndex: 1, padding: '52px 16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
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

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* «Отменить подписку» — текстовая кнопка (Callout 2, h36); скрыта после отмены. */}
        {autoRenew && (
          <div style={{ position: 'relative', zIndex: 1, padding: '8px 12px calc(48px + env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              style={{
                width: '100%', height: 36, borderRadius: 12, border: 'none', padding: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none',
                ...text.callout2, color: 'var(--color-interactive-element-accented)',
              }}
            >
              Отменить подписку
            </button>
          </div>
        )}

        {/* Диалог «Отмена подписки» (макет 10352-44386): primary — «Закрыть»,
            подтверждение отмены — вторичная кнопка (инверсия обычного ConfirmDialog). */}
        {confirmCancel && (
          <CancelSubscriptionDialog
            busy={cancelling}
            onClose={() => setConfirmCancel(false)}
            onConfirm={() => { void handleCancelSubscription() }}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Подписка" onBack={() => navigate('/', { replace: true })} />

      <div style={{ flex: 1, padding: '40px 16px 24px', display: 'flex', flexDirection: 'column', gap: 60 }}>
        {/* Плитка дней триала (макеты 10256-55033…55098) */}
        {sub && !isActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <DaysTile value={trialDays} expired={trialDays <= 0} />
            <span style={{ ...text.body1, color: 'var(--color-on-surface)', width: 167, whiteSpace: 'pre-wrap' }}>
              {trialDays > 0 ? 'дней пробного\nпериода осталось' : 'пробный период закончился'}
            </span>
          </div>
        )}

        {/* Выбор периода — только пока не оплачено. */}
        {!isActive && (
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
        )}

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

      {/* Подключить — скрыта при оплаченной подписке (иначе повторное списание). */}
      {!isActive && (
      <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          disabled={subscriptionLoading || paymentLoading}
          onClick={() => { void handleConnect() }}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout1,
            cursor: subscriptionLoading || paymentLoading ? 'default' : 'pointer',
            background: subscriptionLoading || paymentLoading ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
            color: subscriptionLoading || paymentLoading ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
          }}
        >
          {/* Согласия даны на онбординге — сразу оплата выбранного тарифа.
              «Далее» — вариант закончившегося триала (макет 10256-55751). */}
          {subscriptionLoading || paymentLoading ? 'Подготавливаем...' : sub && trialDays <= 0 ? 'Далее' : 'Подключить'}
        </button>
        {paymentError && <div role="alert" style={{ paddingTop: 8, ...text.caption2, color: 'var(--color-error-surface-accented)', textAlign: 'center' }}>{paymentError}</div>}
      </div>
      )}
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

// Диалог «Отмена подписки» (макет 10352-44386). NB: инверсия обычного
// ConfirmDialog — primary-кнопка «Закрыть» (отказ), подтверждение отмены —
// вторичная. Клик по подложке = закрыть (не отмена!), поэтому общий
// ConfirmDialog с переставленными колбэками не подходит.
function CancelSubscriptionDialog({ busy, onClose, onConfirm }: {
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 329, boxSizing: 'border-box',
          background: 'var(--color-surface)', borderRadius: 24, padding: '20px 16px 24px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0 8px 8px', ...text.h4, color: 'var(--color-on-surface)' }}>Отмена подписки</div>
        <div style={{ padding: '0 8px 8px', ...text.body2, color: 'var(--color-on-surface)' }}>
          Новые списания производиться не будут. Доступ к сервису сохранится до конца оплаченного периода
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
              background: 'var(--color-primary-surface)', ...text.callout1, color: 'var(--color-on-primary-surface)',
            }}
          >
            Закрыть
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              width: '100%', height: 44, borderRadius: 22, border: 'none', cursor: busy ? 'default' : 'pointer',
              background: 'var(--color-background)', ...text.callout1, color: 'var(--color-on-surface)',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Отменить подписку
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
