import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { text } from '@/styles/typography'
import { HeroHeader } from '@/components/onboardingShared'
import ConfirmDialog from '@/components/ConfirmDialog'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { useCardBindingReconciliation } from '@/hooks/useCardBindingReconciliation'

/**
 * «Способы оплаты» (макет 10352-44457) — открывается из «Другое». Карта, с
 * которой списывается подписка; карандаш → диалог «Изменить карту»
 * (макет 10352-44653) → hosted-форма перепривязки T-Bank (AddCard, 0 ₽ + 3DS).
 *
 * URL перепривязки префетчится при входе: openLink требует синхронного
 * user-gesture, await в обработчике его рвёт. После возврата из формы карта
 * сверяется по lifecycle-событиям и ограниченному polling через subscription/me.
 */
export default function PaymentMethodsPage() {
  const navigate = useNavigate()
  const [sub, setSub] = useState<SubscriptionState | null>(null)
  const [confirmChange, setConfirmChange] = useState(false)
  const [rebindUrl, setRebindUrl] = useState<string | null>(null)
  const [rebindLoading, setRebindLoading] = useState(true)
  const [rebindError, setRebindError] = useState<string | null>(null)
  const [subLoaded, setSubLoaded] = useState(false)
  const subLoadedRef = useRef(false)
  const subRequestRef = useRef<Promise<void> | null>(null)
  const { begin: beginReconciliation, isPending: reconciliationPending } = useCardBindingReconciliation((state) => {
    subLoadedRef.current = true
    setSubLoaded(true)
    setSub(state)
  })
  const rebindRequestRef = useRef<Promise<void> | null>(null)
  const rebindGenerationRef = useRef(0)

  const prepareRebind = () => {
    if (rebindRequestRef.current) return rebindRequestRef.current
    const generation = ++rebindGenerationRef.current
    setRebindLoading(true)
    setRebindError(null)
    const request = subscriptionApi.rebindCard()
      .then((r) => {
        if (rebindGenerationRef.current === generation) setRebindUrl(r.paymentURL)
      })
      .catch(() => {
        if (rebindGenerationRef.current === generation) {
          setRebindError('Не удалось подготовить привязку карты. Нажмите ещё раз.')
        }
      })
      .finally(() => {
        if (rebindGenerationRef.current !== generation) return
        rebindRequestRef.current = null
        setRebindLoading(false)
      })
    rebindRequestRef.current = request
    return request
  }

  useEffect(() => {
    if (reconciliationPending || subLoadedRef.current || subRequestRef.current) return
    const request = subscriptionApi.getMe()
      .then((state) => {
        subLoadedRef.current = true
        setSubLoaded(true)
        setSub(state)
      })
      .catch(() => {})
      .finally(() => { subRequestRef.current = null })
    subRequestRef.current = request
  }, [reconciliationPending])

  useEffect(() => {
    void prepareRebind()
    return () => {
      rebindGenerationRef.current += 1
      rebindRequestRef.current = null
    }
  }, [])

  const openRebind = () => {
    setConfirmChange(false)
    if (!subLoaded) return
    if (!rebindUrl) {
      prepareRebind()
      return
    }
    beginReconciliation(sub)
    if (window.WebApp?.openLink) window.WebApp.openLink(rebindUrl)
    else window.open(rebindUrl, '_blank')
    // Форма одноразовая. Следующую попытку готовим только по новому клику:
    // немедленный prefetch создал бы более новый RequestKey и сделал только что
    // открытую форму устаревшей на backend.
    setRebindUrl(null)
  }

  const handleEdit = () => {
    if (!rebindUrl) {
      void prepareRebind()
      return
    }
    if (last4) setConfirmChange(true)
    else openRebind()
  }

  // Маскированный PAN от T-Bank (напр. «430000******0777») → «** 0777» как в макете.
  const last4 = sub?.cardPan ? sub.cardPan.replace(/\D/g, '').slice(-4) : null

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <HeroHeader title="Способы оплаты" onBack={() => navigate(-1)} />

      {/* Контент: Figma top 176 (тулбар 164 + 12); label + карточка, gap 10. */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Списание за подписку
        </span>

        {/* Карточка (surface-transparent rx20, px20 py16, gap12): иконка + карта + карандаш */}
        <div style={{
          width: '100%', boxSizing: 'border-box', background: 'var(--color-surface-transparent)',
          borderRadius: 20, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ padding: 10, borderRadius: 12, flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}>
            <CardIcon />
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Банковская карта
            </span>
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {last4 ? `** ${last4}` : 'Не привязана'}
            </span>
          </div>
          <button
            type="button"
            aria-label="Изменить карту"
            // Без карты подтверждать нечего — сразу открываем форму привязки.
            disabled={rebindLoading || !subLoaded}
            onClick={handleEdit}
            style={{ width: 24, height: 24, padding: 4, boxSizing: 'content-box', background: 'none', border: 'none', cursor: rebindLoading || !subLoaded ? 'default' : 'pointer', display: 'inline-flex', flexShrink: 0, color: 'var(--color-primary-surface)', opacity: rebindLoading || !subLoaded ? 0.6 : 1 }}
          >
            <Edit2Icon />
          </button>
        </div>
        {rebindError && <span role="alert" style={{ ...text.caption2, color: 'var(--color-error-surface-accented)' }}>{rebindError}</span>}
      </div>

      {/* Диалог «Изменить карту» (макет 10352-44653) → перепривязка. */}
      {confirmChange && (
        <ConfirmDialog
          title="Изменить карту"
          message="Вы действительно хотите привязать новую карту для оплаты подписки?"
          confirmLabel="Изменить карту"
          danger={false}
          onConfirm={openRebind}
          onCancel={() => setConfirmChange(false)}
        />
      )}
    </div>
  )
}

// vuesax/linear/card (24×24, stroke: currentColor).
function CardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2 8.505h20" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 16.505h2" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 16.505h4" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.44 3.505h11.11c3.56 0 4.45.88 4.45 4.39v8.21c0 3.51-.89 4.39-4.44 4.39H6.44c-3.55 0-4.44-.88-4.44-4.39v-8.21c0-3.51.89-4.39 4.44-4.39Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/edit-2 (24×24, stroke: currentColor).
function Edit2Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M13.26 3.6 5.05 12.29c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.89 5.05a6.126 6.126 0 0 0 5.45 5.15" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
