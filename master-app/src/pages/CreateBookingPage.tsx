import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import { clientsApi } from '@/api/clients.api'
import { useAuthStore } from '@/store/auth.store'
import type { Booking, Category, Client, Schedule, Service } from '@/types'
import { UNCATEGORIZED_CATEGORY_ID, discountedPrice, formatPrice } from '@/types'
import { text } from '@/styles/typography'
import ToggleSwitch from '@/components/ToggleSwitch'
import AddressSuggestField from '@client/components/AddressSuggestField'

dayjs.locale('ru')

const VIOLET_GRADIENT = 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)'
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface CategoryItem {
  id: string
  name: string
  description: string | null
  photo: string | null
  hasDiscount: boolean
  isUncat: boolean
}

interface Section {
  id: string
  name: string
  services: Service[]
}

function buildMonthGrid(monthStart: dayjs.Dayjs): (dayjs.Dayjs | null)[][] {
  const startOffset = (monthStart.day() || 7) - 1
  const daysInMonth = monthStart.daysInMonth()
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => monthStart.add(i, 'day')),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (dayjs.Dayjs | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function isWorkingDay(day: dayjs.Dayjs, schedule: Schedule | null): boolean {
  if (!schedule) return true
  return schedule.workingDays.includes(day.day() || 7)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
  }
  return phone
}

