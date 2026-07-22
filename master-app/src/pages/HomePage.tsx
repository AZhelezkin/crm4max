import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '@/components/ConfirmDialog'
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
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
  // Выбранный день недельной полоски (пусто = сегодня) — макеты календаря.
  const [selectedDate, setSelectedDate] = useState('')
  // Меню действий по кебабу «⋮» (popover у иконки) + подтверждение отмены + тост.
  const [menu, setMenu] = useState<{ booking: Booking; right: number; top?: number; bottom?: number } | null>(null)
  const [menuBusy, setMenuBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null)
  const [toast, setToast] = useState<string | null>(null)
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
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  // «Напомнить клиенту» — разовая нотификация в клиент-бот (POST /bookings/:id/remind).
  const handleRemind = async (b: Booking) => {
    if (menuBusy) return
    setMenuBusy(true)
    try {
      const { sent } = await bookingsApi.remind(b.id)
      showToast(sent ? 'Напоминание отправлено клиенту' : 'У клиента нет чата в Max — напоминание не отправлено')
    } catch {
      showToast('Не удалось отправить напоминание')
    } finally {
      setMenuBusy(false); setMenu(null)
    }
  }

  // «Отменить» — подтверждение диалогом, затем отмена записи.
  const handleCancelBooking = async (b: Booking) => {
    if (menuBusy) return
    setMenuBusy(true)
    try {
      const updated = await bookingsApi.cancel(b.id)
      setBookings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      showToast('Запись отменена')
    } catch {
      showToast('Не удалось отменить запись')
    } finally {
      setMenuBusy(false); setConfirmCancel(null)
    }
  }

  const handlePaySubscription = () => {
    if (!payUrl) return
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', sub?.lastChargeError ?? '')
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

  // Активный день полоски: выбранный или сегодня.
  const activeDate = selectedDate || today
  const activeD = dayjs(activeDate)
  const isTodayActive = activeDate === today
  // Записи активного дня (включая отменённые — показываем красной линией).
  const dayBookings = useMemo(
    () => bookings
      .filter((b) => b.date === activeDate)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, activeDate],
  )
  // Ближайшая будущая неотменённая запись — для пустого дня.
  const nearestUpcoming = useMemo(
    () => bookings
      .filter((b) => b.status !== 'CANCELLED' && b.date > activeDate)
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))[0] ?? null,
    [bookings, activeDate],
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
  const daySum = dayBookings.filter((b) => b.status !== 'CANCELLED').reduce((acc, b) => acc + bookingAmount(b), 0)

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

        {/* Карточка календаря (макеты 10265-56644 / 10261-56461 / 10265-56802 / 10265-57000) */}
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          {/* Шапка: «к сегодня» (скрыт, если активен сегодня) + дата + открыть календарь */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
            <button type="button" aria-label="К сегодняшнему дню" onClick={() => setSelectedDate(today)}
              style={{ background: 'none', border: 'none', padding: 6, display: 'flex', flexShrink: 0,
                opacity: isTodayActive ? 0 : 1, pointerEvents: isTodayActive ? 'none' : 'auto',
                cursor: isTodayActive ? 'default' : 'pointer' }}>
              <CalendarDayIcon day={todayD.date()} />
            </button>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>
              {isTodayActive ? `Сегодня, ${activeD.format('D MMMM')}` : `${capitalize(activeD.format('dddd'))}, ${activeD.format('D MMMM')}`}
            </div>
            <button type="button" aria-label="Открыть записи" onClick={() => navigate('/bookings')}
              style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', color: 'var(--color-primary-surface)', flexShrink: 0 }}>
              <CalendarIcon />
            </button>
          </div>

          {/* Недельная полоска — тапабельные дни */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
            {WEEK_LETTERS.map((letter, i) => {
              const d = weekStart.add(i, 'day')
              const ds = d.format('YYYY-MM-DD')
              const selected = ds === activeDate
              const isToday = ds === today
              const weekend = i >= 5
              // Приоритет цвета: выбранный > сегодня(синий) > выходной(красный) > обычный.
              const letterColor = selected ? 'var(--color-pattern-element)'
                : weekend ? 'var(--color-error-element-muted)'
                : 'var(--color-interactive-element-secondary)'
              const numColor = selected ? 'var(--color-surface)'
                : isToday ? 'var(--color-primary-surface)'
                : weekend ? 'var(--color-error-surface-accented)'
                : 'var(--color-interactive-element-accented)'
              return (
                <button key={i} type="button" onClick={() => setSelectedDate(ds)} style={{
                  width: 48, padding: '8px 14px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: selected ? 'var(--color-on-surface)' : 'transparent',
                }}>
                  <span style={{ fontSize: 11, lineHeight: '13px', fontWeight: 400, letterSpacing: -0.11, color: letterColor }}>{letter}</span>
                  <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: selected ? 700 : 400, letterSpacing: -0.14, color: numColor }}>{d.date()}</span>
                </button>
              )
            })}
          </div>

          {/* Записи активного дня / пустой день */}
          {dayBookings.length > 0 ? (
            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
              {dayBookings.map((b) => {
                const end = dayjs(`${b.date}T${b.time}`).add(bookingDuration(b), 'minute').format('HH:mm')
                const cancelled = b.status === 'CANCELLED'
                const confirmed = b.status === 'CONFIRMED' || b.status === 'COMPLETED'
                // Отменённая — красная; иначе цвет мастера важнее статусного (зелёный/оранжевый).
                const lineColor = cancelled ? 'var(--color-error-element-muted)'
                  : b.color ?? (confirmed ? 'var(--color-on-success-surface-lite)' : 'var(--color-warning-surface-accented)')
                return (
                  // Строка: кликабельная часть → карточка записи; кебаб «⋮» — отдельная
                  // кнопка (меню действий), поэтому строка не <button>, а контейнер.
                  <div key={b.id} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '4px 4px 4px 12px' }}>
                    <button type="button" onClick={() => navigate(`/bookings/${b.id}`)}
                      style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, textAlign: 'left' }}>
                      <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: 8, flexShrink: 0 }}>
                        <div style={{ width: 2, height: 44, borderRadius: 1, background: lineColor }} />
                      </div>
                      <div style={{ width: 64, flexShrink: 0, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>{b.time}</span>
                        <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>{end}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ ...text.callout1, color: 'var(--color-on-surface)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.client.name}</span>
                        <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookingServiceNames(b)}</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Действия с записью"
                      onClick={(e) => {
                        // Popover привязываем к иконке: справа по её правому краю, снизу —
                        // если внизу мало места, раскрываем вверх.
                        const r = e.currentTarget.getBoundingClientRect()
                        const right = Math.max(8, window.innerWidth - r.right)
                        setMenu(r.bottom > window.innerHeight - 240
                          ? { booking: b, right, bottom: window.innerHeight - r.top + 6 }
                          : { booking: b, right, top: r.bottom + 6 })
                      }}
                      style={{ padding: 6, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', color: 'var(--color-on-surface-secondary)' }}
                    >
                      <MoreIcon />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 12px', borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
              <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element)' }}><FolderIcon /></span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>В этот день нет записей</span>
                {nearestUpcoming && (
                  <span style={{ ...text.caption1, color: 'var(--color-on-surface-secondary)' }}>
                    Ближайшая запись <span style={{ color: 'var(--color-primary-surface)' }}>{dayjs(nearestUpcoming.date).format('D MMMM')}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Футер: сводка активного дня */}
          {dayBookings.length > 0 && (
            <div style={{ padding: 12, textAlign: 'center', ...text.caption1, color: 'var(--color-interactive-element-muted)' }}>
              {pluralRecords(dayBookings.length)} на {formatRub(daySum)}
            </div>
          )}
        </div>

        {/* Кнопка «Создать запись» */}
        <button type="button" onClick={() => navigate('/bookings/new', { state: { date: activeDate } })}
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

      {/* Меню действий по кебабу «⋮» (макет 10265-79559). */}
      {menu && (
        <BookingActionMenu
          pos={menu}
          busy={menuBusy}
          onClose={() => setMenu(null)}
          onRemind={() => { void handleRemind(menu.booking) }}
          onEdit={() => { const id = menu.booking.id; setMenu(null); navigate(`/bookings/${id}`) }}
          onReschedule={() => {
            const b = menu.booking
            setMenu(null)
            navigate('/bookings/new', { state: { rescheduleId: b.id, serviceId: b.service.id } })
          }}
          onCancel={() => { const b = menu.booking; setMenu(null); setConfirmCancel(b) }}
        />
      )}

      {/* Подтверждение отмены записи. */}
      {confirmCancel && (
        <ConfirmDialog
          title="Отменить запись?"
          message={`Запись «${confirmCancel.client.name}» будет отменена. Клиент получит уведомление.`}
          confirmLabel="Отменить запись"
          cancelLabel="Назад"
          onConfirm={() => { void handleCancelBooking(confirmCancel) }}
          onCancel={() => setConfirmCancel(null)}
        />
      )}

      {/* Тост результата действия. */}
      {toast && (
        <div style={{
          position: 'fixed', left: 16, right: 16, bottom: 'calc(104px + env(safe-area-inset-bottom))', zIndex: 1100,
          background: 'var(--color-on-surface)', color: 'var(--color-surface)',
          borderRadius: 16, padding: '12px 16px', textAlign: 'center', ...text.caption1,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// Popover-меню действий по записи (макет 10265-79559): карточка surface rx16,
// px20 py12, пункты Body 2 с иконкой 20 справа и 8px-разделителями; «Отменить» — красный.
function BookingActionMenu({ pos, busy, onClose, onRemind, onEdit, onReschedule, onCancel }: {
  pos: { right: number; top?: number; bottom?: number }
  busy: boolean
  onClose: () => void
  onRemind: () => void
  onEdit: () => void
  onReschedule: () => void
  onCancel: () => void
}) {
  const items: Array<{ label: string; icon: ReactNode; onClick: () => void; danger?: boolean }> = [
    { label: 'Напомнить клиенту', icon: <MessageNotifIcon />, onClick: onRemind },
    { label: 'Изменить', icon: <Edit2SmallIcon />, onClick: onEdit },
    { label: 'Перенести', icon: <CalendarEditIcon />, onClick: onReschedule },
    { label: 'Отменить', icon: <CloseCircleIcon />, onClick: onCancel, danger: true },
  ]
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', right: pos.right,
          ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
          minWidth: 220, maxWidth: 'calc(100vw - 32px)',
          background: 'var(--color-surface)', borderRadius: 16, padding: '12px 20px',
          boxShadow: '0 16px 16px -4px rgba(12,12,13,0.10), 0 4px 2px -4px rgba(12,12,13,0.05)',
        }}
      >
        {items.map((it, i) => (
          <div key={it.label}>
            {i > 0 && (
              <div style={{ height: 8, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', height: 1, background: 'var(--color-divider-low)' }} />
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={it.onClick}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                background: 'none', border: 'none', textAlign: 'left',
                cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
                color: it.danger ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, ...text.body2 }}>{it.label}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex' }}>{it.icon}</span>
            </button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

// vuesax/linear/message-notif (20) — «Напомнить клиенту».
function MessageNotifIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17 18.43h-4l-4.45 2.96c-.66.44-1.55-.03-1.55-.83v-2.13c-3 0-5-2-5-5v-6c0-3 2-5 5-5h8c3 0 5 2 5 5v3" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="16.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// vuesax/linear/edit-2 (20) — «Изменить».
function Edit2SmallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M13.26 3.6 5.05 12.29c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.89 5.05c.43 2.76 2.67 4.87 5.45 5.15" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/calendar-edit (20) — «Перенести».
function CalendarEditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v3M16 2v3M3.5 9.09h13" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 22H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.21 14.77l-3.67 3.67c-.14.14-.28.42-.31.62l-.2 1.42c-.07.51.28.86.79.79l1.42-.2c.2-.03.49-.17.62-.31l3.67-3.67c.63-.63.93-1.37 0-2.3-.92-.92-1.66-.62-2.32.01Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/close-circle (20) — «Отменить».
function CloseCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.17 14.83l5.66-5.66M14.83 14.83L9.17 9.17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

// Иконка «к сегодня»: календарь с числом сегодняшнего дня по центру (макет: 12px ExtraBold primary).
function CalendarDayIcon({ day }: { day: number }) {
  return (
    <span style={{ position: 'relative', width: 24, height: 24, display: 'inline-flex', color: 'var(--color-primary-surface)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M8 2V5M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ position: 'absolute', left: 0, right: 0, top: 10, textAlign: 'center', fontSize: 11, lineHeight: '12px', fontWeight: 800, letterSpacing: -0.55 }}>{day}</span>
    </span>
  )
}

// vuesax/linear/folder-2 — пустой день (36×36).
function FolderIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path d="M22 11.4V16c0 4-1 5-5 5H7c-4 0-5-1-5-5V8c0-4 1-5 5-5h1.5c1.5 0 1.83.44 2.4 1.2l1.5 2c.38.5.6.8 1.6.8H17c4 0 5 1 5 4.4Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
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
