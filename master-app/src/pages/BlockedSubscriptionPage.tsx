import { useEffect, useState } from 'react'
import { text } from '@/styles/typography'
import { subscriptionApi } from '@/api/subscription.api'

// Экран заблокированного кабинета (подписка не оплачена после grace). «Оформить
// подписку» → оплата 499 ₽ (без триала). payUrl префетчим — openLink требует
// синхронного user-gesture. После оплаты вебхук переведёт подписку в ACTIVE.
export default function BlockedSubscriptionPage() {
  const [payUrl, setPayUrl] = useState<string | null>(null)
  useEffect(() => {
    subscriptionApi.pay().then((r) => setPayUrl(r.paymentURL)).catch(() => {})
  }, [])

  const handlePay = () => {
    if (!payUrl) return
    if (window.WebApp?.openLink) window.WebApp.openLink(payUrl)
    else window.open(payUrl, '_blank')
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      padding: '0 24px', textAlign: 'center',
    }}>
      <div style={{ ...text.title, color: 'var(--color-on-surface)' }}>
        Доступ приостановлен
      </div>
      <div style={{ ...text.body, color: 'var(--color-on-surface-secondary)', maxWidth: 320 }}>
        Подписка не оплачена. Оформите подписку, чтобы вернуться в личный кабинет.
      </div>
      <button
        type="button"
        onClick={handlePay}
        style={{
          width: '100%', maxWidth: 360, height: 60, borderRadius: 20, border: 'none',
          cursor: 'pointer', marginTop: 8,
          background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
          ...text.callout1,
        }}
      >
        Оформить подписку
      </button>
    </div>
  )
}
