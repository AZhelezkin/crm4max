import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'
import { text } from '@/styles/typography'

type Toast = { kind: 'success' | 'error'; text: string } | null

dayjs.locale('ru')

interface MonthSummary {
  key: string
  label: string
  total: number
}

interface DayEntry {
  date: string
  day: number
  monthShort: string
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
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (t: Toast) => {
    setToast(t)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (t) toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Pre-signed URL на xlsx хранится в state, потому что
  // window.WebApp.downloadFile требует активного user-gesture
  // (клика), а любой await разорвал бы цепочку. Поэтому URL
  // тянем заранее (на маунте и после «протухания» ~4 мин),
  // а на клике синхронно отдаём его нативному мосту.
  const exportRef = useRef<{ url: string; filename: string; fetchedAt: number } | null>(null)

  const fetchExportUrl = async () => {
    try {
      const res = await paymentsApi.exportXlsx()
      exportRef.current = { ...res, fetchedAt: Date.now() }
    } catch (err) {
      console.error('[payments] pre-fetch export url failed', err)
      exportRef.current = null
    }
  }

  const handleExport = () => {
    if (exporting) return
    const fresh = exportRef.current && Date.now() - exportRef.current.fetchedAt < 4 * 60 * 1000
    if (fresh && exportRef.current) {
      // Синхронный вызов внутри click handler — Max-мост видит user gesture.
      const { url, filename } = exportRef.current
      try {
        const ret = window.WebApp?.downloadFile?.(url, filename) as
          | Promise<{ status?: string }>
          | undefined
        if (ret && typeof ret.then === 'function') {
          ret.then(
            (r) => {
              if (r?.status === 'downloading') {
                showToast({ kind: 'success', text: 'Файл сохранён в папку Max' })
              }
              // status === 'cancelled' — пользователь передумал, молчим.
            },
            (e) => {
              console.error('[payments] downloadFile rejected', e)
              showToast({ kind: 'error', text: 'Не удалось скачать файл. Попробуйте ещё раз.' })
            },
          )
        }
      } catch (err) {
        console.error('[payments] downloadFile threw', err)
        showToast({ kind: 'error', text: 'Не удалось скачать файл.' })
      }
      // Сразу готовим URL под следующее нажатие.
      fetchExportUrl()
      return
    }
    // URL не готов — тянем и просим кликнуть ещё раз.
    setExporting(true)
    fetchExportUrl().finally(() => {
      setExporting(false)
      showToast({ kind: 'success', text: 'Файл готов — нажмите «Скачать» ещё раз' })
    })
  }

  useEffect(() => {
    paymentsApi.list().then(setPayments).catch(() => {})
    fetchExportUrl()
  }, [])

  const months = useMemo<MonthSummary[]>(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      if (p.status === 'UNPAID') continue
      const key = dayjs(p.createdAt).format('YYYY-MM')
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
    if (!selectedMonth && months.length) setSelectedMonth(months[0].key)
  }, [months, selectedMonth])

  const days = useMemo<DayEntry[]>(() => {
    if (!selectedMonth) return []
    const map = new Map<string, DayEntry>()
    for (const p of payments) {
      const d = dayjs(p.createdAt)
      if (d.format('YYYY-MM') !== selectedMonth) continue
      const dateKey = d.format('YYYY-MM-DD')
      let entry = map.get(dateKey)
      if (!entry) {
        entry = {
          date: dateKey,
          day: d.date(),
          monthShort: d.format('MMM').replace('.', ''),
          total: 0,
          paymentCount: 0,
          hasUnpaid: false,
        }
        map.set(dateKey, entry)
      }
      if (p.status === 'UNPAID') {
        entry.hasUnpaid = true
      } else {
        entry.total += p.amount
        entry.paymentCount += 1
      }
    }
    return Array.from(map.values()).sort((a, b) => a.day - b.day)
  }, [payments, selectedMonth])

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--color-on-surface)', paddingBottom: 95 }}>
      {/* Тулбар: h56, заголовок «Доход» по центру, экспорт-пилюля справа (макет 8712-44229). */}
      <div
        style={{
          position: 'relative',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '6px 12px',
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
          padding: '8px 16px 0',
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
                cursor: 'pointer',
                background: active ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
              }}
            >
              <div style={{ ...text.caption2, color: fg, whiteSpace: 'nowrap' }}>{m.label}</div>
              <div style={{ ...text.callout1, color: fg, whiteSpace: 'nowrap' }}>{formatRub(m.total, 2)}</div>
            </div>
          )
        })}
        {months.length === 0 && (
          <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', padding: '8px 0' }}>
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
            {/* Дата — колонка 50px, текст центрируется по строке суммы (pt 12 против pt 8). */}
            <div style={{ width: 50, flexShrink: 0, paddingTop: 12 }}>
              <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap' }}>
                {d.day} {d.monthShort}
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
        {selectedMonth && days.length === 0 && (
          <div style={{ textAlign: 'center', ...text.caption2, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
            Нет поступлений в этом месяце
          </div>
        )}
      </div>

      {toast && createPortal(
        <ToastView toast={toast} onClose={() => setToast(null)} />,
        document.body,
      )}
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

function ToastView({ toast, onClose }: { toast: { kind: 'success' | 'error'; text: string }; onClose: () => void }) {
  const isSuccess = toast.kind === 'success'
  const accent = isSuccess ? 'var(--color-success-surface-accented)' : 'var(--color-error-surface-accented)'
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top))',
        left: 12,
        right: 12,
        zIndex: 1000,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-divider-low)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        animation: 'crm4max-toast-in 0.22s ease-out',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: '50%',
          background: `${accent}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          {isSuccess ? (
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <path d="M12 8v5" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.2" fill={accent} />
              <circle cx="12" cy="12" r="9" stroke={accent} strokeWidth="2" />
            </>
          )}
        </svg>
      </div>
      <div style={{ flex: 1, ...text.action, lineHeight: 1.35, color: 'var(--color-on-surface)' }}>{toast.text}</div>
      <style>{`@keyframes crm4max-toast-in { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}
