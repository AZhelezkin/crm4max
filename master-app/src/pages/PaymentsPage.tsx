import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'

dayjs.locale('ru')

const METHOD_LABELS: Record<string, string> = {
  CARD:    'Карта',
  VK_PAY:  'VK Pay',
}

const STATUS_COLORS: Record<string, string> = {
  PAID:         'var(--color-success)',
  DEPOSIT_PAID: '#FF9500',
  UNPAID:       'var(--color-text-secondary)',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    paymentsApi.list().then(setPayments).catch(() => {})
  }, [])

  const total = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <PageHeader title="Доход" back={false} />

      <div style={{ padding: 16 }}>
        {/* Итого */}
        <Card style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Итого получено</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {(total / 100).toLocaleString('ru-RU')} ₽
          </div>
        </Card>

        {/* Список */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payments.map((p) => (
            <Card key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{(p.amount / 100).toLocaleString('ru-RU')} ₽</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
                    {METHOD_LABELS[p.method]} · {dayjs(p.createdAt).format('D MMM HH:mm')}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: STATUS_COLORS[p.status] }}>
                  {p.status === 'PAID' ? 'Оплачено' : p.status === 'DEPOSIT_PAID' ? 'Депозит' : 'Не оплачено'}
                </span>
              </div>
            </Card>
          ))}

          {payments.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40 }}>
              Нет платежей
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
