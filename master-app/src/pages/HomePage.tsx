import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useAuthStore } from '@/store/auth.store'
import { bookingsApi } from '@/api/bookings.api'
import { clientsApi } from '@/api/clients.api'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { masterServiceList, bookingTotal, bookingDuration, bookingServiceNames, type Booking, type Client } from '@/types'
import { text } from '@/styles/typography'
import ProfileSkeleton from '@/components/ProfileSkeleton'

dayjs.locale('ru')

const VIOLET_GRADIENT = 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)'
const CARD_SHADOW = '0px 1px 2px 0px rgba(0,0,0,0.1)' // Figma «Card Soft»
const WEEK_LETTERS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'] as const // Пн..Вс

// Figma «Card Soft»-карточка (surface-transparent, rounded 20, тень).
const cardStyle: CSSProperties = {
  background: 'var(--color-surface-transparent)',
  borderRadius: 20,
  boxShadow: CARD_SHADOW,
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase()
}

function formatRub(kop: number): string {
  return (kop / 100).toLocaleString('ru-RU') + ' ₽'
}

function pluralRecords(n: number): string {
  const m10 = n % 10, m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? 'запись' : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? 'записи' : 'записей'
  return `${n} ${w}`
}

function bookingAmount(b: Booking): number {
  return bookingTotal(b)
}

