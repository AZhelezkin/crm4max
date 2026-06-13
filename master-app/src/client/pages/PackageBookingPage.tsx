import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { mastersApi } from '@client/api/masters.api'
import { bookingsApi } from '@client/api/bookings.api'
import { useBookingStore } from '@client/store/booking.store'
import type { Master } from '@client/types'
import { discountedPrice, formatPrice } from '@client/types'
import { text } from '@/styles/typography'
import AddressSuggestField from '@client/components/AddressSuggestField'

dayjs.locale('ru')

// Дни недели в ISO-порядке (1=Пн … 7=Вс) — как в Schedule.workingDays.
const WEEKDAYS = [
  { iso: 1, label: 'Пн' }, { iso: 2, label: 'Вт' }, { iso: 3, label: 'Ср' },
  { iso: 4, label: 'Чт' }, { iso: 5, label: 'Пт' }, { iso: 6, label: 'Сб' }, { iso: 7, label: 'Вс' },
]

/* ── Иконки (vuesax/linear) ────────────────────────────────────────────────── */

function IcoArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12l6.07 6.07" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.5 12H3.67" stroke="var(--color-on-surface-soften)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round"/>
    </svg>
  )
}

function IcoLocation() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 8.95C9.149 8.95 10.08 8.019 10.08 6.87C10.08 5.722 9.149 4.79 8 4.79C6.851 4.79 5.92 5.722 5.92 6.87C5.92 8.019 6.851 8.95 8 8.95Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
      <path d="M2.413 5.66C3.727 -0.107 12.28 -0.1 13.587 5.667C14.353 9.054 12.247 11.92 10.4 13.694C9.06 14.987 6.94 14.987 5.593 13.694C3.753 11.92 1.647 9.047 2.413 5.66Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5"/>
    </svg>
  )
}

function IcoStar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M11.4751 2.85L12.9584 5.81667C13.1584 6.225 13.6917 6.61667 14.1417 6.69167L16.8001 7.13333C18.5001 7.41667 18.9001 8.65 17.6751 9.86667L15.6084 11.9333C15.2584 12.2833 15.0667 12.9583 15.1751 13.4417L15.7667 16C16.2334 18.025 15.1584 18.8083 13.3667 17.75L10.8751 16.275C10.4251 16.0083 9.68341 16.0083 9.22508 16.275L6.73341 17.75C4.95008 18.8083 3.86675 18.0167 4.33341 16L4.92508 13.4417C5.03341 12.9583 4.84175 12.2833 4.49175 11.9333L2.42508 9.86667C1.20841 8.65 1.60008 7.41667 3.30008 7.13333L5.95841 6.69167C6.40008 6.61667 6.93341 6.225 7.13341 5.81667L8.61675 2.85C9.41675 1.25833 10.7167 1.25833 11.4751 2.85Z" fill="var(--color-warning-surface-accented)"/>
    </svg>
  )
}

function IcoChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 4L10.5 8L6 12" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IcoCalendarEdit() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5C3 5.5 4.5 3.5 8 3.5h8c3.5 0 5 2 5 5Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m15.695 13.7-3.61 3.61c-.14.14-.27.4-.3.59l-.19 1.35c-.07.49.27.83.76.76l1.35-.19c.19-.03.46-.16.59-.3l3.61-3.61c.62-.62.91-1.34 0-2.25-.9-.9-1.62-.6-2.21.04Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.205 14.19a3.193 3.193 0 0 0 2.25 2.25" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ── Общие стили карточек/тайлов ───────────────────────────────────────────── */

const cardStyle = {
  background: 'var(--color-surface-transparent)',
  borderRadius: 20,
  padding: '16px 20px',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 12,
}
const ellipsis = { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const }

