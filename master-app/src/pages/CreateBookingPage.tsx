import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { categoriesApi, servicesApi } from '@/api/services.api'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import { useAuthStore } from '@/store/auth.store'
import type { Category, Schedule, Service } from '@/types'
import { UNCATEGORIZED_CATEGORY_ID, discountedPrice, formatPrice } from '@/types'
import { text } from '@/styles/typography'
import ToggleSwitch from '@/components/ToggleSwitch'

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
  const startOffset = (monthStart.day() || 7) - 1 // ISO: Пн=0 … Вс=6
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

// Флоу создания записи мастером (макеты 8746-41312/41313/41318/41317):
// category → service → date → time → [клиент/адрес — по следующему макету].
export default function CreateBookingPage() {
  const navigate = useNavigate()
  const master = useAuthStore((s) => s.master)
  const schedule = master?.schedule ?? null

  const [step, setStep] = useState<'category' | 'service' | 'date' | 'time'>('category')
  const [categories, setCategories] = useState<Category[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [remind, setRemind] = useState(true)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([categoriesApi.list(), servicesApi.list()])
      .then(([cats, svcs]) => {
        setCategories(cats)
        setAllServices(svcs)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  // Доступность дней (3 месяца) для выбранной услуги.
  useEffect(() => {
    if (!master?.id || !serviceId) return
    const from = dayjs().format('YYYY-MM-DD')
    const to = dayjs().startOf('month').add(2, 'month').endOf('month').format('YYYY-MM-DD')
    setAvailabilityLoaded(false)
    mastersApi.getAvailability(master.id, from, to, serviceId)
      .then((a) => { setAvailability(a); setAvailabilityLoaded(true) })
      .catch(() => setAvailabilityLoaded(true))
  }, [master?.id, serviceId])

  // Слоты выбранного дня.
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

  const handleSave = async () => {
    if (!master || !serviceId || !date || !time) return
    setSaving(true)
    try {
      await bookingsApi.create({ masterId: master.id, serviceId, date, time })
      navigate('/bookings')
    } finally {
      setSaving(false)
    }
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
              style={{
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
              }}
            >
              <CategoryAvatar photo={item.photo} uncategorized={item.isUncat} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      ...text.callout1,
                      color: 'var(--color-on-surface)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  {item.hasDiscount && <DiscountBadge />}
                </div>
                {item.description && (
                  <div
                    style={{
                      ...text.caption2,
                      color: 'var(--color-on-surface-secondary)',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    }}
                  >
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
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-on-surface)',
                  fontFamily: 'inherit',
                  fontSize: 18,
                  lineHeight: '24px',
                  fontWeight: 400,
                  padding: 0,
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Очистить"
                  onClick={() => { setQuery(''); searchInputRef.current?.focus() }}
                  style={{ width: 20, height: 20, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-secondary)' }}
                >
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
        <Toolbar title="Выберите дату" subtitle={selectedService?.name} onBack={() => setStep('service')} />
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
  const selectedDayjs = dayjs(date)
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar title="Выберите время" subtitle={selectedService?.name} onBack={() => setStep('date')} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Карточка выбранной даты → назад к выбору даты */}
        <button
          type="button"
          onClick={() => setStep('date')}
          style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedDayjs.format('D MMMM, dd')}
            </div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
          </div>
          <EditIcon />
        </button>

        {/* Слоты */}
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
                    onClick={() => setTime(s)}
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

        {/* Напоминание */}
        <div style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>Напомнить за 1 час</div>
            <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Бот напишет в МАХ</div>
          </div>
          <ToggleSwitch checked={remind} onChange={setRemind} aria-label="Напомнить за 1 час" />
        </div>

        {/* Интерим-кнопка сохранения (до экранов «клиент/адрес» и «подтверждение»). */}
        <button
          type="button"
          disabled={saving || !time}
          onClick={() => { void handleSave() }}
          style={{
            width: '100%',
            height: 60,
            marginTop: 16,
            borderRadius: 20,
            border: 'none',
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...text.callout1,
            cursor: saving || !time ? 'default' : 'pointer',
            background: saving || !time ? 'var(--color-secondary-surface-muted)' : 'var(--color-primary-surface)',
            color: saving || !time ? 'var(--color-interactive-element-muted)' : 'var(--color-on-primary-surface)',
          }}
        >
          {saving ? 'Сохраняем...' : 'Сохранить запись'}
        </button>
      </div>
    </div>
  )
}

// Карточка услуги (макет 8746-41313): название, описание, цена (со скидкой — зачёркнутая старая).
function ServiceItem({ service, onClick }: { service: Service; onClick: () => void }) {
  const dPrice = discountedPrice(service.price, service.discountPercent)
  const hasDiscount = dPrice !== null
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
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
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...text.callout1, color: 'var(--color-on-surface)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {service.name}
            </span>
          </div>
          {service.description && (
            <div
              style={{
                ...text.caption2,
                color: 'var(--color-on-surface-secondary)',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
              }}
            >
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
    <span
      style={{
        flexShrink: 0,
        height: 20,
        padding: '0 6px',
        boxSizing: 'border-box',
        borderRadius: 4,
        background: 'var(--color-error-surface-lite)',
        color: 'var(--color-on-error-surface-lite)',
        ...text.label3Caps,
        lineHeight: '20px',
      }}
    >
      % скидки
    </span>
  )
}

// ─── Тулбар: назад-пилюля слева, заголовок (+опц. подзаголовок) по центру, опц. trailing ──
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
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)' }}
      >
        {children}
      </button>
    </div>
  )
}

function CategoryAvatar({ photo, uncategorized }: { photo: string | null; uncategorized: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        flexShrink: 0,
        overflow: 'hidden',
        background: photo ? 'var(--color-surface)' : uncategorized ? VIOLET_GRADIENT : 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <FolderIcon color={uncategorized ? '#FFFFFF' : 'var(--color-on-surface-secondary)'} />
      )}
    </div>
  )
}

function FolderIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M18.3333 9.16667V14.1667C18.3333 17.5 17.5 18.3333 14.1667 18.3333H5.83333C2.5 18.3333 1.66667 17.5 1.66667 14.1667V5.83333C1.66667 2.5 2.5 1.66667 5.83333 1.66667H7.08333C8.33333 1.66667 8.60833 2.03333 9.08333 2.66667L10.3333 4.33333C10.65 4.75 10.8333 5 11.6667 5H14.1667C17.5 5 18.3333 5.83333 18.3333 9.16667Z"
        stroke={color}
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
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

// vuesax/linear/edit-2 (16×16) — карандаш на карточке даты.
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8.84 2.4L3.36667 8.19333C3.16 8.41333 2.96 8.84667 2.92 9.14667L2.67333 11.3067C2.58667 12.0867 3.14667 12.62 3.92 12.4867L6.06667 12.12C6.36667 12.0667 6.78667 11.8467 6.99333 11.62L12.4667 5.82667C13.4133 4.82667 13.84 3.68667 12.3667 2.29333C10.9 0.913333 9.78667 1.4 8.84 2.4Z" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.92667 3.36667C8.21333 5.20667 9.70667 6.61333 11.56 6.8" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14.6667H14" stroke="var(--color-interactive-element-secondary)" strokeWidth="1.75" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
