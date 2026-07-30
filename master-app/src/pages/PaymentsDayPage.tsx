import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'
import { text } from '@/styles/typography'
import { usePaymentsExport } from '@/hooks/usePaymentsExport'
import { ExportToast } from '@/components/ExportToast'

dayjs.locale('ru')

// Фиолетовый градиент аватара без фото (тот же, что в ClientsPage / списках клиентов).
const VIOLET_GRADIENT =
  'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.482%)'

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

// Инициалы: первые буквы первых двух слов имени.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function PaymentsDayPage() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  // Экспорт детализации только за этот день.
  const { exporting, handleExport, toast, dismissToast } = usePaymentsExport(date)

  useEffect(() => {
    paymentsApi.list().then(setPayments).catch(() => {})
  }, [])

  const dayPayments = useMemo(() => {
    if (!date) return []
    return payments
      // День — по дате приёма (booking.date), как группирует экран «Доход» и «Записи».
      .filter((p) => (p.booking?.date ?? dayjs(p.createdAt).format('YYYY-MM-DD')) === date)
      .sort((a, b) => {
        const ta = a.booking?.time ?? ''
        const tb = b.booking?.time ?? ''
        return ta.localeCompare(tb)
      })
  }, [payments, date])

  const titleDate = date ? dayjs(date).format('D MMMM YYYY') : ''

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--color-on-surface)' }}>
      {/* Тулбар: назад слева, экспорт справа, дата по центру (макет 8712-47004). */}
      <div
        style={{
          position: 'relative',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22 }}>
          <button
            type="button"
            aria-label="Назад"
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', padding: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-surface)',
            }}
          >
            <ArrowLeftIcon />
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            pointerEvents: 'none',
            ...text.callout1,
            color: 'var(--color-on-surface)',
          }}
        >
          {titleDate}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22 }}>
          <button
            type="button"
            aria-label="Экспорт"
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: 'none', border: 'none', padding: 6,
              cursor: exporting ? 'default' : 'pointer',
              opacity: exporting ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-surface)',
            }}
          >
            <ExportIcon />
          </button>
        </div>
      </div>

      {/* Список оплат за день (макет 8712-47994): карточки на surface-transparent, gap 12. */}
      <div
        style={{
          padding: '8px 16px calc(24px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {dayPayments.map((p) => (
          <DayCard key={p.id} payment={p} onOpen={() => navigate(`/bookings/${p.bookingId}`)} />
        ))}
        {dayPayments.length === 0 && (
          <div style={{ textAlign: 'center', ...text.caption2, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
            Нет оплат за этот день
          </div>
        )}
      </div>

      <ExportToast toast={toast} onClose={dismissToast} />
    </div>
  )
}

function DayCard({ payment, onOpen }: { payment: Payment; onOpen: () => void }) {
  const isUnpaid = payment.status === 'UNPAID'
  const tagBg = isUnpaid ? 'var(--color-error-surface-lite)' : 'var(--color-success-surface-lite)'
  const tagColor = isUnpaid ? 'var(--color-on-error-surface-lite)' : 'var(--color-on-success-surface-lite)'
  const statusLabel = isUnpaid ? 'Не оплачено' : 'Оплачено'

  const serviceName = payment.booking?.service.name ?? '—'
  const clientName = payment.booking?.client.name ?? ''
  const clientPhoto = payment.booking?.client.photo ?? null
  const time = payment.booking?.time ?? ''

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: 'var(--color-surface-transparent)',
        border: 'none',
        borderRadius: 20,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {/* Строка 1: название услуги. */}
      <div
        style={{
          ...text.callout1,
          color: 'var(--color-on-surface)',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {serviceName}
      </div>

      {/* Строка 2: клиент (аватар + имя) слева, время справа. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <Avatar name={clientName} photo={clientPhoto} />
          <span
            style={{
              ...text.caption2,
              color: 'var(--color-on-surface-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {clientName}
          </span>
        </div>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {time}
        </span>
      </div>

      {/* Строка 3: сумма слева, статус-тег справа. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap' }}>
          {formatRub(payment.amount)}
        </span>
        <span
          style={{
            ...text.label3Caps,
            color: tagColor,
            background: tagBg,
            borderRadius: 8,
            padding: '7px 6px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {statusLabel}
        </span>
      </div>
    </button>
  )
}

// Аватар клиента 24px: фото, иначе фиолетовый градиент + инициалы (label 3 CAPS).
function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        flexShrink: 0,
        overflow: 'hidden',
        background: photo ? 'var(--color-surface)' : VIOLET_GRADIENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ ...text.label3Caps, color: 'var(--color-on-surface)' }}>{initials(name)}</span>
      )}
    </div>
  )
}

// vuesax/linear/arrow-left (24×24).
function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/export (24×24) — стрелка вверх из «лотка».
function ExportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.32 6.5L11.88 3.94L14.44 6.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.88 14.18V4.01" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12C4 16.42 7 20 12 20C17 20 20 16.42 20 12" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