// Сегмент-контрол «По дням / По неделям» (Figma 8703:26080): h44 p4 rx16 gap4.
function ModeTabs({ mode, onChange }: { mode: 'days' | 'weeks'; onChange: (m: 'days' | 'weeks') => void }) {
  const tabs: { key: 'days' | 'weeks'; label: string }[] = [
    { key: 'days', label: 'По дням' },
    { key: 'weeks', label: 'По неделям' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, height: 44, alignItems: 'center', padding: 4,
      borderRadius: 16, background: 'var(--color-surface-transparent)', width: '100%',
    }}>
      {tabs.map((t) => {
        const active = mode === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              flex: 1, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...text.callout2,
              background: active ? 'var(--color-secondary-surface)' : 'transparent',
              color: active ? 'var(--color-interactive-element-accented)' : 'var(--color-interactive-element)',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// Подпись секции в режиме «По неделям» — Caption 3 CAPS, по центру (Figma 8703:35424).
function WeeksSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 8px 8px', display: 'flex', justifyContent: 'center' }}>
      <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>{children}</span>
    </div>
  )
}

/* ── Страница ──────────────────────────────────────────────────────────────── */

// Запись на абонемент (Service.sessionsCount > 1): выбор слотов на все N приёмов.
// Figma «check» 8703:35427 (по дням) / 8703:39902 + 8703:40085 (по неделям).
export default function PackageBookingPage() {
  const navigate = useNavigate()
  const { masterId, service, slots, remind, clientAddress, setClientAddress, reset } = useBookingStore()

  const [master, setMaster] = useState<Master | null>(null)
  const [mode, setMode] = useState<'days' | 'weeks'>('days')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // «По неделям»: выбранные дни недели (ISO) + время + сетка доступных времён.
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [weekTime, setWeekTime] = useState('')
  const [weekTimeOptions, setWeekTimeOptions] = useState<string[]>([])

  const N = service?.sessionsCount ?? 0
  const schedule = master?.schedule ?? null

  useEffect(() => {
    if (masterId) mastersApi.getById(masterId).then(setMaster).catch(() => {})
  }, [masterId])

  // Услуга у мастера → clientAddress всегда null (как в ConfirmPage).
  useEffect(() => {
    if (master && !master.homeVisit && clientAddress) setClientAddress(null)
  }, [master, clientAddress, setClientAddress])

  // «По неделям»: подгружаем сетку времён по ближайшему рабочему дню (как шаблон).
  useEffect(() => {
    if (mode !== 'weeks' || !master || !service) return
    const wd = schedule?.workingDays ?? [1, 2, 3, 4, 5, 6, 7]
    let d = dayjs().add(1, 'day')
    for (let i = 0; i < 14 && !wd.includes(d.day() || 7); i++) d = d.add(1, 'day')
    mastersApi.getSlots(masterId, d.format('YYYY-MM-DD'), service.id)
      .then(setWeekTimeOptions)
      .catch(() => setWeekTimeOptions([]))
  }, [mode, master, service, masterId, schedule])

  // «По неделям»: N приёмов раскладываются по выбранным дням недели вперёд.
  const weeksSlots = useMemo(() => {
    if (!weekTime || weekdays.length === 0 || N === 0) return [] as { date: string; time: string }[]
    const res: { date: string; time: string }[] = []
    let d = dayjs().add(1, 'day')
    for (let guard = 0; res.length < N && guard < 400; guard++) {
      if (weekdays.includes(d.day() || 7)) res.push({ date: d.format('YYYY-MM-DD'), time: weekTime })
      d = d.add(1, 'day')
    }
    return res
  }, [weekTime, weekdays, N])

  if (!service) return null

  const daysFilled = slots.filter((s) => s && s.date && s.time)
  const finalSlots = mode === 'days' ? daysFilled : weeksSlots
  const addressReady = !master?.homeVisit || !!clientAddress?.trim()
  const canSubmit = !loading && finalSlots.length === N && addressReady

  const unit = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = unit !== null
  const discTotal = (unit ?? service.price) * N
  const fullTotal = service.price * N

  const toggleWeekday = (iso: number) =>
    setWeekdays((p) => (p.includes(iso) ? p.filter((x) => x !== iso) : [...p, iso]))

  const handleOpenMasterLocation = () => {
    if (!master) return
    const url = master.lat && master.lng
      ? `geo:${master.lat},${master.lng}?q=${master.lat},${master.lng}(${encodeURIComponent(master.name)})`
      : `geo:0,0?q=${encodeURIComponent(master.location ?? '')}`
    window.WebApp?.openLink(url)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const pkg = await bookingsApi.createPackage({
        masterId, serviceId: service.id, slots: finalSlots, remind,
        clientAddress: master?.homeVisit ? clientAddress : null,
      })
      navigate('/book/success', { state: { bookingId: pkg.bookings[0]?.id } })
    } catch (e) {
      const slot = (e as { response?: { data?: { slot?: { date: string; time: string } } } })?.response?.data?.slot
      setError(slot
        ? `Слот ${dayjs(slot.date).format('D MMMM')} ${slot.time} уже занят — выберите другой`
        : 'Не удалось записаться, попробуйте ещё раз')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => { reset(); navigate('/') }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 124 }}>

      {/* ── Toolbar: назад + «Подтверждение» + «Закрыть» (как в ConfirmPage). */}
      <div style={{ position: 'relative', height: 56, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--color-background)', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <IcoArrowLeft />
        </button>

        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Подтверждение</div>
          <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{service.name}</div>
        </div>

        <button
          onClick={handleClose}
          aria-label="Закрыть"
          style={{ height: 44, padding: '0 10px', borderRadius: 22, background: 'var(--color-background)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Закрыть</span>
        </button>
      </div>

      {/* ── Контент: gap 24 между группами (Figma form). */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Группа 1: мастер + адрес + услуга (gap 8). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Мастер */}
          {master && (
            <div style={cardStyle}>
              <div style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', background: 'var(--color-surface)', flexShrink: 0 }}>
                {master.photo && <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', ...ellipsis }}>{master.name}</div>
                {master.description && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {master.description}
                  </div>
                )}
              </div>
              {master.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0', flexShrink: 0 }}>
                  <IcoStar />
                  <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>{master.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}

          {/* Адрес: у мастера (location) или поле ввода (выезд) */}
          {master && !master.homeVisit && master.location && (
            <button type="button" onClick={handleOpenMasterLocation} aria-label="Открыть на карте" style={{ ...cardStyle, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{master.location}</div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', ...ellipsis }}>Адрес мастера</div>
              </div>
              <IcoLocation />
            </button>
          )}
          {master?.homeVisit && (
            <AddressSuggestField value={clientAddress ?? ''} onChange={(v) => setClientAddress(v || null)} label="Ваш адрес" placeholder="Город, улица, дом, квартира..." />
          )}

          {/* Услуга: название + описание + цена курса (цена × N) */}
          <div style={cardStyle}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', ...ellipsis }}>{service.name}</div>
                {service.description && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {service.description}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasDiscount ? (
                  <>
                    <span style={{ ...text.callout1, color: 'var(--color-error-surface-accented)' }}>{formatPrice(discTotal)}</span>
                    <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', textDecoration: 'line-through' }}>{formatPrice(fullTotal)}</span>
                    <span style={{ ...text.label2Caps, color: 'var(--color-on-error-surface-lite)', background: 'var(--color-error-surface-lite)', padding: '8px', borderRadius: 8 }}>СКИДКА</span>
                  </>
                ) : (
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(fullTotal)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Группа 2: режим выбора + содержимое. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: mode === 'days' ? 8 : 0 }}>
          <ModeTabs mode={mode} onChange={setMode} />

          {/* ── По дням: N строк «Выбрать дату и время» ── */}
          {mode === 'days' && Array.from({ length: N }).map((_, i) => {
            const slot = slots[i]
            const filled = !!(slot && slot.date && slot.time)
            return (
              <button
                key={i}
                type="button"
                onClick={() => navigate('/book/calendar', { state: { sessionIndex: i } })}
                style={{ ...cardStyle, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...text.callout1, color: 'var(--color-on-surface)', ...ellipsis }}>
                    {filled ? dayjs(slot.date).format('D MMMM, dd') : 'Выбрать дату и время'}
                  </div>
                  {filled && <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{slot.time}</div>}
                </div>
                <IcoChevronRight />
              </button>
            )
          })}

          {/* ── По неделям: дни недели + время ── */}
          {mode === 'weeks' && (
            <>
              <WeeksSectionTitle>Каждую неделю по выбранным дням</WeeksSectionTitle>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                {WEEKDAYS.map((w) => {
                  const sel = weekdays.includes(w.iso)
                  const allowed = !schedule || schedule.workingDays.includes(w.iso)
                  return (
                    <button
                      key={w.iso}
                      type="button"
                      disabled={!allowed}
                      onClick={() => toggleWeekday(w.iso)}
                      style={{
                        flex: 1, height: 69, borderRadius: 20, border: 'none',
                        ...text.callout1,
                        background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
                        color: sel ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                        opacity: allowed ? 1 : 0.4,
                        cursor: allowed ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {w.label}
                    </button>
                  )
                })}
              </div>

              <WeeksSectionTitle>Время</WeeksSectionTitle>
              {weekTimeOptions.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '16px 0' }}>Нет доступных слотов</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {weekTimeOptions.map((t) => {
                    const sel = weekTime === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setWeekTime(t)}
                        style={{
                          height: 69, borderRadius: 20, border: 'none',
                          ...text.callout1,
                          background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)',
                          color: sel ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div style={{ ...text.caption2, color: 'var(--color-error-surface-accented)', textAlign: 'center' }}>{error}</div>
        )}
      </div>

      {/* ── Footer «Записаться» (disabled пока не выбраны все N приёмов). */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '8px 12px 48px', background: 'var(--color-background)' }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18,
            cursor: canSubmit ? 'pointer' : 'default',
            background: canSubmit ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
            color: canSubmit ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
          }}
        >
          <IcoCalendarEdit />
          <span style={{ ...text.callout1 }}>{loading ? 'Записываем...' : 'Записаться'}</span>
        </button>
      </div>
    </div>
  )
}
