import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'
import { text } from '@/styles/typography'

dayjs.locale('ru')

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

const STATUS_LABEL: Record<Payment['status'], string> = {
  PAID: 'ОПЛАЧЕНО',
  DEPOSIT_PAID: 'ОПЛАЧЕНО',
  UNPAID: 'НЕ ОПЛАЧЕНО',
}

export default function PaymentsDayPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    paymentsApi.list().then(setPayments).catch(() => {})
  }, [])

  const dayPayments = useMemo(() => {
    if (!date) return []
    return payments
      .filter((p) => dayjs(p.createdAt).format('YYYY-MM-DD') === date)
      .sort((a, b) => {
        const ta = a.booking?.time ?? ''
        const tb = b.booking?.time ?? ''
        return ta.localeCompare(tb)
      })
  }, [payments, date])

  const titleDate = date ? dayjs(date).format('D MMMM YYYY') : ''

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-background)', color: 'var(--color-on-surface)', paddingBottom: 95 }}>
      {/* Header */}
      <header
        style={{
          height: 56,
          position: 'sticky',
          top: 0,
          background: 'var(--color-background)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          style={{
            position: 'absolute',
            left: 14,
            top: 16,
            width: 24,
            height: 24,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--color-on-surface)',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M9 1L1 8L9 15" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ ...text.subheadline, color: 'var(--color-on-surface)', margin: 0 }}>{titleDate}</h1>
        <button
          aria-label="Экспорт"
          style={{
            position: 'absolute',
            right: 14,
            top: 18,
            width: 20,
            height: 20,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
            <path d="M5.32 2.56L8 0l2.56 2.56" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10.18V0.01" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 8c0 4.42 3 8 8 8s8-3.58 8-8" stroke="var(--color-on-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* Cards */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {dayPayments.map((p) => (
          <DayCard key={p.id} payment={p} />
        ))}
        {dayPayments.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
            Нет оплат за этот день
          </div>
        )}
      </div>
    </div>
  )
}

function DayCard({ payment }: { payment: Payment }) {
  const isUnpaid = payment.status === 'UNPAID'
  const badgeBg = isUnpaid ? 'rgba(206, 66, 89, 0.3)' : 'rgba(66, 206, 89, 0.3)'
  const badgeColor = isUnpaid ? 'var(--color-error-surface-accented)' : 'var(--color-success-surface-accented)'
  const amountColor = isUnpaid ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)'

  const serviceName = payment.booking?.service.name ?? '—'
  const clientName = payment.booking?.client.name ?? ''
  const clientPhoto = payment.booking?.client.photo ?? null
  const time = payment.booking?.time ?? ''

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 20,
        padding: '18px 20px 13px',
        height: 115,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Row 1: service name + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div
          style={{
            ...text.action,
            fontWeight: 600,
            lineHeight: 1,
            color: 'var(--color-on-surface)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {serviceName}
        </div>
        <div style={{ ...text.footnote, lineHeight: 1, color: 'var(--color-on-surface-secondary)' }}>{time}</div>
      </div>

      {/* Row 2: avatar + client name */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 13, gap: 8 }}>
        {clientPhoto ? (
          <img
            src={clientPhoto}
            alt=""
            style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: 'var(--color-divider-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...text.captionSmall,
              color: 'var(--color-on-surface-secondary)',
            }}
          >
            {clientName ? clientName[0].toUpperCase() : ''}
          </div>
        )}
        <span style={{ ...text.footnote, lineHeight: 1, color: 'var(--color-on-surface-secondary)' }}>{clientName}</span>
      </div>

      {/* Row 3: amount + badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}
      >
        <div style={{ ...text.subheadline, lineHeight: 1, color: amountColor }}>
          {formatRub(payment.amount)}
        </div>
        <div
          style={{
            background: badgeBg,
            color: badgeColor,
            ...text.captionSmall,
            fontWeight: 600,
            letterSpacing: 0.5,
            padding: '5px 12px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          {STATUS_LABEL[payment.status]}
        </div>
      </div>
    </div>
  )
}