export default function HomePage() {
  const { master } = useAuthStore()
  const navigate = useNavigate()

  const [clients, setClients] = useState<Client[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  // Статус подписки — строка под именем в шапке (макет 10216-40371).
  const [sub, setSub] = useState<SubscriptionState | null>(null)
  useEffect(() => {
    clientsApi.list().then(setClients).catch(() => {})
    bookingsApi.list().then(setBookings).catch(() => {})
    subscriptionApi.getMe().then(setSub).catch(() => {})
  }, [])

  // GRACE — не удалось списать (макет 10265-59019): peach-тост «Оплатить» на главной.
  // payUrl префетчим (openLink требует синхронного user-gesture), открываем по тапу.
  const [payUrl, setPayUrl] = useState<string | null>(null)
  useEffect(() => {
    if (sub?.status === 'GRACE' && !payUrl) {
      subscriptionApi.pay().then((r) => setPayUrl(r.paymentURL)).catch(() => {})
    }
  }, [sub, payUrl])
  const handlePaySubscription = () => {
    if (!payUrl) return
    localStorage.setItem('sub:payPending', '1')
    if (window.WebApp?.openLink) window.WebApp.openLink(payUrl)
    else window.open(payUrl, '_blank')
  }
  // Дней до отключения (grace) — «через N дней»; фолбэк 7.
  const graceDays = (() => {
    if (!sub?.graceEndsAt) return 7
    return Math.max(1, Math.ceil((new Date(sub.graceEndsAt).getTime() - Date.now()) / 86_400_000))
  })()

  const today = dayjs().format('YYYY-MM-DD')
  const todayD = dayjs(today)

  const todayBookings = useMemo(
    () => bookings
      .filter((b) => b.date === today && b.status !== 'CANCELLED')
      .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, today],
  )

  // «ходят» — клиенты с будущей (>= сегодня) неотменённой записью; «не ходят» — остальные.
  const goingCount = useMemo(() => {
    const ids = new Set(
      bookings.filter((b) => b.status !== 'CANCELLED' && b.date >= today).map((b) => b.client.id),
    )
    return clients.filter((c) => ids.has(c.id)).length
  }, [bookings, clients, today])

  // Понедельник текущей недели (ISO).
  const weekStart = useMemo(() => todayD.subtract((todayD.day() + 6) % 7, 'day'), [todayD])

  if (!master) return <ProfileSkeleton />

  const servicesCount = masterServiceList(master).length
  const clientAvatars = clients.filter((c) => c.photo).slice(0, 3)
  const todaySum = todayBookings.reduce((acc, b) => acc + bookingAmount(b), 0)

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--color-on-surface)', paddingBottom: 95, overflowX: 'hidden' }}>

      {/* ── Шапка: аватар 44 + имя(✎) + статус подписки, справа шеринг (Figma 10065:50891) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0, overflow: 'hidden',
          background: master.photo ? 'var(--color-surface)' : VIOLET_GRADIENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {master.photo
            ? <img src={master.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ ...text.label2Caps, color: 'var(--color-on-surface)' }}>{initials(master.name || '?')}</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {master.name || 'Новый мастер'}
            </span>
            <EditButton onClick={() => navigate('/about')} />
          </div>
          {/* Адрес в шапке больше не показываем (он в виджете адреса) — здесь статус подписки. */}
          <SubscriptionStatusLine sub={sub} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
          <button type="button" aria-label="Поделиться" onClick={() => navigate('/share')}
            style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', color: 'var(--color-on-surface)' }}>
            <ExportIcon />
          </button>
        </div>
      </div>

      {/* ── list: карточки, gap 20, px 16 (Figma 10065:50913) ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* GRACE — «Не удалось оплатить подписку» (макет 10265-59019): peach-тост + «Оплатить». */}
        {sub?.status === 'GRACE' && (
          <button
            type="button"
            onClick={handlePaySubscription}
            style={{
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '15px 16px', borderRadius: 16,
              background: 'linear-gradient(214.04deg, var(--color-grad-peach-100) 5.83%, var(--color-grad-peach-0) 90.48%)',
            }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
              <span style={{ padding: 2, flexShrink: 0, display: 'inline-flex' }}>
                <SlashIcon />
              </span>
              <span style={{ ...text.body2, flex: 1, minWidth: 0, color: 'var(--color-on-surface)' }}>
                Не удалось оплатить подписку. Через {graceDays === 1 ? 'день' : `${graceDays} ${graceDays >= 2 && graceDays <= 4 ? 'дня' : 'дней'}`} доступ к сервису будет отключен.
              </span>
            </span>
            <span style={{ paddingLeft: 32, width: '100%', ...text.callout1, color: 'var(--color-on-surface)' }}>
              Оплатить
            </span>
          </button>
        )}

        {/* Карточка «Сегодня» */}
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          {/* Заголовок с датой + иконка календаря → Записи */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
            <div style={{ width: 36, flexShrink: 0 }} />
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              Сегодня, {todayD.format('D MMMM')}
            </div>
            <button type="button" aria-label="Открыть записи" onClick={() => navigate('/bookings')}
              style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', color: 'var(--color-primary-surface)', flexShrink: 0 }}>
              <CalendarIcon />
            </button>
          </div>

          {/* Недельная полоска */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
            {WEEK_LETTERS.map((letter, i) => {
              const d = weekStart.add(i, 'day')
              const isToday = d.format('YYYY-MM-DD') === today
              const weekend = i >= 5
              return (
                <div key={i} style={{
                  width: 48, padding: '8px 14px 6px', borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? 'var(--color-on-surface)' : 'transparent',
                }}>
                  <span style={{ fontSize: 11, lineHeight: '13px', fontWeight: 400, letterSpacing: -0.11,
                    color: isToday ? 'var(--color-pattern-element)' : weekend ? 'var(--color-error-element-muted)' : 'var(--color-on-surface-muted)' }}>
                    {letter}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: isToday ? 700 : 400, letterSpacing: -0.14,
                    color: isToday ? 'var(--color-surface)' : weekend ? 'var(--color-error-surface-accented)' : 'var(--color-interactive-element-accented)' }}>
                    {d.date()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Записи на сегодня */}
          {todayBookings.length > 0 ? (
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
              {todayBookings.map((b) => {
                const end = dayjs(`${b.date}T${b.time}`).add(bookingDuration(b), 'minute').format('HH:mm')
                const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED'
                return (
                  <button key={b.id} type="button" onClick={() => navigate(`/bookings/${b.id}`)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 4px 4px 12px' }}>
                    <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: 8, flexShrink: 0 }}>
                      {/* Цвет записи, выбранный мастером, важнее статусного. */}
                      <div style={{ width: 2, height: 44, borderRadius: 1, background: b.color ?? (confirmed ? 'var(--color-on-success-surface-lite)' : 'var(--color-warning-surface-accented)') }} />
                    </div>
                    <div style={{ width: 64, flexShrink: 0, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>{b.time}</span>
                      <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>{end}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ ...text.callout1, color: 'var(--color-on-surface)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client.name}</span>
                      <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookingServiceNames(b)}</span>
                    </div>
                    <span style={{ padding: 6, flexShrink: 0, display: 'inline-flex', color: 'var(--color-on-surface-secondary)' }}><MoreIcon /></span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 12px', textAlign: 'center', ...text.caption1, color: 'var(--color-interactive-element-muted)', borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
              {master.schedule && !master.schedule.workingDays.includes(todayD.day() || 7) ? 'Выходной' : 'Нет записей на сегодня'}
            </div>
          )}

          {/* Футер: сводка */}
          {todayBookings.length > 0 && (
            <div style={{ padding: 12, textAlign: 'center', ...text.caption1, color: 'var(--color-interactive-element-muted)' }}>
              {pluralRecords(todayBookings.length)} на {formatRub(todaySum)}
            </div>
          )}
        </div>

        {/* Кнопка «Создать запись» */}
        <button type="button" onClick={() => navigate('/bookings/new', { state: { date: today } })}
          style={{ width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)' }}>
          <span style={{ display: 'inline-flex' }}><AddCircleIcon /></span>
          <span style={text.callout1}>Создать запись</span>
        </button>

        {/* Статистика: Клиенты + Услуги */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ ...cardStyle, flex: 1, minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Клиенты</span>
              <EditButton onClick={() => navigate('/clients')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ ...text.h3, color: 'var(--color-on-surface)' }}>{clients.length}</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {clientAvatars.map((c, i) => (
                    <div key={c.id} style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', background: 'var(--color-surface)', marginLeft: i ? -8 : 0, border: '2px solid var(--color-background)' }}>
                      <img src={c.photo!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
              <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>
                ходят {goingCount}, не ходят {Math.max(0, clients.length - goingCount)}
              </span>
            </div>
          </div>

          <div style={{ ...cardStyle, flex: 1, minWidth: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Услуги</span>
              <EditButton onClick={() => navigate('/services')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <span style={{ ...text.h3, color: 'var(--color-on-surface)' }}>{servicesCount}</span>
            </div>
          </div>
        </div>

        {/* График работы */}
        <div style={{ ...cardStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>График работы</span>
            <EditButton onClick={() => navigate('/schedule')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <div style={{ display: 'flex', gap: 4, width: '100%' }}>
              {WEEK_LETTERS.map((letter, i) => {
                const iso = i + 1
                const working = !!master.schedule?.workingDays.includes(iso)
                const weekend = i >= 5
                return (
                  <div key={i} style={{
                    flex: 1, minWidth: 0, padding: '8px 14px 6px', borderRadius: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: working ? 'transparent' : 'var(--color-background)',
                  }}>
                    <span style={{ fontSize: 11, lineHeight: '13px', fontWeight: 400, letterSpacing: -0.11, textAlign: 'center',
                      color: weekend ? 'var(--color-error-element-muted)' : 'var(--color-interactive-element-secondary)' }}>
                      {letter}
                    </span>
                    {working && master.schedule ? (
                      <div style={{ fontSize: 14, lineHeight: '14px', letterSpacing: -0.14, color: 'var(--color-interactive-element-accented)', textAlign: 'center' }}>
                        <div style={{ marginBottom: 8 }}>{master.schedule.startTime}</div>
                        <div>{master.schedule.endTime}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 14, lineHeight: '14px', letterSpacing: -0.14, color: weekend ? 'var(--color-error-surface-accented)' : 'var(--color-interactive-element-accented)' }}>Вых</span>
                    )}
                  </div>
                )
              })}
            </div>
            {master.schedule?.breakStart && master.schedule?.breakEnd && (
              <span style={{ ...text.caption2, color: 'var(--color-interactive-element-secondary)' }}>
                Обед {master.schedule.breakStart}–{master.schedule.breakEnd}
              </span>
            )}
          </div>
        </div>

        {/* Адрес, где оказывается услуга (макет 10213-39782) */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Адрес, где оказывается услуга</span>
            <EditButton onClick={() => navigate('/address')} />
          </div>
          {master.location ? (
            <>
              {/* Адрес: иконка-локация + текст (px12 pt4 pb12, gap10) */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 12px 12px' }}>
                <span style={{ padding: 6, display: 'inline-flex', flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}><LocationIcon /></span>
                <span style={{ flex: 1, minWidth: 0, ...text.caption1, color: 'var(--color-on-secondary-surface)' }}>{master.location}</span>
              </div>
              {master.locationNote && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderTop: '1px solid var(--color-secondary-surface-muted)' }}>
                  <span style={{ padding: 6, display: 'inline-flex', flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}><MessageTextIcon /></span>
                  <span style={{ flex: 1, minWidth: 0, ...text.caption2, color: 'var(--color-interactive-element-secondary)' }}>{master.locationNote}</span>
                </div>
              )}
            </>
          ) : (
            /* Дефолт (макет 10220-102836): адрес не указан — та же строка, редактирование карандашом. */
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 12px 12px' }}>
              <span style={{ padding: 6, display: 'inline-flex', flexShrink: 0, color: 'var(--color-interactive-element-secondary)' }}><LocationIcon /></span>
              <span style={{ ...text.caption1, color: 'var(--color-on-secondary-surface)' }}>Не указан</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Дней до даты (округление вверх, не меньше 0) + «1 день / 2 дня / 5 дней».
function daysLeft(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000))
}
function pluralDays(n: number): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} день`
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} дня`
  return `${n} дней`
}

// Статус подписки под именем (макет 10216-40371): иконка 16 (цвет по статусу) + Caption 2.
// 🟢 ACTIVE tick / 🔵 TRIALING clock / 🟡 GRACE info / 🔴 BLOCKED warning.
function SubscriptionStatusLine({ sub }: { sub: SubscriptionState | null }) {
  if (!sub) return null
  const view = (() => {
    switch (sub.status) {
      case 'ACTIVE':
        return { icon: <TickCircle16 />, color: 'var(--color-success-surface-accented)', label: 'Подписка активна' }
      case 'TRIALING': {
        const d = daysLeft(sub.trialEndsAt)
        return { icon: <Clock16 />, color: 'var(--color-primary-surface)', label: d > 0 ? `Пробный период. ${pluralDays(d)}` : 'Пробный период' }
      }
      case 'GRACE': {
        const d = daysLeft(sub.graceEndsAt)
        return { icon: <InfoCircle16 />, color: 'var(--color-warning-surface-accented)', label: d > 0 ? `Оплатите в течении ${pluralDays(d)}` : 'Оплатите подписку' }
      }
      case 'BLOCKED':
        return { icon: <Warning16 />, color: 'var(--color-error-surface-accented)', label: 'Подписка не активна' }
    }
  })()
  if (!view) return null
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ display: 'inline-flex', flexShrink: 0, color: view.color }}>{view.icon}</span>
      <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{view.label}</span>
    </span>
  )
}

// ─── Иконки статуса подписки (vuesax/linear, 16×16, stroke: currentColor) ─────

function TickCircle16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m7.75 12 2.83 2.83 5.67-5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Clock16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.71 15.18l-3.1-1.85c-.54-.32-.98-1.09-.98-1.72V7.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoCircle16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.995 16h.009" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Warning16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 7.75V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.08 8.58v6.84c0 1.12-.6 2.16-1.57 2.73l-5.94 3.43c-.97.56-2.17.56-3.15 0l-5.94-3.43a3.15 3.15 0 0 1-1.57-2.73V8.58c0-1.12.6-2.16 1.57-2.73l5.94-3.43c.97-.56 2.17-.56 3.15 0l5.94 3.43c.97.57 1.57 1.6 1.57 2.73Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16.2h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/slash — прохибит-кружок с диагональю, тост GRACE (макет 10265-59019).
function SlashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-on-surface)' }}>
      <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.9 4.93l14.14 14.14" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Кнопка-карандаш: редактирование срабатывает только по её нажатию (не по всей карточке).
function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Редактировать"
      style={{ width: 24, height: 24, padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', flexShrink: 0, color: 'var(--color-primary-surface)' }}>
      <Edit2Icon />
    </button>
  )
}

// ─── Иконки (vuesax/linear, 24×24, stroke: currentColor) ──────────────────────

function Edit2Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M13.26 3.6 5.05 12.29c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.89 5.05c.43 2.76 2.67 4.87 5.45 5.15" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.7 13.7h.01M11.99 13.7h.01M8.29 13.7h.01M8.29 16.7h.01M11.99 16.7h.01M15.7 16.7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/location (24×24).
function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 13.43a3.12 3.12 0 1 0 0-6.24 3.12 3.12 0 0 0 0 6.24Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.193 5.193 0 0 1-7.21 0c-2.77-2.66-5.93-6.97-4.77-12.05Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// vuesax/linear/message-text (24×24).
function MessageTextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8c-4 0-6-1-6-6V8c0-4 2-6 6-6h8c4 0 6 2 6 6v5c0 4-2 6-6 6h-.5c-.31 0-.61.15-.8.4l-1.5 2c-.66.88-1.74.88-2.4 0l-1.5-2c-.16-.22-.53-.4-.8-.4Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h10M7 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 6.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM12 13.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM12 20a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 6.5 12 3.5 15 6.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12c0 4.42 3 8 8 8s8-3.58 8-8" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
