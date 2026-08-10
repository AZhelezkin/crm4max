import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { usePaymentsStore } from '@/store/payments.store'
import { text } from '@/styles/typography'
import { usePaymentsExport } from '@/hooks/usePaymentsExport'
import { ExportToast } from '@/components/ExportToast'

dayjs.locale('ru')

const SELECTED_MONTH_KEY = 'income.selectedMonth'

function readSelectedMonth(): string {
  try { return sessionStorage.getItem(SELECTED_MONTH_KEY) ?? '' } catch { return '' }
}

interface MonthSummary {
  key: string
  label: string
  total: number
}

interface DayEntry {
  date: string
  label: string
  total: number
  paymentCount: number
  hasUnpaid: boolean
}

function formatNum(kop: number, fractionDigits = 0): string {
  return (kop / 100).toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatRub(kop: number, fractionDigits = 0): string {
  return formatNum(kop, fractionDigits) + ' ₽'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDayLabel(date: dayjs.Dayjs): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(date.toDate())
    .replace('.', '')
}

// «1 запись» / «2 записи» / «5 записей» — русская плюрализация по count.
function pluralRecords(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  let word: string
  if (m10 === 1 && m100 !== 11) word = 'запись'
  else if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) word = 'записи'
  else word = 'записей'
  return `${n} ${word}`
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const payments = usePaymentsStore((state) => state.payments)
  const paymentsLoaded = usePaymentsStore((state) => state.loaded)
  const fetchPayments = usePaymentsStore((state) => state.fetchPayments)
  const [selectedMonth, setSelectedMonth] = useState(readSelectedMonth)
  // Без даты — экспорт всех оплат.
  const { exporting, handleExport, toast, dismissToast } = usePaymentsExport()

  useEffect(() => {
    void fetchPayments()
  }, [fetchPayments])

  const months = useMemo<MonthSummary[]>(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      // Итог месяца — по дате приёма (booking.date), как в «Записях»; по всем
      // заказам независимо от статуса оплаты.
      const date = p.booking?.date ?? dayjs(p.createdAt).format('YYYY-MM-DD')
      const key = date.slice(0, 7)
      map.set(key, (map.get(key) || 0) + p.amount)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, total]) => {
        const d = dayjs(key + '-01')
        return {
          key,
          // «Апрель ’26» — название месяца + апостроф + двузначный год.
          label: capitalize(d.format('MMMM')) + ' ’' + d.format('YY'),
          total,
        }
      })
  }, [payments])

  useEffect(() => {
    if ((!selectedMonth || !months.some((month) => month.key === selectedMonth)) && months.length) {
      setSelectedMonth(months[0].key)
    }
  }, [months, selectedMonth])
  useEffect(() => {
    if (!selectedMonth) return
    try { sessionStorage.setItem(SELECTED_MONTH_KEY, selectedMonth) } catch { /* storage недоступен */ }
  }, [selectedMonth])

  const days = useMemo<DayEntry[]>(() => {
    if (!selectedMonth) return []
    const map = new Map<string, DayEntry>()
    for (const p of payments) {
      const dateKey = p.booking?.date ?? dayjs(p.createdAt).format('YYYY-MM-DD')
      if (dateKey.slice(0, 7) !== selectedMonth) continue
      const d = dayjs(dateKey)
      let entry = map.get(dateKey)
      if (!entry) {
        entry = {
          date: dateKey,
          label: formatDayLabel(d),
          total: 0,
          paymentCount: 0,
          hasUnpaid: false,
        }
        map.set(dateKey, entry)
      }
      // Итог дня — по всем заказам; неоплаченные тоже считаем, флаг для индикатора.
      entry.total += p.amount
      entry.paymentCount += 1
      if (p.status === 'UNPAID') entry.hasUnpaid = true
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [payments, selectedMonth])

  return (
    // overflowX:hidden + overscrollBehaviorX:contain — чтобы экран не «ездил»/не давал
    // «резинку» при горизонтальном свайпе (строка месяцев скроллится сама, см. ниже).
    <div style={{ minHeight: '100dvh', color: 'var(--color-on-surface)', paddingBottom: 95, overflowX: 'hidden', overscrollBehaviorX: 'contain' }}>
      {/* Тулбар: заголовок «Доход» по центру, экспорт-пилюля справа (макет 8712-44229). */}
      <div
        style={{
          position: 'relative',
          height: 76,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
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
          Доход
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 4,
            background: 'var(--color-background)',
            borderRadius: 22,
          }}
        >
          <button
            type="button"
            aria-label="Экспорт"
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: exporting ? 'default' : 'pointer',
              opacity: exporting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-surface)',
            }}
          >
            <ExportIcon />
          </button>
        </div>
      </div>

      {/* Карточки месяцев — горизонтальный скролл (макет 8712-44751). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {months.map((m) => {
          const active = m.key === selectedMonth
          const fg = active ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)'
          return (
            <div
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
                padding: 16,
                borderRadius: 18,
                cornerShape: 'squircle',
                cursor: 'pointer',
                background: active ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
              }}
            >
              <div style={{ ...text.caption2, color: fg, whiteSpace: 'nowrap' }}>{m.label}</div>
              <div style={{ ...text.callout1, color: fg, whiteSpace: 'nowrap' }}>{formatRub(m.total, 2)}</div>
            </div>
          )
        })}
        {paymentsLoaded && months.length === 0 && (
          <div style={{ width: 'calc(100vw - 32px)', flexShrink: 0, textAlign: 'center', ...text.caption2, color: 'var(--color-on-surface-secondary)', padding: '8px 0' }}>
            Пока нет поступлений
          </div>
        )}
      </div>

      {/* Список по дням (макет 8712-44890). Разделители — Plate (pattern-element). */}
      <div style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16, display: 'flex', flexDirection: 'column' }}>
        {days.map((d) => (
          <div
            key={d.date}
            onClick={() => navigate(`/income/${d.date}`)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderTop: '1px solid var(--color-pattern-element)',
              cursor: 'pointer',
            }}
          >
            {/* Дата — колонка 71px, текст центрируется по строке суммы (pt 12 против pt 8). */}
            <div style={{ width: 71, flexShrink: 0, paddingTop: 12 }}>
              <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
            </div>
            {/* Значение — flex-1, левый разделитель 3px Plate. */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                borderLeft: '3px solid var(--color-pattern-element)',
                paddingLeft: 16,
                paddingTop: 8,
                paddingBottom: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              {d.hasUnpaid ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>
                    {formatRub(d.total)}
                  </span>
                  <span
                    style={{
                      ...text.label3Caps,
                      color: 'var(--color-on-error-surface-lite)',
                      background: 'var(--color-error-surface-lite)',
                      borderRadius: 8,
                      padding: '7px 6px 6px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    Есть неоплаты
                  </span>
                </div>
              ) : (
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>
                  {formatRub(d.total)}
                </span>
              )}
              <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap' }}>
                {pluralRecords(d.paymentCount)}
              </span>
            </div>
          </div>
        ))}
        {paymentsLoaded && selectedMonth && days.length === 0 && (
          <div style={{ textAlign: 'center', ...text.caption2, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
            Нет поступлений в этом месяце
          </div>
        )}
      </div>

      <ExportToast toast={toast} onClose={dismissToast} />
    </div>
  )
}

// vuesax/linear/export (24×24) — стрелка вверх из «лотка». Path'ы из макета 8712-44229.
function ExportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.32 6.5L11.88 3.94L14.44 6.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.88 14.18V4.01" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12C4 16.42 7 20 12 20C17 20 20 16.42 20 12" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