// Флоу создания записи мастером (макеты 8746-41312/41313/41318/41317, 8792-51136):
// category → service → date → time → confirm (клиент/адрес/итог) → запись.
export default function CreateBookingPage() {
  const navigate = useNavigate()
  const master = useAuthStore((s) => s.master)
  const schedule = master?.schedule ?? null
  const homeVisit = !!master?.homeVisit

  const [step, setStep] = useState<'category' | 'service' | 'date' | 'time' | 'confirm' | 'client' | 'success'>('category')
  const [categories, setCategories] = useState<Category[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoaded, setClientsLoaded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [remind, setRemind] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [address, setAddress] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([categoriesApi.list(), servicesApi.list()])
      .then(([cats, svcs]) => {
        setCategories(cats)
        setAllServices(svcs)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    clientsApi.list().then((c) => { setClients(c); setClientsLoaded(true) }).catch(() => setClientsLoaded(true))
  }, [])

  useEffect(() => {
    if (!master?.id || !serviceId) return
    const from = dayjs().format('YYYY-MM-DD')
    const to = dayjs().startOf('month').add(2, 'month').endOf('month').format('YYYY-MM-DD')
    setAvailabilityLoaded(false)
    mastersApi.getAvailability(master.id, from, to, serviceId)
      .then((a) => { setAvailability(a); setAvailabilityLoaded(true) })
      .catch(() => setAvailabilityLoaded(true))
  }, [master?.id, serviceId])

  useEffect(() => {
    if (master?.id && serviceId && date) {
      setSlotsLoading(true)
      mastersApi.getSlots(master.id, date, serviceId)
        .then(setSlots)
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false))
    } else {
      setSlots([])
    }
  }, [master?.id, serviceId, date])

  useEffect(() => {
    if (searchMode) searchInputRef.current?.focus()
  }, [searchMode])

  const items = useMemo<CategoryItem[]>(() => {
    const uncategorized = allServices.filter((s) => s.categoryId == null)
    const list: CategoryItem[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      photo: c.photo,
      hasDiscount: c.services.some((s) => s.discountPercent),
      isUncat: false,
    }))
    if (uncategorized.length) {
      list.push({
        id: UNCATEGORIZED_CATEGORY_ID,
        name: 'Услуги без категории',
        description: null,
        photo: null,
        hasDiscount: uncategorized.some((s) => s.discountPercent),
        isUncat: true,
      })
    }
    return list
  }, [categories, allServices])

  const baseSections = useMemo<Section[]>(() => {
    const uncat = allServices.filter((s) => s.categoryId == null && s.isActive)
    const all: Section[] = categories
      .map((c) => ({ id: c.id, name: c.name, services: c.services.filter((s) => s.isActive) }))
      .filter((sec) => sec.services.length)
    if (uncat.length) all.push({ id: UNCATEGORIZED_CATEGORY_ID, name: 'Услуги без категории', services: uncat })
    if (selectedCategoryId == null) return all
    return all.filter((sec) => sec.id === selectedCategoryId)
  }, [categories, allServices, selectedCategoryId])

  const q = query.trim().toLowerCase()
  const sections = useMemo<Section[]>(() => {
    if (!q) return baseSections
    return baseSections
      .map((sec) => ({ ...sec, services: sec.services.filter((s) => s.name.toLowerCase().includes(q)) }))
      .filter((sec) => sec.services.length)
  }, [baseSections, q])

  const selectedService = useMemo(() => allServices.find((s) => s.id === serviceId) ?? null, [allServices, serviceId])

  const openCategory = (id: string) => {
    setSelectedCategoryId(id)
    setSearchMode(false)
    setQuery('')
    setStep('service')
  }

  const openGlobalSearch = () => {
    setSelectedCategoryId(null)
    setQuery('')
    setSearchMode(true)
    setStep('service')
  }

  const pickService = (s: Service) => {
    setServiceId(s.id)
    setDate('')
    setTime('')
    setStep('date')
  }

  const backFromService = () => {
    if (searchMode) {
      setSearchMode(false)
      setQuery('')
    } else {
      setStep('category')
    }
  }

  const handleSelectDate = (d: dayjs.Dayjs) => {
    setDate(d.format('YYYY-MM-DD'))
    setTime('')
    setStep('time')
  }

  const canSave = !!selectedClient?.clientId && (!homeVisit || !!address.trim()) && !saving

  const handleSave = async () => {
    if (!master || !serviceId || !date || !time || !selectedClient?.clientId) return
    if (homeVisit && !address.trim()) return
    setSaving(true)
    setError(null)
    try {
      const booking = await bookingsApi.create({
        masterId: master.id,
        serviceId,
        date,
        time,
        clientId: selectedClient.clientId,
        remind,
        clientAddress: homeVisit ? address.trim() : undefined,
      })
      setCreatedBooking(booking)
      setStep('success')
    } catch (e) {
      console.error('[booking] create failed', e)
      setError('Не удалось создать запись. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  // Тап по слоту: в обычном флоу → подтверждение; в режиме переноса → reschedule существующей записи.
  const onSlotTap = (s: string) => {
    setTime(s)
    if (rescheduleId) {
      void (async () => {
        try {
          await bookingsApi.reschedule(rescheduleId, { date, time: s })
        } catch (e) {
          console.error('[booking] reschedule failed', e)
        }
        navigate('/bookings')
      })()
    } else {
      setStep('confirm')
    }
  }

  const handleReschedule = () => {
    if (!createdBooking) return
    setRescheduleId(createdBooking.id)
    setTime('')
    setStep('date')
  }

  const handleCancelBooking = async () => {
    if (!createdBooking) return
    try {
      await bookingsApi.cancel(createdBooking.id)
    } catch (e) {
      console.error('[booking] cancel failed', e)
    }
    navigate('/bookings')
  }

  // Google-календарь: TEMPLATE-ссылка (openLink). Если нужен другой провайдер/ICS — поменяем.
  const handleAddToCalendar = () => {
    if (!selectedService) return
    const start = dayjs(`${date}T${time}`)
    const end = start.add(selectedService.duration, 'minute')
    const fmt = (d: dayjs.Dayjs) => d.format('YYYYMMDDTHHmmss')
    const loc = homeVisit ? address.trim() : master?.location ?? ''
    const url =
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedService.name)}` +
      `&dates=${fmt(start)}/${fmt(end)}${loc ? `&location=${encodeURIComponent(loc)}` : ''}`
    if (window.WebApp?.openLink) window.WebApp.openLink(url)
    else window.open(url, '_blank')
  }

  // ─── Шаг 1: выбор категории (макет 8746-41312) ──────────────────────────────
  if (step === 'category') {
    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        <Toolbar
          title="Выберите категорию"
          onBack={() => navigate(-1)}
          trailing={
            <PillButton onClick={openGlobalSearch} ariaLabel="Поиск">
              <SearchIcon />
            </PillButton>
          }
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
          {loaded && items.length === 0 && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              Сначала добавьте услуги в профиле
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openCategory(item.id)}
              style={listItemStyle}
            >
              <CategoryAvatar photo={item.photo} uncategorized={item.isUncat} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  {item.hasDiscount && <DiscountBadge />}
                </div>
                {item.description && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                    {item.description}
                  </div>
                )}
              </div>
              <ArrowRightIcon />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Шаг 2: выбор услуги (макет 8746-41313) ─────────────────────────────────
  if (step === 'service') {
    const nothing = loaded && sections.length === 0
    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 12px' }}>
          <PillButton onClick={backFromService} ariaLabel="Назад">
            <ArrowLeftIcon />
          </PillButton>
          {searchMode ? (
            <div style={{ flex: 1, minWidth: 0, height: 44, background: 'var(--color-background)', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--color-on-surface)', fontFamily: 'inherit', fontSize: 18, lineHeight: '24px', fontWeight: 400, padding: 0 }}
              />
              {query && (
                <button type="button" aria-label="Очистить" onClick={() => { setQuery(''); searchInputRef.current?.focus() }} style={{ width: 20, height: 20, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-secondary)' }}>
                  <ClearIcon />
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', ...text.callout1, color: 'var(--color-on-surface)' }}>
                Выберите услугу
              </div>
              <PillButton onClick={() => setSearchMode(true)} ariaLabel="Поиск">
                <SearchIcon />
              </PillButton>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
          {nothing && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              {searchMode ? 'Ничего не найдено' : 'В этой категории нет услуг'}
            </div>
          )}
          {sections.map((sec) => (
            <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '16px 8px 4px' }}>
                <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface)' }}>{sec.name}</span>
              </div>
              {sec.services.map((s) => (
                <ServiceItem key={s.id} service={s} onClick={() => pickService(s)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Шаг 3: выбор даты (макет 8746-41318) ───────────────────────────────────
  if (step === 'date') {
    const today = dayjs().startOf('day')
    const months = [0, 1, 2].map((o) => today.startOf('month').add(o, 'month'))
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar title={rescheduleId ? 'Новая дата' : 'Выберите дату'} subtitle={selectedService?.name} onBack={() => setStep(rescheduleId ? 'success' : 'service')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!availabilityLoaded && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Загружаем…</div>
          )}
          {availabilityLoaded && months.map((monthStart) => (
            <div key={monthStart.format('YYYY-MM')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ paddingLeft: 6 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 4px 14px 8px', borderRadius: 100 }}>
                  <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-secondary)' }}>{monthStart.format('MMMM YYYY')}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%' }}>
                {DAY_NAMES.map((d) => (
                  <div key={d} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.body2Medium, color: 'var(--color-on-surface-secondary)' }}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {buildMonthGrid(monthStart).flat().map((day, i) => {
                  if (!day) return <div key={`e${i}`} style={{ minHeight: 56 }} />
                  const val = day.format('YYYY-MM-DD')
                  const isPast = day.isBefore(today)
                  const isToday = day.isSame(today)
                  const isSelected = val === date
                  const working = isWorkingDay(day, schedule)
                  const disabled = isPast || !working
                  const isWeekend = (day.day() || 7) >= 6
                  const hasSlots = availability[val]
                  let bg = 'transparent'
                  if (isSelected || hasSlots === true) bg = 'var(--color-active-surface)'
                  else if (hasSlots === false) bg = 'var(--color-secondary-surface-muted)'
                  const dim = isPast || (!working && hasSlots !== true && !isSelected)
                  const color = isWeekend
                    ? dim ? 'var(--color-error-element-muted)' : 'var(--color-error-surface-accented)'
                    : dim ? 'var(--color-interactive-element-muted)' : 'var(--color-interactive-element-accented)'
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => !disabled && handleSelectDate(day)}
                      disabled={disabled}
                      style={{
                        minHeight: 56,
                        padding: '8px 4px',
                        borderRadius: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        ...text.callout1,
                        background: bg,
                        color,
                        border: 'none',
                        cursor: disabled ? 'default' : 'pointer',
                        position: 'relative',
                      }}
                    >
                      {day.date()}
                      {isToday && (
                        <span style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 2, borderRadius: 1, background: 'var(--color-error-surface-accented)' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Шаг 4: выбор времени (макет 8746-41317) ────────────────────────────────
  if (step === 'time') {
    const selectedDayjs = dayjs(date)
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar title="Выберите время" subtitle={selectedService?.name} onBack={() => setStep('date')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" onClick={() => setStep('date')} style={{ ...listItemStyle, gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedDayjs.format('D MMMM, dd')}
              </div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
            </div>
            <EditIcon />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <div style={{ padding: '24px 8px 8px' }}>
              <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>ДОСТУПНЫЕ СЛОТЫ</span>
            </div>
            {slotsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Загружаем…</div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Нет свободных слотов</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {slots.map((s) => {
                  const isSel = time === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSlotTap(s)}
                      style={{
                        height: 69,
                        padding: '12px 0',
                        borderRadius: 18,
                        background: isSel ? 'var(--color-active-surface)' : 'var(--color-surface-transparent)',
                        color: isSel ? 'var(--color-interactive-element-accented)' : 'var(--color-on-surface)',
                        ...text.callout1,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Напомнить за 1 час</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Бот напишет в МАХ</div>
            </div>
            <ToggleSwitch checked={remind} onChange={setRemind} aria-label="Напомнить за 1 час" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Шаг 6: выбор клиента (адресная книга) ──────────────────────────────────
  if (step === 'client') {
    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        <Toolbar title="Выберите клиента" onBack={() => setStep('confirm')} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
          {clientsLoaded && clients.length === 0 && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              Нет клиентов. Добавьте на вкладке «Клиенты».
            </div>
          )}
          {clients.map((c) => {
            const bookable = c.clientId != null
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { if (bookable) { setSelectedClient(c); setStep('confirm') } }}
                style={{ ...listItemStyle, opacity: bookable ? 1 : 0.45, cursor: bookable ? 'pointer' : 'default' }}
              >
                <ClientAvatar name={c.name} photo={c.photo} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bookable ? formatPhone(c.phone) : 'Нет аккаунта Max — запись недоступна'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Шаг 7: успех «Запись создана!» (макет 8746-41315) ──────────────────────
  if (step === 'success') {
    const badge = PAYMENT_BADGE[createdBooking?.paymentStatus ?? 'UNPAID']
    const addressText = homeVisit ? address.trim() : master?.location ?? ''
    const succPrice = selectedService ? discountedPrice(selectedService.price, selectedService.discountPercent) ?? selectedService.price : 0
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 220 }}>
        {/* Шапка: зелёная галочка + «Запись создана!» + «Закрыть» */}
        <div style={{ height: 56, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, background: 'linear-gradient(149.74deg, var(--color-grad-green-vibrance-0) 7.31%, var(--color-grad-green-vibrance-100) 91.96%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcoTickCircle />
            </div>
            <div style={{ flex: 1, minWidth: 0, ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Запись создана!
            </div>
          </div>
          <button type="button" onClick={() => navigate('/bookings')} style={{ height: 44, padding: '0 10px', borderRadius: 22, background: 'var(--color-background)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, ...text.callout1, color: 'var(--color-on-surface)' }}>
            Закрыть
          </button>
        </div>

        <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Клиент */}
          {selectedClient && (
            <div style={{ ...listItemStyle, cursor: 'default' }}>
              <ClientAvatar name={selectedClient.name} photo={selectedClient.photo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedClient.name}</div>
                {selectedClient.phone && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatPhone(selectedClient.phone)}</div>
                )}
              </div>
              <UserSquareIcon size={16} />
            </div>
          )}

          {/* Адрес */}
          {addressText && (
            <div style={{ ...listItemStyle, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', wordBreak: 'break-word' }}>{addressText}</div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{homeVisit ? 'Адрес выезда' : 'Адрес мастера'}</div>
              </div>
              <LocationIcon />
            </div>
          )}

          {/* Услуга + статус оплаты */}
          {selectedService && (
            <div style={{ ...listItemStyle, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedService.name}</div>
                  {selectedService.description && (
                    <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{selectedService.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(succPrice)}</span>
                  <span style={{ ...text.label2Caps, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', borderRadius: 8, background: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* Дата */}
          <div style={{ ...listItemStyle, cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{dayjs(date).format('D MMMM, dd')}</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
            </div>
            <EditIcon />
          </div>

          {/* Время */}
          <div style={{ ...listItemStyle, cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{time}</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{remind ? 'Напомним за 1 час' : 'Без напоминания'}</div>
            </div>
            <EditIcon />
          </div>
        </div>

        {/* Футер: «Добавить в календарь» + Перенести / Чат / Отменить */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--color-background)', padding: '8px 12px calc(48px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button type="button" onClick={handleAddToCalendar} style={{ ...chipStyle, width: '100%' }}>
            <CalendarIcon />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Добавить в календарь</span>
          </button>
          <div style={{ display: 'flex', gap: 4, width: '100%' }}>
            <button type="button" onClick={handleReschedule} style={{ ...chipStyle, flex: 1, minWidth: 0 }}>
              <RepeatIcon />
              <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Перенести</span>
            </button>
            <button type="button" onClick={() => navigate('/clients')} style={{ ...chipStyle, flex: 1, minWidth: 0 }}>
              <MessageTextIcon />
              <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Чат</span>
            </button>
            <button type="button" onClick={() => { void handleCancelBooking() }} style={{ ...chipStyle, flex: 1, minWidth: 0, color: 'var(--color-error-surface-accented)' }}>
              <CloseCircleIcon />
              <span style={{ ...text.caption2, color: 'var(--color-error-surface-accented)' }}>Отменить</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Шаг 5: подтверждение (макет 8792-51136) ────────────────────────────────
  const sDPrice = selectedService ? discountedPrice(selectedService.price, selectedService.discountPercent) : null
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        title="Подтверждение"
        onBack={() => setStep('time')}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
            <button type="button" onClick={() => navigate('/bookings')} style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', ...text.callout1, color: 'var(--color-on-surface)' }}>
              Закрыть
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Клиент (макет 8748-52035): не выбран → «Выбрать клиента / из списка» без аватара;
            выбран → аватар + имя + телефон. Справа всегда user-square. */}
        <button type="button" onClick={() => setStep('client')} style={listItemStyle}>
          {selectedClient && <ClientAvatar name={selectedClient.name} photo={selectedClient.photo} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedClient ? selectedClient.name : 'Выбрать клиента'}
            </div>
            {selectedClient ? (
              selectedClient.phone && (
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatPhone(selectedClient.phone)}
                </div>
              )
            ) : (
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>из списка</div>
            )}
          </div>
          <UserSquareIcon size={16} />
        </button>

        {/* Адрес выезда — только для мастера на выезде. Инлайн-поле с саджестами Яндекса (без отдельного экрана). */}
        {homeVisit && (
          <AddressSuggestField
            value={address}
            onChange={setAddress}
            label="Адрес выезда"
            placeholder="Город, улица, дом, квартира…"
          />
        )}

        {/* Услуга */}
        {selectedService && (
          <div style={{ ...listItemStyle, cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedService.name}</div>
                {selectedService.description && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                    {selectedService.description}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(sDPrice ?? selectedService.price)}</span>
                {sDPrice !== null && (
                  <span style={{ ...text.caption2, color: 'var(--color-on-surface-muted)', textDecoration: 'line-through' }}>{formatPrice(selectedService.price)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Дата */}
        <button type="button" onClick={() => setStep('date')} style={listItemStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{dayjs(date).format('D MMMM, dd')}</div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
          </div>
          <EditIcon />
        </button>

        {/* Время */}
        <button type="button" onClick={() => setStep('time')} style={listItemStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{time}</div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{remind ? 'Напомним за 1 час' : 'Без напоминания'}</div>
          </div>
          <EditIcon />
        </button>

        {error && (
          <div style={{ ...text.caption1, color: 'var(--color-error-surface-accented)', padding: '0 8px' }}>{error}</div>
        )}
      </div>

      {/* Кнопка «Записать» */}
      <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => { void handleSave() }}
          style={{
            width: '100%',
            height: 60,
            borderRadius: 20,
            border: 'none',
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            ...text.callout1,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
            color: canSave ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
          }}
        >
          <CalendarEditIcon />
          {saving ? 'Записываем…' : 'Записать'}
        </button>
      </div>
    </div>
  )
}

const listItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--color-surface-transparent)',
  borderRadius: 20,
  padding: '16px 20px',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
}

const chipStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'var(--color-surface-transparent)',
  borderRadius: 18,
  padding: '12px 8px',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-active-element)',
}

const PAYMENT_BADGE: Record<Booking['paymentStatus'], { label: string; bg: string; color: string }> = {
  UNPAID: { label: 'НЕ ОПЛАЧЕНО', bg: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)' },
  DEPOSIT_PAID: { label: 'ДЕПОЗИТ', bg: 'var(--color-warning-surface-lite)', color: 'var(--color-on-warning-surface-lite)' },
  PAID: { label: 'ОПЛАЧЕНО', bg: 'var(--color-success-surface-lite)', color: 'var(--color-on-success-surface-lite)' },
}

function ServiceItem({ service, onClick }: { service: Service; onClick: () => void }) {
  const dPrice = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = dPrice !== null
  return (
    <button type="button" onClick={onClick} style={listItemStyle}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {service.name}
            </span>
          </div>
          {service.description && (
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
              {service.description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(dPrice ?? service.price)}</span>
          {hasDiscount && (
            <span style={{ ...text.caption2, color: 'var(--color-on-surface-muted)', textDecoration: 'line-through' }}>{formatPrice(service.price)}</span>
          )}
        </div>
      </div>
      <ArrowRightIcon />
    </button>
  )
}

function DiscountBadge() {
  return (
    <span style={{ flexShrink: 0, height: 20, padding: '0 6px', boxSizing: 'border-box', borderRadius: 4, background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)', ...text.label3Caps, lineHeight: '20px' }}>
      % скидки
    </span>
  )
}

function Toolbar({ title, subtitle, onBack, trailing }: { title: string; subtitle?: string; onBack: () => void; trailing?: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px' }}>
      <PillButton onClick={onBack} ariaLabel="Назад">
        <ArrowLeftIcon />
      </PillButton>
      <div style={{ position: 'absolute', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</div>
        {subtitle && <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{subtitle}</div>}
      </div>
      {trailing ?? <div style={{ width: 44 }} />}
    </div>
  )
}

function PillButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
      <button type="button" onClick={onClick} aria-label={ariaLabel} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)' }}>
        {children}
      </button>
    </div>
  )
}

function CategoryAvatar({ photo, uncategorized }: { photo: string | null; uncategorized: boolean }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, overflow: 'hidden', background: photo ? 'var(--color-surface)' : uncategorized ? VIOLET_GRADIENT : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {photo ? (
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <FolderIcon color={uncategorized ? '#FFFFFF' : 'var(--color-on-surface-secondary)'} />
      )}
    </div>
  )
}

function ClientAvatar({ name, photo }: { name: string; photo: string | null }) {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, overflow: 'hidden', background: photo ? 'var(--color-surface)' : VIOLET_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {photo ? (
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ ...text.label3Caps, color: 'var(--color-on-surface)' }}>{initials(name)}</span>
      )}
    </div>
  )
}

function FolderIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18.3333 9.16667V14.1667C18.3333 17.5 17.5 18.3333 14.1667 18.3333H5.83333C2.5 18.3333 1.66667 17.5 1.66667 14.1667V5.83333C1.66667 2.5 2.5 1.66667 5.83333 1.66667H7.08333C8.33333 1.66667 8.60833 2.03333 9.08333 2.66667L10.3333 4.33333C10.65 4.75 10.8333 5 11.6667 5H14.1667C17.5 5 18.3333 5.83333 18.3333 9.16667Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M11.5 21c5.246 0 9.5-4.254 9.5-9.5S16.746 2 11.5 2 2 6.254 2 11.5 6.254 21 11.5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22 22-2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5.5 3L10.5 8L5.5 13" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/edit-2 (16×16).
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/user-square.
function UserSquareIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12.0933 14.4133C11.5067 14.5867 10.8133 14.6667 10 14.6667H6C5.18667 14.6667 4.49333 14.5867 3.90667 14.4133C4.05333 12.68 5.83333 11.3133 8 11.3133C10.1667 11.3133 11.9467 12.68 12.0933 14.4133Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 1.33333H6C2.66667 1.33333 1.33333 2.66667 1.33333 6V10C1.33333 12.52 2.09333 13.9 3.90667 14.4133C4.05333 12.68 5.83333 11.3133 8 11.3133C10.1667 11.3133 11.9467 12.68 12.0933 14.4133C13.9067 13.9 14.6667 12.52 14.6667 10V6C14.6667 2.66667 13.3333 1.33333 10 1.33333ZM8 9.44666C6.68 9.44666 5.61333 8.37334 5.61333 7.05334C5.61333 5.73334 6.68 4.66667 8 4.66667C9.32 4.66667 10.3867 5.73334 10.3867 7.05334C10.3867 8.37334 9.32 9.44666 8 9.44666Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/calendar-edit (24×24) — наследует цвет текста кнопки.
function CalendarEditIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 2V5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.21 15.77L15.67 19.31C15.53 19.45 15.4 19.71 15.37 19.9L15.18 21.25C15.11 21.74 15.45 22.08 15.94 22.01L17.29 21.82C17.48 21.79 17.75 21.66 17.88 21.52L21.42 17.98C22.03 17.37 22.32 16.66 21.42 15.76C20.53 14.87 19.82 15.16 19.21 15.77Z" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.7 16.28C19 17.36 19.84 18.2 20.92 18.5" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5V12" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/bold/tick-circle (24×24) — белая на зелёном градиенте.
function IcoTickCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm-1.13-7.83 4.95-4.95a.749.749 0 0 0-.53-1.28.74.74 0 0 0-.53.22l-4.42 4.42-1.62-1.62a.754.754 0 0 0-1.06 0 .749.749 0 0 0 0 1.06l2.15 2.15c.15.15.34.22.53.22.19 0 .38-.07.53-.22Z" fill="var(--color-on-primary-surface)" />
    </svg>
  )
}

// vuesax/linear/location (16×16).
function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 8.95C9.149 8.95 10.08 8.019 10.08 6.87C10.08 5.722 9.149 4.79 8 4.79C6.851 4.79 5.92 5.722 5.92 6.87C5.92 8.019 6.851 8.95 8 8.95Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5" />
      <path d="M2.413 5.66C3.727 -0.107 12.28 -0.1 13.587 5.667C14.353 9.054 12.247 11.92 10.4 13.694C9.06 14.987 6.94 14.987 5.593 13.694C3.753 11.92 1.647 9.047 2.413 5.66Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.5" />
    </svg>
  )
}

// vuesax/linear/repeat (24×24) — наследует цвет чипа.
function RepeatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M2.83 14.32V7.6c0-2.94 2.4-5.34 5.34-5.34h7.66" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.7 4.43 2.13-2.13L13.7.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.17 9.68v6.72c0 2.94-2.4 5.34-5.34 5.34H8.17" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.3 19.57 8.17 21.7l2.13 2.13" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/message-text (24×24).
function MessageTextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 19H8c-4 0-6-1-6-6V8c0-4 2-6 6-6h8c4 0 6 2 6 6v5c0 4-2 6-6 6h-.5c-.31 0-.61.15-.8.4l-1.5 2c-.66.88-1.74.88-2.4 0l-1.5-2c-.16-.22-.53-.4-.8-.4Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h10M7 13h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/close-circle (24×24).
function CloseCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.17 14.83 14.83 9.17M14.83 14.83 9.17 9.17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// vuesax/linear/calendar (24×24).
function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6947 13.7H15.7037" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9955 13.7H12.0045" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.29431 13.7H8.30329" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
