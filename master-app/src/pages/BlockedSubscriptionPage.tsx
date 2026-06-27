import { useEffect, useState } from 'react'
import { text } from '@/styles/typography'
import { subscriptionApi } from '@/api/subscription.api'

// Человекочитаемая причина неуспешной оплаты. Бэкенд кладёт в lastChargeError
// текст T-Bank (Details/Message, обычно уже по-русски) — показываем как есть.
// Если пришёл голый код/статус — переводим; неизвестный код НЕ показываем
// числом, даём общий понятный текст (чтобы мастер не видел «1051»).
function describeError(raw: string | null): string | null {
  if (!raw) return null
  const v = raw.trim()
  // Уже человекочитаемый русский текст от T-Bank — показываем как есть.
  if (/[а-яА-Я]/.test(v)) return v
  const map: Record<string, string> = {
    REJECTED: 'Платёж отклонён банком',
    AUTH_FAIL: 'Не пройдена 3-D Secure аутентификация',
    DEADLINE_EXPIRED: 'Истекло время оплаты',
    '101': 'Не пройдена 3-D Secure аутентификация',
    '1051': 'Недостаточно средств на карте',
  }
  return map[v] ?? 'Платёж отклонён банком. Попробуйте другую карту или повторите позже'
}

// Экран заблокированного кабинета (подписка не оплачена после grace). «Оформить
// подписку» → оплата 499 ₽ (без триала). payUrl префетчим — openLink требует
// синхронного user-gesture. После оплаты вебхук переведёт подписку в ACTIVE.
export default function BlockedSubscriptionPage() {
  const [payUrl, setPayUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Перезапрашиваем при возврате в приложение (visibilitychange): после неудачной
    // оплаты нужен и свежий payUrl (прошлый order одноразовый), и причина ошибки.
    const load = () => {
      subscriptionApi.pay().then((r) => setPayUrl(r.paymentURL)).catch(() => {})
      subscriptionApi.getMe().then((s) => setError(describeError(s?.lastChargeError ?? null))).catch(() => {})
    }
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
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
      {error && (
        <div style={{
          ...text.body, color: 'var(--color-on-error-surface-lite)',
          background: 'var(--color-error-surface-lite)', borderRadius: 12,
          padding: '10px 14px', maxWidth: 360,
        }}>
          Не удалось оплатить: {error}
        </div>
      )}
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
