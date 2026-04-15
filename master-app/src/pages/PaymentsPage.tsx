import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { paymentsApi } from '@/api/payments.api'
import type { Payment } from '@/types'

dayjs.locale('ru')

const TAX_RATE = 0.04

type Tab = 'income' | 'taxes' | 'card'

interface MonthSummary {
  key: string
  label: string
  monthAbbr: string
  year: string
  total: number
  tax: number
}

interface DayEntry {
  date: string
  day: number
  monthShort: string
  total: number
  tax: number
  paymentCount: number
  hasUnpaid: boolean
}

function formatRub(kop: number, fractionDigits = 0): string {
  return (
    (kop / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }) + ' ₽'
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  const [tab, setTab] = useState<Tab>('income')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  useEffect(() => {
    paymentsApi.list().then(setPayments).catch(() => {})
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
          label: capitalize(d.format("MMMM 'YY")),
          monthAbbr: capitalize(d.format('MMM').replace('.', '')),
          year: d.format('YYYY'),
          total,
          tax: Math.round(total * TAX_RATE),
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
          tax: 0,
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
    for (const e of map.values()) e.tax = Math.round(e.total * TAX_RATE)
    return Array.from(map.values()).sort((a, b) => a.day - b.day)
  }, [payments, selectedMonth])

  return (
    <div style={{ minHeight: '100dvh', background: '#0F0F11', color: '#D3D4D6', paddingBottom: 95 }}>
      {/* Header: 56px, centered title, upload icon right */}
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
        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#D3D4D6', margin: 0 }}>Доход</h1>
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

      {/* Tabs: 23px gap from header → tab text; underline 13px below text */}
      <div style={{ display: 'flex', gap: 36, padding: '0 14px', marginTop: 23 }}>
        <TabButton label="Доход" active={tab === 'income'} onClick={() => setTab('income')} />
        <TabButton label="Налоги" active={tab === 'taxes'} onClick={() => setTab('taxes')} />
        <TabButton label="Карта" active={tab === 'card'} onClick={() => setTab('card')} />
      </div>

      {tab === 'income' && (
      <>
      {/* Months horizontal scroll */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '20px 14px 0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {months.map((m) => {
          const active = m.key === selectedMonth
          return (
            <div
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              style={{
                flex: '0 0 164px',
                height: 106,
                background: active ? '#007AFE' : '#25262B',
                borderRadius: 20,
                padding: '18px 16px 10px',
                color: '#fff',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1,
                  color: active ? '#fff' : '#D3D4D6',
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1,
                  marginTop: 22,
                  color: '#fff',
                }}
              >
                {formatRub(m.total)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1,
                  marginTop: 10,
                  color: active ? 'rgba(255,255,255,0.6)' : '#7D7D7F',
                }}
              >
                Налог: {formatRub(m.tax, 2)}
              </div>
            </div>
          )
        })}
        {months.length === 0 && (
          <div style={{ color: '#7D7D7F', padding: 16 }}>Пока нет поступлений</div>
        )}
      </div>

      {/* Day rows */}
      <div style={{ marginTop: 20, padding: '0 14px' }}>
        {days.map((d) => (
          <div
            key={d.date}
            onClick={() => navigate(`/income/${d.date}`)}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              minHeight: 57,
              borderTop: '1px solid #25262B',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 71,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1, color: '#D3D4D6' }}>
                {d.day} {d.monthShort}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1, color: '#7D7D7F', marginTop: 8 }}>
                {d.paymentCount}
              </span>
            </div>
            <div style={{ width: 1, background: '#25262B' }} />
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1, color: '#D3D4D6' }}>
                  {formatRub(d.total)}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1, color: '#7D7D7F', marginTop: 8 }}>
                  {formatRub(d.tax)}
                </div>
              </div>
              {d.hasUnpaid && (
                <div
                  style={{
                    background: 'rgba(206, 66, 89, 0.3)',
                    color: '#CE4259',
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '4px 10px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  есть неоплата
                </div>
              )}
            </div>
          </div>
        ))}
        {selectedMonth && days.length === 0 && (
          <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>
            Нет поступлений в этом месяце
          </div>
        )}
      </div>
      </>
      )}

      {tab === 'taxes' && (
        <>
          {/* ИНН card */}
          <div style={{ padding: '20px 14px 0' }}>
            <div
              style={{
                background: '#25262B',
                borderRadius: 20,
                height: 108,
                boxSizing: 'border-box',
                padding: '20px 22px 12px 23px',
                position: 'relative',
              }}
            >
              {/* Row 1: label + badge + pencil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, lineHeight: 1, color: '#D3D4D6' }}>ИНН</span>
                <div
                  style={{
                    background: 'rgba(66, 206, 89, 0.3)',
                    color: '#29C643',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    padding: '5px 12px',
                    borderRadius: 6,
                    lineHeight: 1,
                  }}
                >
                  ПРОВЕРЕНО
                </div>
              </div>
              <button
                aria-label="Изменить ИНН"
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  width: 14,
                  height: 14,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="370 277 16 18" fill="none">
                  <path
                    d="M378.84 280.4L373.366 286.193C373.16 286.413 372.96 286.846 372.92 287.146L372.673 289.306C372.586 290.086 373.146 290.62 373.92 290.486L376.066 290.12C376.366 290.066 376.786 289.846 376.993 289.62L382.466 283.826C383.413 282.826 383.84 281.686 382.366 280.293C380.9 278.913 379.786 279.4 378.84 280.4Z"
                    stroke="#7D7D7F"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M377.927 281.366C378.213 283.206 379.707 284.613 381.56 284.8"
                    stroke="#7D7D7F"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M372 292.667H384"
                    stroke="#7D7D7F"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {/* Row 2: number */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: '#FFFFFF',
                  marginTop: 24,
                  letterSpacing: 0.5,
                }}
              >
                77 22 123456 78
              </div>
              {/* Row 3: name */}
              <div style={{ fontSize: 13, lineHeight: 1, color: '#7D7D7F', marginTop: 6 }}>
                Олег Алексеевич С.
              </div>
            </div>
          </div>

          {/* Section header */}
          <div
            style={{
              marginTop: 26,
              padding: '0 14px',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 0.5,
              color: '#7D7D7F',
              textTransform: 'uppercase',
            }}
          >
            Суммы чеков, отправленные в ФНС
          </div>

          {/* Tax rows */}
          <div style={{ marginTop: 15, padding: '0 14px' }}>
            {months.map((m, idx) => {
              const isPaid = idx > 0
              const dueLabel = isPaid
                ? null
                : `ОПЛАТА ${dayjs(m.key + '-01').add(1, 'month').date(28).format('D MMMM').toUpperCase()}`
              return (
                <div
                  key={m.key}
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    minHeight: 57,
                    borderTop: '1px solid #25262B',
                  }}
                >
                  <div
                    style={{
                      width: 71,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1, color: '#D3D4D6' }}>
                      {m.monthAbbr}
                    </span>
                    <span style={{ fontSize: 14, lineHeight: 1, color: '#7D7D7F', marginTop: 8 }}>
                      {m.year}
                    </span>
                  </div>
                  <div style={{ width: 1, background: '#25262B' }} />
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      paddingLeft: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 500,
                          lineHeight: 1,
                          color: '#D3D4D6',
                        }}
                      >
                        {formatRub(m.tax, 2)}
                      </div>
                      {isPaid ? (
                        <div
                          style={{
                            background: 'rgba(66, 206, 89, 0.3)',
                            color: '#29C643',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            padding: '5px 12px',
                            borderRadius: 6,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ОПЛАЧЕНО
                        </div>
                      ) : (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: 'rgba(211, 212, 214, 0.8)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            padding: '5px 12px',
                            borderRadius: 6,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dueLabel}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1,
                        color: '#7D7D7F',
                        marginTop: 8,
                      }}
                    >
                      Доход: {formatRub(m.total, 2)}
                    </div>
                  </div>
                </div>
              )
            })}
            {months.length === 0 && (
              <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 40 }}>
                Пока нет данных
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'card' && (
        <div style={{ textAlign: 'center', color: '#7D7D7F', marginTop: 60 }}>
          Раздел в разработке
        </div>
      )}
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        padding: '0 0 16px',
        fontSize: 17,
        lineHeight: '17px',
        fontWeight: active ? 600 : 400,
        color: active ? '#007AFE' : '#7D7D7F',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {label}
      {active && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            background: '#007AFE',
            borderRadius: 2,
          }}
        />
      )}
    </button>
  )
}
