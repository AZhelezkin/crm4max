import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'

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
    <div style={{ minHeight: '100dvh', background: '#0F0F11', color: '#D3D4D6', paddingBottom: 95 }}>
      {/* Header */}
      <header
        style={{
          height: 56,
          position: 'sticky',
          top: 0,
          background: '#0F0F11',
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
            color: '#D3D4D6',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M9 1L1 8L9 15" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#D3D4D6', margin: 0 }}>{titleDate}</h1>
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
            <path d="M5.32 2.56L8 0l2.56 2.56" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10.18V0.01" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 8c0 4.42 3 8 8 8s8-3.58 8-8" stroke="#D3D4D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      {/* Cards */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {dayPayments.map((p) => (
          <DayCard key={p.id} payment={p} />
        ))}
        {dayPayments.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>
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
  const badgeColor = isUnpaid ? '#CE4259' : '#42CE59'
  const amountColor = isUnpaid ? '#CE4259' : '#D3D4D6'

  const serviceName = payment.booking?.service.name ?? '—'
  const clientName = payment.booking?.client.name ?? ''
  const clientPhoto = payment.booking?.client.photo ?? null
  const time = payment.booking?.time ?? ''

  return (
    <div
      style={{
        background: '#25262B',
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
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1,
            color: '#D3D4D6',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {serviceName}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1, color: '#7D7D7F' }}>{time}</div>
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
              background: '#3A3B42',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#7D7D7F',
            }}
          >
            {clientName ? clientName[0].toUpperCase() : ''}
          </div>
        )}
        <span style={{ fontSize: 13, lineHeight: 1, color: '#7D7D7F' }}>{clientName}</span>
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
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, color: amountColor }}>
          {formatRub(payment.amount)}
        </div>
        <div
          style={{
            background: badgeBg,
            color: badgeColor,
            fontSize: 11,
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