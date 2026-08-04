import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ru'
import { servicesApi } from '@/api/services.api'
import { bookingsApi } from '@/api/bookings.api'
import { mastersApi } from '@/api/masters.api'
import { clientsApi } from '@/api/clients.api'
import { subscriptionApi, type SubscriptionState } from '@/api/subscription.api'
import { useAuthStore } from '@/store/auth.store'
import type { Booking, Client, Schedule, Service } from '@/types'
import { discountedPrice, formatPrice, formatDuration, formatDurationHuman, bookingDuration, bookingTotal, bookingServiceItems } from '@/types'
import { text } from '@/styles/typography'
import { openAddToCalendar } from '@/lib/calendar'
import { scrollPageTop } from '@/lib/scroll'
import { clearBookingDraft, readBookingDraft, rememberBookingReturn } from '@/lib/subscriptionReturn'
import ToggleSwitch from '@/components/ToggleSwitch'
import WheelPicker, { type WheelPickerOption } from '@/components/WheelPicker'
import { FloatingField } from '@/components/onboardingShared'
import BookingAddressEditor from '@/components/BookingAddressEditor'
import ConfirmDialog from '@/components/ConfirmDialog'
import { BookingFlowBottomButton, BookingFlowPillButton, BookingFlowToolbar } from '@/components/BookingFlowShell'
import ServiceEditorPortal, { type ServiceEditorTarget } from '@/components/ServiceEditorPortal'
import { bookingRouteAddress, formatBookingAddress, yandexRouteUrl, type BookingAddressDetails } from '@/lib/bookingAddress'
import { openExternalLink } from '@/lib/bridge'
import BookingAddressText from '@/components/BookingAddressText'
import { metricErrorType, trackEvent } from '@/lib/metrics'

dayjs.locale('ru')
dayjs.extend(utc)
dayjs.extend(timezone)

const VIOLET_GRADIENT = 'linear-gradient(239.74deg, var(--color-grad-violet-100) 5.83%, var(--color-grad-violet-0) 90.48%)'
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Палитра цвета записи (hex) — выбирается мастером, показывается в расписании.
// Первый — дефолт (зелёный, как в макете 10111-37975).
const BOOKING_COLORS = ['#1F9432', '#007AFE', '#F0AF2D', '#CE4259', '#8E5BE8', '#00B3A4', '#FF667F', '#6E6F71'] as const

type BookingSubscriptionDraft = {
  step: 'confirm' | 'package'
  serviceId: string
  selectedServiceIds: string[]
  date: string
  time: string
  remind: boolean
  color: string
  durationOverride: number | null
  totalOverride: string | null
  serviceOverrides: Record<string, { duration?: number; price?: number }>
  selectedClient: Client | null
  outbound: boolean
  address: string
  addressDetails: BookingAddressDetails
  addressComment: string
  miscPrices: Record<string, string>
  rescheduleId: string | null
  timeOnly: boolean
  packageMode: 'days' | 'weeks'
  packageSlots: { date: string; time: string }[]
  weekdays: number[]
  weekTime: string
}

// Шаг сетки свободного времени мастера (минуты).
const TIME_STEP_MIN = 15
const DEFAULT_TZ = 'Europe/Moscow'

const hhmmToMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const minToHhmm = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Свободные времена мастера: от начала до конца рабочего дня с шагом TIME_STEP_MIN,
// исключая обед [breakStart, breakEnd). Мастер ставит любое время в этих рамках.
function buildDayTimes(schedule: Schedule | null): string[] {
  if (!schedule) return []
  const start = hhmmToMin(schedule.startTime)
  const end = hhmmToMin(schedule.endTime)
  const bStart = schedule.breakStart ? hhmmToMin(schedule.breakStart) : null
  const bEnd = schedule.breakEnd ? hhmmToMin(schedule.breakEnd) : null
  const times: string[] = []
  for (let m = start; m < end; m += TIME_STEP_MIN) {
    if (bStart !== null && bEnd !== null && m >= bStart && m < bEnd) continue
    times.push(minToHhmm(m))
  }
  return times
}

function currentMasterWall(masterTimezone: string | null | undefined): dayjs.Dayjs {
  try {
    const now = dayjs().tz(masterTimezone || DEFAULT_TZ)
    return now.isValid() ? now : dayjs().tz(DEFAULT_TZ)
  } catch {
    return dayjs().tz(DEFAULT_TZ)
  }
}

// Дни недели (ISO 1=Пн … 7=Вс) для режима абонемента «По неделям».
const WEEKDAYS = [
  { iso: 1, label: 'Пн' }, { iso: 2, label: 'Вт' }, { iso: 3, label: 'Ср' },
  { iso: 4, label: 'Чт' }, { iso: 5, label: 'Пт' }, { iso: 6, label: 'Сб' }, { iso: 7, label: 'Вс' },
]

// N приёмов абонемента раскладываются по выбранным дням недели вперёд (от завтра).
function generateWeeklySlots(weekdays: number[], time: string, count: number): { date: string; time: string }[] {
  if (!time || weekdays.length === 0 || count <= 0) return []
  const res: { date: string; time: string }[] = []
  let d = dayjs().add(1, 'day')
  for (let guard = 0; res.length < count && guard < 400; guard++) {
    if (weekdays.includes(d.day() || 7)) res.push({ date: d.format('YYYY-MM-DD'), time })
    d = d.add(1, 'day')
  }
  return res
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

function maskPhoneInput(raw: string, prev: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  digits = digits.slice(0, 11)
  const prevDigits = prev.replace(/\D/g, '')
  if (digits === prevDigits && raw.length < prev.length) digits = prevDigits.slice(0, -1)
  if (!digits) return ''
  const n = digits.startsWith('7') ? digits : '7' + digits
  let result = '+7'
  if (n.length > 1) result += ' (' + n.slice(1, 4)
  if (n.length >= 4) result += ') ' + n.slice(4, 7)
  if (n.length >= 7) result += '-' + n.slice(7, 9)
  if (n.length >= 9) result += '-' + n.slice(9, 11)
  return result
}

// Флоу создания записи мастером (макеты 8746-41313/41318/41317, 8792-51136):
// service → date → time → confirm (клиент/адрес/итог) → запись.
export default function CreateBookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const master = useAuthStore((s) => s.master)
  const schedule = master?.schedule ?? null
  const homeVisit = !!master?.homeVisit
  const returningFromSubscription = (location.state as { subscriptionReturn?: boolean } | null)?.subscriptionReturn === true
  const [restoredDraft] = useState(() => returningFromSubscription
    ? readBookingDraft<BookingSubscriptionDraft>(master?.id)
    : null)
  useEffect(() => {
    if (!returningFromSubscription) clearBookingDraft()
  }, [returningFromSubscription])

  // Вход во флоу через navigation state:
  //  • { rescheduleId, serviceId } — перенос записи (сразу шаг даты),
  //  • { rescheduleId, serviceId, editTime, date } — изменить только время (сразу шаг времени, дата прежняя),
  //  • { client } — с карточки клиента (клиент предвыбран, флоу с шага выбора услуги).
  const rescheduleInit = location.state as { rescheduleId?: string; serviceId?: string; client?: Client; editTime?: boolean; date?: string } | null
  const fixedDateFromSchedule = !rescheduleInit?.rescheduleId && !!rescheduleInit?.date

  const [step, setStep] = useState<'service' | 'date' | 'time' | 'package' | 'confirm' | 'client' | 'clientAdd' | 'address' | 'success' | 'color'>(
    restoredDraft?.step ?? (rescheduleInit?.rescheduleId
      ? (rescheduleInit?.editTime ? 'time' : 'date')
      : 'confirm'),
  )
  const [allServices, setAllServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoaded, setClientsLoaded] = useState(false)
  const [clientSearchMode, setClientSearchMode] = useState(false)
  const [clientQuery, setClientQuery] = useState('')
  const clientSearchInputRef = useRef<HTMLInputElement>(null)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientPhoneError, setNewClientPhoneError] = useState<string | null>(null)
  const [newClientError, setNewClientError] = useState<string | null>(null)
  const [newClientSaving, setNewClientSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Шаг выбора услуги (макет 10122-41126): таб-фильтр, staged-выбор (radio),
  // подтверждение кнопкой «Выбрать». «Оказывались клиенту» — услуги из прошлых
  // записей выбранного клиента (грузим записи мастера лениво при входе на шаг).
  const [serviceTab, setServiceTab] = useState<'all' | 'client'>('all')
  // Мультивыбор услуг в пикере (staged) — фиксируется кнопкой «Выбрать».
  const [stagedIds, setStagedIds] = useState<string[]>([])
  const [masterBookings, setMasterBookings] = useState<Booking[]>([])
  const [masterBookingsLoaded, setMasterBookingsLoaded] = useState(false)
  // Инлайн-редактор услуги (карандаш/«+» на шаге выбора) — правит услугу, не уводя
  // из флоу записи (макет «Редактирование услуги» 10130-51982). null → закрыт.
  const [editorTarget, setEditorTarget] = useState<ServiceEditorTarget | null>(null)

  // Первичная услуга (services[0] / услуга абонемента / услуга при переносе).
  const [serviceId, setServiceId] = useState(restoredDraft?.serviceId ?? rescheduleInit?.serviceId ?? '')
  // Услуги обычной записи (мультиуслуги). Абонемент/перенос — одиночная (serviceId).
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(restoredDraft?.selectedServiceIds ?? (rescheduleInit?.serviceId ? [rescheduleInit.serviceId] : []))
  const [date, setDate] = useState(restoredDraft?.date ?? rescheduleInit?.date ?? '')
  const [time, setTime] = useState(restoredDraft?.time ?? '')
  const [remind, setRemind] = useState(restoredDraft?.remind ?? true)
  const [color, setColor] = useState<string>(restoredDraft?.color ?? BOOKING_COLORS[0])
  // Ручная длительность записи (null → сумма длительностей услуг). Мастер может выбрать
  // любое значение из колеса (шаг 5 мин, макет 10302-42986). Сбрасывается при смене услуг.
  const [durationOverride, setDurationOverride] = useState<number | null>(restoredDraft?.durationOverride ?? null)
  const [durationPickerOpen, setDurationPickerOpen] = useState(false)
  // Ручной итог записи (строка рублей; пусто = считаем сумму по услугам). Мастер может
  // задать любую стоимость заказа — она не обязана равняться сумме услуг.
  const [totalOverride, setTotalOverride] = useState<string | null>(restoredDraft?.totalOverride ?? null)
  // Правки услуги «для этого заказа» (макет 10138-40554): длительность (мин) и цена
  // (копейки) конкретной услуги в этой записи. Каталог услуг мастера не меняется.
  const [serviceOverrides, setServiceOverrides] = useState<Record<string, { duration?: number; price?: number }>>(restoredDraft?.serviceOverrides ?? {})
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(restoredDraft?.selectedClient ?? rescheduleInit?.client ?? null)
  // Выезд к клиенту (доступно, только если мастер работает на выезде). false — «Принимаю у себя».
  const [outbound, setOutbound] = useState(restoredDraft?.outbound ?? false)
  const [address, setAddress] = useState(restoredDraft?.address ?? '')
  const [addressDetails, setAddressDetails] = useState<BookingAddressDetails>(restoredDraft?.addressDetails ?? { floor: '', apartment: '', intercom: '' })
  const [addressComment, setAddressComment] = useState(restoredDraft?.addressComment ?? '')
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [addressReturnStep, setAddressReturnStep] = useState<'confirm' | 'package'>('confirm')
  // Суммы для услуг «Прочее» (isMisc) — рубли-строки по serviceId, вводятся в форме-сводке.
  const [miscPrices, setMiscPrices] = useState<Record<string, string>>(restoredDraft?.miscPrices ?? {})
  // Слоты нужны только для сеансов абонемента (обычная запись — свободное время).
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Показ предупреждения о пересечении времени (свободный выбор времени мастером).
  const [overlapWarn, setOverlapWarn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(restoredDraft?.rescheduleId ?? rescheduleInit?.rescheduleId ?? null)
  // true — вход «изменить только время»: стартуем на шаге времени, back минует шаг даты.
  const [timeOnly, setTimeOnly] = useState(restoredDraft?.timeOnly ?? !!rescheduleInit?.editTime)
  const [pendingReschedule, setPendingReschedule] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  // Пейволл: при истёкшем триале/неоплате подтверждение записи ведёт на экран
  // «Подписка» (expired-вариант, макет 10256-55751). Ошибка загрузки → не блочим.
  const [subState, setSubState] = useState<SubscriptionState | null>(null)
  useEffect(() => {
    subscriptionApi.getMe().then(setSubState).catch(() => {})
  }, [])

  // Абонемент (Service.sessionsCount > 1): режим выбора слотов и сами слоты.
  const [packageMode, setPackageMode] = useState<'days' | 'weeks'>(restoredDraft?.packageMode ?? 'days')
  const [packageSlots, setPackageSlots] = useState<{ date: string; time: string }[]>(restoredDraft?.packageSlots ?? [])
  const [packageSessionIndex, setPackageSessionIndex] = useState<number | null>(null)
  const [weekdays, setWeekdays] = useState<number[]>(restoredDraft?.weekdays ?? [])
  const [weekTime, setWeekTime] = useState(restoredDraft?.weekTime ?? '')
  const [weekTimeOptions, setWeekTimeOptions] = useState<string[]>([])

  const reloadServices = () =>
    servicesApi.list()
      .then((svcs) => {
        setAllServices(svcs)
        setLoaded(true)
        if (restoredDraft) clearBookingDraft()
      })
      .catch(() => setLoaded(true))

  useEffect(() => {
    void reloadServices()
    clientsApi.list().then((c) => { setClients(c); setClientsLoaded(true) }).catch(() => setClientsLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Слоты грузим только для выбора времени сеанса абонемента (обычная запись и
  // перенос — свободное время в рамках рабочего дня, без расчёта слотов).
  useEffect(() => {
    if (master?.id && serviceId && date && packageSessionIndex !== null) {
      setSlotsLoading(true)
      mastersApi.getSlots(master.id, date, serviceId)
        .then(setSlots)
        .catch(() => setSlots([]))
        .finally(() => setSlotsLoading(false))
    } else {
      setSlots([])
    }
  }, [master?.id, serviceId, date, packageSessionIndex])

  // «Оказывались клиенту» нужен список прошлых записей мастера — грузим лениво,
  // только когда мастер открыл шаг выбора услуги.
  useEffect(() => {
    if (step !== 'service' || masterBookingsLoaded) return
    bookingsApi.list()
      .then((b) => { setMasterBookings(b); setMasterBookingsLoaded(true) })
      .catch(() => setMasterBookingsLoaded(true))
  }, [step, masterBookingsLoaded])

  useEffect(() => {
    if (searchMode) searchInputRef.current?.focus()
  }, [searchMode])

  useEffect(() => {
    if (clientSearchMode) clientSearchInputRef.current?.focus()
  }, [clientSearchMode])

  // Шаги флоу (услуга/дата/время/подтверждение) — один роут /bookings/new.
  // Сбрасываем прокрутку при смене шага, иначе следующий шаг открывается «промотанным».
  useEffect(() => { scrollPageTop() }, [step])

  // Абонемент «По неделям»: сетка времён по ближайшему рабочему дню (как шаблон).
  useEffect(() => {
    if (step !== 'package' || packageMode !== 'weeks' || !master?.id || !serviceId) return
    const wd = schedule?.workingDays ?? [1, 2, 3, 4, 5, 6, 7]
    let d = dayjs().add(1, 'day')
    for (let i = 0; i < 14 && !wd.includes(d.day() || 7); i++) d = d.add(1, 'day')
    mastersApi.getSlots(master.id, d.format('YYYY-MM-DD'), serviceId)
      .then(setWeekTimeOptions)
      .catch(() => setWeekTimeOptions([]))
  }, [step, packageMode, master?.id, serviceId, schedule])

  // Плоский список услуг мастера (категорий больше нет). Показываем только
  // активные; «Прочее» (isMisc) остаётся в списке — для записи не из каталога.
  const q = query.trim().toLowerCase()
  const services = useMemo<Service[]>(() => {
    const active = allServices.filter((s) => s.isActive)
    if (!q) return active
    return active.filter((s) => s.name.toLowerCase().includes(q))
  }, [allServices, q])

  // Услуги, которые уже оказывались выбранному клиенту (по прошлым записям мастера).
  const pastServiceIds = useMemo(() => {
    const cid = selectedClient?.clientId
    if (!cid) return new Set<string>()
    return new Set(masterBookings.filter((b) => b.client.id === cid).map((b) => b.service.id))
  }, [masterBookings, selectedClient])

  const shownServices = useMemo(
    () => (serviceTab === 'client' ? services.filter((s) => pastServiceIds.has(s.id)) : services),
    [serviceTab, services, pastServiceIds],
  )

  const filteredClients = useMemo(() => {
    const clientQ = clientQuery.trim().toLowerCase()
    if (!clientQ) return clients
    const clientQDigits = clientQ.replace(/\D/g, '')
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(clientQ) ||
        (clientQDigits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(clientQDigits)),
    )
  }, [clients, clientQuery])

  const selectedService = useMemo(() => allServices.find((s) => s.id === serviceId) ?? null, [allServices, serviceId])
  const isPackageService = (selectedService?.sessionsCount ?? 1) > 1

  // Услуги обычной записи (мультиуслуги) в порядке выбора.
  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => allServices.find((s) => s.id === id)).filter((s): s is Service => !!s),
    [selectedServiceIds, allServices],
  )

  // Услуга-абонемент выбирается эксклюзивно и уводит в отдельный флоу выбора слотов.
  const pickPackageService = (s: Service) => {
    setServiceId(s.id)
    setSelectedServiceIds([s.id])
    if (!fixedDateFromSchedule) setDate('')
    setTime('')
    setPackageSlots([]); setPackageMode('days'); setPackageSessionIndex(null)
    setWeekdays([]); setWeekTime('')
    setStep('package')
  }

  // Обычные услуги: фиксируем мультивыбор и возвращаемся в форму-сводку.
  const commitServices = () => {
    setSelectedServiceIds(stagedIds)
    setServiceId(stagedIds[0] ?? '')
    setStep('confirm')
  }

  // Открыть пикер услуг из формы-сводки (текущий набор — предвыбран).
  const openServicePicker = () => { setStagedIds(selectedServiceIds); setStep('service') }

  // Убрать услугу из записи (и её индивидуальную цену «Прочее»).
  const removeService = (id: string) => {
    setSelectedServiceIds((prev) => prev.filter((x) => x !== id))
    setMiscPrices((prev) => { const next = { ...prev }; delete next[id]; return next })
  }

  const openClientSearch = () => {
    setClientQuery('')
    setClientSearchMode(true)
  }

  const closeClientSearch = () => {
    setClientQuery('')
    setClientSearchMode(false)
  }

  const pickClient = (client: Client) => {
    setSelectedClient(client)
    setClientQuery('')
    setClientSearchMode(false)
    setStep(isPackageService ? 'package' : 'confirm')
  }

  const openClientAdd = () => {
    setClientQuery('')
    setClientSearchMode(false)
    setNewClientName('')
    setNewClientPhone('')
    setNewClientPhoneError(null)
    setNewClientError(null)
    setStep('clientAdd')
  }

  const handleNewClientPhone = (value: string) => {
    setNewClientPhoneError(null)
    setNewClientError(null)
    setNewClientPhone((prev) => maskPhoneInput(value, prev))
  }

  const submitNewClient = async () => {
    if (!newClientName.trim() || newClientSaving) return
    if (newClientPhone && newClientPhone.replace(/\D/g, '').length !== 11) {
      setNewClientPhoneError('Введите номер полностью: +7 (XXX) XXX-XX-XX')
      return
    }
    setNewClientSaving(true)
    setNewClientError(null)
    try {
      const created = await clientsApi.create({ name: newClientName.trim(), phone: newClientPhone.trim() || null })
      setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)])
      setNewClientName('')
      setNewClientPhone('')
      setNewClientPhoneError(null)
      setNewClientError(null)
      pickClient(created)
    } catch {
      setNewClientError('Не удалось добавить клиента. Попробуйте ещё раз.')
    } finally {
      setNewClientSaving(false)
    }
  }

  const backFromService = () => {
    if (searchMode) {
      setSearchMode(false)
      setQuery('')
    } else {
      // Выбор услуги открывается из формы-сводки — «Назад» возвращает в неё.
      setStep('confirm')
    }
  }

  const handleSelectDate = (d: dayjs.Dayjs) => {
    setDate(d.format('YYYY-MM-DD'))
    setTime('')
    // Перенос: дальше выбор времени. Создание: возвращаемся в форму (время — отдельный ряд).
    setStep(rescheduleId ? 'time' : 'confirm')
  }

  // Услуги «Прочее» (isMisc): мастер вводит сумму по каждой в форме-сводке (miscPrices, руб.).
  const miscKopecks = (id: string) => Math.round(Number((miscPrices[id] ?? '').replace(',', '.')) * 100)
  const miscValid = (id: string) => {
    const k = miscKopecks(id)
    return (miscPrices[id] ?? '').trim() !== '' && Number.isFinite(k) && k > 0
  }
  // Цена «Прочее» может быть задана и в экране редактирования услуги (serviceOverrides).
  const allMiscValid = selectedServices.every(
    (s) => !s.isMisc || miscValid(s.id) || (serviceOverrides[s.id]?.price ?? 0) > 0,
  )

  // Позиции записи + суммарные стоимость и длительность.
  const itemPrice = (s: Service) => (s.isMisc ? miscKopecks(s.id) : discountedPrice(s.price, s.discountPercent) ?? s.price)
  // Эффективные длительность/цена услуги в этом заказе: правка мастера важнее каталога.
  const svcDuration = (s: Service) => serviceOverrides[s.id]?.duration ?? s.duration
  const svcPrice = (s: Service) => serviceOverrides[s.id]?.price ?? itemPrice(s)
  const servicesKopecks = selectedServices.reduce(
    (sum, s) => sum + (s.isMisc && !miscValid(s.id) && serviceOverrides[s.id]?.price == null ? 0 : svcPrice(s)),
    0,
  )
  // Ручной итог мастера важнее суммы услуг; пусто/невалидно → сумма по услугам.
  const manualTotal = (() => {
    if (totalOverride === null || totalOverride.trim() === '') return null
    const k = Math.round(Number(totalOverride.replace(',', '.')) * 100)
    return Number.isFinite(k) && k >= 0 ? k : null
  })()
  const totalKopecks = manualTotal ?? servicesKopecks
  // По умолчанию — сумма длительностей услуг; мастер может переопределить (durationOverride).
  const durationSum = selectedServices.reduce((sum, s) => sum + svcDuration(s), 0)
  const durationMin = durationOverride ?? durationSum
  // При смене набора услуг ручные длительность и итог сбрасываются (снова = по услугам).
  const serviceKey = selectedServiceIds.slice().sort().join(',')
  const previousServiceKey = useRef(serviceKey)
  useEffect(() => {
    if (previousServiceKey.current === serviceKey) return
    previousServiceKey.current = serviceKey
    setDurationOverride(null)
    setTotalOverride(null)
  }, [serviceKey])
  // Значения колеса: шаг 5 мин (5…480), плюс текущее значение (вдруг сумма не кратна 5).
  const durationOptions: WheelPickerOption[] = useMemo(() => {
    const set = new Set<number>()
    for (let m = 5; m <= 480; m += 5) set.add(m)
    if (durationMin > 0) set.add(durationMin)
    return [...set].sort((a, b) => a - b).map((m) => ({ value: String(m), label: formatDuration(m) }))
  }, [durationMin])

  // Свободное время: предупреждаем о пересечении с существующими записями (но разрешаем).
  const hasOverlap = useMemo(() => {
    if (!date || !time || durationMin === 0) return false
    const start = hhmmToMin(time)
    const end = start + durationMin
    return masterBookings.some((b) => {
      if (b.date !== date || b.status === 'CANCELLED' || (rescheduleId && b.id === rescheduleId)) return false
      const bStart = hhmmToMin(b.time)
      const bEnd = bStart + bookingDuration(b)
      return start < bEnd && bStart < end
    })
  }, [date, time, durationMin, masterBookings, rescheduleId])

  const canSave = selectedServices.length > 0 && !!date && !!time && !!selectedClient && (!outbound || !!address.trim()) && allMiscValid && !saving

  const openSubscriptionForDraft = (draftStep: BookingSubscriptionDraft['step']) => {
    if (!master) return
    rememberBookingReturn<BookingSubscriptionDraft>(master.id, {
      step: draftStep,
      serviceId,
      selectedServiceIds,
      date,
      time,
      remind,
      color,
      durationOverride,
      totalOverride,
      serviceOverrides,
      selectedClient,
      outbound,
      address,
      addressDetails,
      addressComment,
      miscPrices,
      rescheduleId,
      timeOnly,
      packageMode,
      packageSlots,
      weekdays,
      weekTime,
    })
    navigate('/subscription')
  }

  const handleSave = async (force = false) => {
    if (!master || selectedServices.length === 0 || !date || !time || !selectedClient) return
    if (outbound && !address.trim()) return
    if (!allMiscValid) return
    // Истёк триал / не оплачено → вместо подтверждения записи экран «Подписка».
    if (subState && !subState.onlineBookingAvailable) { openSubscriptionForDraft('confirm'); return }
    // Пересечение — предупреждаем один раз, затем разрешаем (allowOverlap на бэке).
    if (!force && hasOverlap) { setOverlapWarn(true); return }
    setOverlapWarn(false)
    setSaving(true)
    setError(null)
    try {
      // Цена услуги в заказе: правка мастера, иначе ручная сумма «Прочее», иначе цена каталога.
      const services = selectedServices.map((s) => ({
        serviceId: s.id,
        price: serviceOverrides[s.id]?.price ?? (s.isMisc ? miscKopecks(s.id) : undefined),
      }))
      const booking = await bookingsApi.create({
        masterId: master.id,
        serviceId: services[0].serviceId,
        date,
        time,
        // Передаём строку адресной книги — бэкенд резолвит глобального клиента,
        // в т.ч. для ручного клиента без Max (создаст синтетического, без уведомления).
        masterClientId: selectedClient.id,
        remind,
        clientAddress: outbound ? formatBookingAddress(address, addressDetails, addressComment) : undefined,
        // Первичная цена (для «Прочее») дублирует services[0].price.
        price: services[0].price,
        color,
        services,
        durationMinutes: durationMin,
        // Ручной итог заказа (если мастер его задал) — иначе бэкенд считает по услугам.
        totalPrice: manualTotal ?? undefined,
        // Мастер выбирает любое время в рабочем дне — пересечения разрешены.
        allowOverlap: true,
      })
      trackEvent('master_booking_created', {
        booking_type: 'regular',
        services_count: selectedServices.length,
        has_address: outbound && Boolean(address.trim()),
        remind,
        has_overlap: hasOverlap,
      })
      setCreatedBooking(booking)
      setStep('success')
    } catch (e) {
      trackEvent('master_booking_create_failed', { booking_type: 'regular', error_type: metricErrorType(e) })
      console.error('[booking] create failed', e)
      setError('Не удалось создать запись. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  // Создание записи на абонемент (все N приёмов сразу).
  const handleSavePackage = async () => {
    if (!master || !selectedService || !selectedClient) return
    if (homeVisit && !address.trim()) return
    // Истёк триал / не оплачено → вместо подтверждения записи экран «Подписка».
    if (subState && !subState.onlineBookingAvailable) { openSubscriptionForDraft('package'); return }
    const slots = packageMode === 'days'
      ? packageSlots.filter((s) => s && s.date && s.time)
      : generateWeeklySlots(weekdays, weekTime, selectedService.sessionsCount)
    if (slots.length !== selectedService.sessionsCount) return
    setSaving(true)
    setError(null)
    try {
      await bookingsApi.createPackage({
        masterId: master.id,
        serviceId: selectedService.id,
        slots,
        masterClientId: selectedClient.id,
        remind,
        clientAddress: homeVisit ? formatBookingAddress(address, addressDetails, addressComment) : undefined,
      })
      trackEvent('master_package_created', {
        sessions_count: slots.length,
        has_address: homeVisit && Boolean(address.trim()),
        remind,
      })
      navigate('/bookings')
    } catch (e) {
      trackEvent('master_booking_create_failed', { booking_type: 'package', error_type: metricErrorType(e) })
      const slot = (e as { response?: { data?: { slot?: { date: string; time: string } } } })?.response?.data?.slot
      setError(slot
        ? `Слот ${dayjs(slot.date).format('D MMMM')} ${slot.time} уже занят — выберите другой`
        : 'Не удалось создать запись. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  // Тап по слоту: абонемент → слот приёма; перенос → reschedule; иначе → подтверждение.
  const onSlotTap = (s: string) => {
    setTime(s)
    if (packageSessionIndex !== null) {
      const idx = packageSessionIndex
      setPackageSlots((prev) => {
        const next = [...prev]
        next[idx] = { date, time: s }
        return next
      })
      setPackageSessionIndex(null)
      setStep('package')
    } else if (rescheduleId) {
      setPendingReschedule(s) // спросим подтверждение переноса
    } else {
      setStep('confirm')
    }
  }

  const doReschedule = async () => {
    if (!rescheduleId || !pendingReschedule) return
    const t = pendingReschedule
    setPendingReschedule(null)
    try {
      // Свободный перенос мастером — время любое в рабочем дне, пересечения разрешены.
      await bookingsApi.reschedule(rescheduleId, { date, time: t, allowOverlap: true })
    } catch (e) {
      console.error('[booking] reschedule failed', e)
    }
    navigate('/bookings')
  }

  const handleReschedule = () => {
    if (!createdBooking) return
    setRescheduleId(createdBooking.id)
    setTimeOnly(false)
    setTime('')
    setStep('date')
  }

  // Изменить только время: дата прежняя, сразу шаг времени (минуя выбор даты).
  const handleEditTime = () => {
    if (!createdBooking) return
    setRescheduleId(createdBooking.id)
    setTimeOnly(true)
    setStep('time')
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

  // «Отметить как оплачено» на экране «Запись создана!» — сразу после создания.
  const [payingBusy, setPayingBusy] = useState(false)
  const handleConfirmPayment = async () => {
    if (!createdBooking || payingBusy) return
    setPayingBusy(true)
    try {
      setCreatedBooking(await bookingsApi.confirmPayment(createdBooking.id))
    } catch (e) {
      console.error('[booking] confirm payment failed', e)
    } finally {
      setPayingBusy(false)
    }
  }

  // Google-календарь: TEMPLATE-ссылка (openLink). Если нужен другой провайдер/ICS — поменяем.
  const handleAddToCalendar = () => {
    if (!createdBooking || !selectedService) return
    openAddToCalendar({
      bookingId: createdBooking.id,
      title: selectedService.name,
      date,
      time,
      durationMin: selectedService.duration,
      location: homeVisit ? address.trim() : master?.location ?? '',
    })
  }

  // ─── Шаг 1: выбор услуги (макет 10122-41126) ────────────────────────────────
  if (step === 'service') {
    const clientTabEmpty = serviceTab === 'client' && !selectedClient
    const loadingClientTab = serviceTab === 'client' && !clientTabEmpty && !masterBookingsLoaded
    const nothing = loaded && !clientTabEmpty && !loadingClientTab && shownServices.length === 0
    return (
      // height:100dvh (не minHeight) + minHeight:0 у скролла — кнопка «Выбрать»
      // прибита к низу экрана, список скроллится над ней (макет 10130-52706).
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {searchMode ? (
          <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
            <PillButton onClick={backFromService} ariaLabel="Назад">
              <ArrowLeftIcon />
            </PillButton>
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
          </div>
        ) : (
          <BookingFlowToolbar
            title="Выберите услугу"
            onBack={backFromService}
            backIcon={<ArrowLeftIcon />}
            trailing={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
                <button type="button" aria-label="Добавить услугу" onClick={() => setEditorTarget({ mode: 'create' })} style={toolbarIconBtnStyle}><AddIcon /></button>
                <button type="button" aria-label="Поиск" onClick={() => setSearchMode(true)} style={toolbarIconBtnStyle}><SearchIcon /></button>
              </div>
            }
          />
        )}

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 32px' }}>
          {/* Сегмент-контрол «Все услуги / Оказывались клиенту» (в поиске скрыт). */}
          {!searchMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: 4, boxSizing: 'border-box', background: 'var(--color-surface-transparent)', borderRadius: 16, marginBottom: 12 }}>
              <SegmentTab active={serviceTab === 'all'} onClick={() => setServiceTab('all')}>Все услуги</SegmentTab>
              <SegmentTab active={serviceTab === 'client'} onClick={() => setServiceTab('client')}>Оказывались клиенту</SegmentTab>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientTabEmpty ? (
              <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Сначала выберите клиента</div>
            ) : loadingClientTab ? (
              <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>Загружаем…</div>
            ) : nothing ? (
              <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
                {searchMode ? 'Ничего не найдено' : serviceTab === 'client' ? 'Клиенту ещё не оказывали услуг' : 'Сначала добавьте услуги в профиле'}
              </div>
            ) : (
              shownServices.map((s) => (
                <ServiceSelectRow
                  key={s.id}
                  service={s}
                  selected={stagedIds.includes(s.id)}
                  // Абонемент выбирается эксклюзивно (уводит в отдельный флоу); обычные — мультивыбор.
                  onSelect={() => {
                    if (s.sessionsCount > 1) { pickPackageService(s); return }
                    setStagedIds((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])
                  }}
                  onEdit={() => setEditorTarget({ mode: 'edit', service: s })}
                />
              ))
            )}
          </div>
        </div>

        <BookingFlowBottomButton disabled={stagedIds.length === 0} onClick={commitServices}>
          {stagedIds.length > 1 ? `Выбрать (${stagedIds.length})` : 'Выбрать'}
        </BookingFlowBottomButton>

        {/* Инлайн-редактор услуги (карандаш/«+») — правит услугу, не уводя из флоу. */}
        <ServiceEditorPortal
          target={editorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={() => { void reloadServices(); void useAuthStore.getState().refreshMaster() }}
        />
      </div>
    )
  }

  // ─── Шаг 3: выбор даты (макет 8746-41318) ───────────────────────────────────
  if (step === 'date') {
    const today = dayjs().startOf('day')
    const months = [0, 1, 2].map((o) => today.startOf('month').add(o, 'month'))
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar
          title={rescheduleId ? 'Новая дата' : 'Выберите дату'}
          subtitle={packageSessionIndex !== null ? `Приём ${packageSessionIndex + 1} из ${selectedService?.sessionsCount ?? ''}` : selectedService?.name}
          onBack={() => {
            if (packageSessionIndex !== null) {
              setPackageSessionIndex(null); setStep('package')
            } else if (rescheduleId) {
              if (createdBooking) setStep('success')
              else navigate(-1)
            } else {
              setStep('confirm')
            }
          }}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {months.map((monthStart) => (
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
                  // Слоты больше не считаем: выделяем только выбранный день, остальные по рабочести.
                  const bg = isSelected ? 'var(--color-active-surface)' : 'transparent'
                  const dim = isPast || (!working && !isSelected)
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

  // ─── Шаг 4: выбор времени ───────────────────────────────────────────────────
  if (step === 'time') {
    const selectedDayjs = dayjs(date)
    const isPackageTime = packageSessionIndex !== null
    // Абонемент — слоты (по длительности услуги), минус занятые другими приёмами этого дня.
    const takenTimes = isPackageTime
      ? new Set(packageSlots.filter((s, i) => i !== packageSessionIndex && s && s.date === date).map((s) => s.time))
      : new Set<string>()
    const visibleSlots = slots.filter((s) => !takenTimes.has(s))
    // Обычная запись/перенос — любое время в рабочем дне (кроме обеда). Занятые — приглушены.
    const dayTimes = isPackageTime ? [] : buildDayTimes(schedule)
    const masterNow = currentMasterWall(master?.timezone)
    const currentMinute = masterNow.hour() * 60 + masterNow.minute() + (masterNow.second() || masterNow.millisecond() ? 1 : 0)
    const pastTimes = date === masterNow.format('YYYY-MM-DD')
      ? new Set(dayTimes.filter((t) => hhmmToMin(t) < currentMinute))
      : new Set<string>()
    const busyTimes = new Set<string>()
    if (!isPackageTime) {
      for (const b of masterBookings) {
        if (b.date !== date || b.status === 'CANCELLED' || (rescheduleId && b.id === rescheduleId)) continue
        const bStart = hhmmToMin(b.time)
        const bEnd = bStart + bookingDuration(b)
        for (const t of dayTimes) { const m = hhmmToMin(t); if (m >= bStart && m < bEnd) busyTimes.add(t) }
      }
    }
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar title="Выберите время" subtitle={packageSessionIndex !== null ? `Приём ${packageSessionIndex + 1} из ${selectedService?.sessionsCount ?? ''}` : selectedService?.name} onBack={() => {
          if (timeOnly) { if (createdBooking) setStep('success'); else navigate(-1) }
          else if (packageSessionIndex !== null || rescheduleId) setStep('date')
          else setStep('confirm')
        }} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fixedDateFromSchedule && packageSessionIndex === null ? (
            <div style={{ ...listItemStyle, gap: 12, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedDayjs.format('D MMMM, dd')}
                </div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата из расписания</div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setStep('date')} style={{ ...listItemStyle, gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedDayjs.format('D MMMM, dd')}
                </div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
              </div>
              <EditIcon />
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <div style={{ padding: '24px 8px 8px' }}>
              <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>{isPackageTime ? 'ДОСТУПНЫЕ СЛОТЫ' : 'ВРЕМЯ'}</span>
            </div>
            {isPackageTime ? (
              slotsLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Загружаем…</div>
              ) : visibleSlots.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>Нет свободных слотов</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {visibleSlots.map((s) => (
                    <TimeChip key={s} label={s} selected={time === s} onClick={() => onSlotTap(s)} />
                  ))}
                </div>
              )
            ) : dayTimes.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-on-surface-secondary)', padding: '32px 0' }}>В этот день нет рабочих часов</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {dayTimes.map((t) => (
                  <TimeChip key={t} label={t} selected={time === t} busy={busyTimes.has(t)} disabled={pastTimes.has(t)} onClick={() => onSlotTap(t)} />
                ))}
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

        {pendingReschedule && (
          <ConfirmDialog
            title="Перенести запись"
            message={`Перенести запись на ${selectedDayjs.format('D MMMM')}, ${pendingReschedule}?`}
            confirmLabel="Перенести"
            danger={false}
            onConfirm={() => { void doReschedule() }}
            onCancel={() => setPendingReschedule(null)}
          />
        )}
      </div>
    )
  }

  // ─── Шаг абонемента: выбор слотов на все приёмы (По дням / По неделям) ───────
  if (step === 'package' && selectedService) {
    const N = selectedService.sessionsCount
    const unit = discountedPrice(selectedService.price, selectedService.discountPercent)
    const hasDiscount = unit !== null
    const discTotal = (unit ?? selectedService.price) * N
    const fullTotal = selectedService.price * N
    const daysFilled = packageSlots.filter((s) => s && s.date && s.time)
    const weeksSlots = generateWeeklySlots(weekdays, weekTime, N)
    const finalCount = packageMode === 'days' ? daysFilled.length : weeksSlots.length
    const canSavePkg = !saving && finalCount === N && !!selectedClient && (!homeVisit || !!address.trim())
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar
          title="Абонемент"
          subtitle={selectedService.name}
          onBack={() => setStep('service')}
          trailing={
            <div style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
              <button type="button" onClick={() => navigate('/bookings')} style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', ...text.callout1, color: 'var(--color-on-surface)' }}>
                Закрыть
              </button>
            </div>
          }
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Клиент */}
          <button type="button" onClick={() => setStep('client')} style={listItemStyle}>
            {selectedClient && <ClientAvatar name={selectedClient.name} photo={selectedClient.photo} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedClient ? selectedClient.name : 'Выбрать клиента'}
              </div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedClient ? (selectedClient.isMaxUser ? formatPhone(selectedClient.phone) : 'Без аккаунта Max — без уведомления') : 'из списка'}
              </div>
            </div>
            <UserSquareIcon size={16} />
          </button>

          {/* Адрес выезда */}
          {homeVisit && (
            <button
              type="button"
              onClick={() => { setAddressReturnStep('package'); setStep('address') }}
              style={{ ...listItemStyle, width: '100%', border: 'none', textAlign: 'left' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{address ? 'Адрес' : 'Адрес клиента'}</div>
                {address ? (
                  <BookingAddressText value={formatBookingAddress(address, addressDetails, addressComment)} />
                ) : (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Выбрать</div>
                )}
              </div>
              <LocationIcon />
            </button>
          )}

          {/* Услуга + стоимость абонемента (цена × N) */}
          <div style={{ ...listItemStyle, cursor: 'default' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedService.name}</div>
                {selectedService.description && (
                  <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{selectedService.description}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasDiscount ? (
                  <>
                    <span style={{ ...text.callout1, color: 'var(--color-error-surface-accented)' }}>{formatPrice(discTotal)}</span>
                    <span style={{ ...text.caption2, color: 'var(--color-on-surface-muted)', textDecoration: 'line-through' }}>{formatPrice(fullTotal)}</span>
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', boxSizing: 'border-box', borderRadius: 8, background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)', ...text.label2Caps }}>Скидка</span>
                  </>
                ) : (
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(fullTotal)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Сегмент По дням / По неделям */}
          <div style={{ display: 'flex', gap: 4, height: 44, alignItems: 'center', padding: 4, borderRadius: 16, background: 'var(--color-surface-transparent)' }}>
            {(['days', 'weeks'] as const).map((m) => {
              const active = packageMode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPackageMode(m)}
                  style={{ flex: 1, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...text.callout2, background: active ? 'var(--color-secondary-surface)' : 'transparent', color: active ? 'var(--color-interactive-element-accented)' : 'var(--color-interactive-element)' }}
                >
                  {m === 'days' ? 'По дням' : 'По неделям'}
                </button>
              )
            })}
          </div>

          {packageMode === 'days' ? (
            Array.from({ length: N }).map((_, i) => {
              const slot = packageSlots[i]
              const filled = !!(slot && slot.date && slot.time)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setPackageSessionIndex(i); setDate(''); setTime(''); setStep('date') }}
                  style={listItemStyle}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {filled ? dayjs(slot.date).format('D MMMM, dd') : 'Выбрать дату и время'}
                    </div>
                    {filled && <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{slot.time}</div>}
                  </div>
                  <ArrowRightIcon />
                </button>
              )
            })
          ) : (
            <>
              <div style={{ padding: '24px 8px 8px', display: 'flex', justifyContent: 'center' }}>
                <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>Каждую неделю по выбранным дням</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {WEEKDAYS.map((w) => {
                  const sel = weekdays.includes(w.iso)
                  const allowed = !schedule || schedule.workingDays.includes(w.iso)
                  return (
                    <button
                      key={w.iso}
                      type="button"
                      disabled={!allowed}
                      onClick={() => setWeekdays((p) => (p.includes(w.iso) ? p.filter((x) => x !== w.iso) : [...p, w.iso]))}
                      style={{ flex: 1, height: 69, borderRadius: 20, border: 'none', ...text.callout1, background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)', color: sel ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)', opacity: allowed ? 1 : 0.4, cursor: allowed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {w.label}
                    </button>
                  )
                })}
              </div>
              <div style={{ padding: '24px 8px 8px', display: 'flex', justifyContent: 'center' }}>
                <span style={{ ...text.caption3Caps, color: 'var(--color-on-surface-soften)' }}>Время</span>
              </div>
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
                        style={{ height: 69, borderRadius: 20, border: 'none', ...text.callout1, background: sel ? 'var(--color-primary-surface)' : 'var(--color-surface-transparent)', color: sel ? 'var(--color-on-primary-surface)' : 'var(--color-on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ ...text.caption1, color: 'var(--color-error-surface-accented)', padding: '0 8px' }}>{error}</div>
          )}
        </div>

        <div style={{ padding: '8px 12px calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            disabled={!canSavePkg}
            onClick={() => { void handleSavePackage() }}
            style={{ width: '100%', height: 60, borderRadius: 20, border: 'none', padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...text.callout1, cursor: canSavePkg ? 'pointer' : 'default', background: canSavePkg ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)', color: canSavePkg ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)' }}
          >
            <CalendarEditIcon />
            {saving ? 'Записываем…' : 'Записать'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Шаг 6: выбор клиента (адресная книга) ──────────────────────────────────
  if (step === 'client') {
    const visibleClients = clientSearchMode ? filteredClients : clients
    const noSearchResults = clientsLoaded && clientSearchMode && clients.length > 0 && visibleClients.length === 0

    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        {clientSearchMode ? (
          <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 12px' }}>
            <PillButton onClick={closeClientSearch} ariaLabel="Назад">
              <ArrowLeftIcon />
            </PillButton>
            <div style={{ flex: 1, minWidth: 0, height: 44, background: 'var(--color-background)', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
              <input
                ref={clientSearchInputRef}
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Поиск"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--color-on-surface)', fontFamily: 'inherit', ...text.body2, padding: 0 }}
              />
              {clientQuery && (
                <button type="button" aria-label="Очистить" onClick={() => { setClientQuery(''); clientSearchInputRef.current?.focus() }} style={{ width: 20, height: 20, flexShrink: 0, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-secondary)' }}>
                  <ClearIcon />
                </button>
              )}
            </div>
            <PillButton onClick={openClientAdd} ariaLabel="Добавить клиента">
              <AddIcon />
            </PillButton>
          </div>
        ) : (
          <Toolbar
            title="Выберите клиента"
            onBack={() => setStep(isPackageService ? 'package' : 'confirm')}
            trailing={(
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 4, background: 'var(--color-background)', borderRadius: 22, flexShrink: 0 }}>
                <ToolbarIconButton onClick={openClientAdd} ariaLabel="Добавить клиента">
                  <AddIcon />
                </ToolbarIconButton>
                {clients.length > 0 && (
                  <ToolbarIconButton onClick={openClientSearch} ariaLabel="Поиск">
                    <SearchIcon />
                  </ToolbarIconButton>
                )}
              </div>
            )}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
          {clientsLoaded && clients.length === 0 && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              Нет клиентов. Добавьте нового клиента кнопкой «+».
            </div>
          )}
          {noSearchResults && (
            <div style={{ textAlign: 'center', ...text.caption1, color: 'var(--color-on-surface-secondary)', marginTop: 40 }}>
              Ничего не найдено
            </div>
          )}
          {visibleClients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickClient(c)}
              style={listItemStyle}
            >
              <ClientAvatar name={c.name} photo={c.photo} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {/* Ручной клиент (без Max) записывается без уведомления — помечаем. */}
                  {c.isMaxUser ? formatPhone(c.phone) : 'Без аккаунта Max — без уведомления'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'clientAdd') {
    const canAddClient = !!newClientName.trim() && !newClientSaving

    return (
      <div style={{ minHeight: '100dvh', paddingBottom: 20 }}>
        <Toolbar title="Новый клиент" onBack={() => setStep('client')} />
        <div style={{ padding: '12px 16px calc(48px + env(safe-area-inset-bottom))' }}>
          <FloatingField label="Имя и фамилия" value={newClientName} onChange={setNewClientName} valueBold autoFocus />
          <div style={{ marginTop: 16 }}>
            <FloatingField label="Номер телефона" value={newClientPhone} onChange={handleNewClientPhone} valueBold type="tel" inputMode="tel" />
            {newClientPhoneError && (
              <div style={{ ...text.footnote, color: 'var(--color-error-surface-accented)', padding: '4px 8px 0' }}>
                {newClientPhoneError}
              </div>
            )}
          </div>
          {newClientError && (
            <div style={{ ...text.footnote, color: 'var(--color-error-surface-accented)', padding: '12px 8px 0' }}>
              {newClientError}
            </div>
          )}
          <button
            type="button"
            disabled={!canAddClient}
            onClick={() => { void submitNewClient() }}
            style={{
              width: '100%', height: 60, marginTop: 32, borderRadius: 20, border: 'none', padding: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...text.callout1,
              cursor: canAddClient ? 'pointer' : 'default',
              background: canAddClient ? 'var(--color-primary-surface)' : 'var(--color-secondary-surface-muted)',
              color: canAddClient ? 'var(--color-on-primary-surface)' : 'var(--color-interactive-element-muted)',
            }}
          >
            {newClientSaving ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'address') {
    return (
      <BookingAddressEditor
        address={address}
        details={addressDetails}
        comment={addressComment}
        pickerOpen={addressPickerOpen}
        onAddressChange={setAddress}
        onDetailsChange={setAddressDetails}
        onCommentChange={setAddressComment}
        onPickerOpenChange={setAddressPickerOpen}
        onBack={() => setStep(addressReturnStep)}
        onSave={() => setStep(addressReturnStep)}
      />
    )
  }

  // ─── Шаг 7: успех «Запись создана!» (макет 8746-41315) ──────────────────────
  if (step === 'success') {
    const badge = PAYMENT_BADGE[createdBooking?.paymentStatus ?? 'UNPAID']
    const addressText = outbound ? formatBookingAddress(address, addressDetails, addressComment) : master?.location ?? ''
    const handleOpenRoute = () => {
      if (!outbound || !addressText || !master) return
      openExternalLink(yandexRouteUrl(
        { lat: master.lat, lng: master.lng, address: master.location },
        bookingRouteAddress(addressText),
      ))
    }
    // Итог по всем услугам записи (мультиуслуги) из созданной записи.
    const succItems = createdBooking ? bookingServiceItems(createdBooking) : []
    const succPrice = createdBooking ? bookingTotal(createdBooking) : 0
    return (
      <div style={{ minHeight: '100dvh' }}>
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

          {/* Адрес — только выезд к клиенту. Свой адрес мастеру не показываем. */}
          {outbound && addressText && (
            <button type="button" onClick={handleOpenRoute} aria-label="Построить маршрут" style={{ ...listItemStyle, width: '100%', border: 'none', textAlign: 'left' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BookingAddressText value={addressText} />
              </div>
              <LocationIcon />
            </button>
          )}

          {/* Услуги + статус оплаты (мультиуслуги: список + итог) */}
          {succItems.length > 0 && (
            <div style={{ ...listItemStyle, cursor: 'default' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {succItems.map((it, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ ...text.callout1, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.service.name}</div>
                      {it.service.description && (
                        <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{it.service.description}</div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{formatPrice(succPrice)}</span>
                  <span style={{ ...text.label2Caps, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', borderRadius: 8, background: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* Дата — тап открывает перенос. */}
          <button type="button" onClick={handleReschedule} aria-label="Изменить дату" style={{ ...listItemStyle, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{dayjs(date).format('D MMMM, dd')}</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>Дата</div>
            </div>
            <EditIcon />
          </button>

          {/* Время — тап открывает выбор времени (дата прежняя). */}
          <button type="button" onClick={handleEditTime} aria-label="Изменить время" style={{ ...listItemStyle, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{time}</div>
              <div style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{remind ? 'Напомним за 1 час' : 'Без напоминания'}</div>
            </div>
            <EditIcon />
          </button>
        </div>

        {/* Футер: «Добавить в календарь» + Перенести / Чат / Отменить — в конце контента, не прибит к низу */}
        <div style={{ padding: '16px 12px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Кнопка доступна сразу после создания (как в карточке записи мастера). */}
          {createdBooking?.paymentStatus !== 'PAID' && (
            <button
              type="button"
              disabled={payingBusy}
              onClick={() => { void handleConfirmPayment() }}
              style={{
                width: '100%', height: 60, borderRadius: 20, border: 'none',
                cursor: payingBusy ? 'default' : 'pointer', ...text.callout1,
                background: 'var(--color-primary-surface)', color: 'var(--color-on-primary-surface)',
                opacity: payingBusy ? 0.6 : 1,
              }}
            >
              Отметить как оплачено
            </button>
          )}
          <button type="button" onClick={handleAddToCalendar} style={{ ...chipStyle, width: '100%' }}>
            <CalendarIcon />
            <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Добавить в календарь</span>
          </button>
          <div style={{ display: 'flex', gap: 4, width: '100%' }}>
            <button type="button" onClick={handleReschedule} style={{ ...chipStyle, flex: 1, minWidth: 0 }}>
              <RepeatIcon />
              <span style={{ ...text.caption2, color: 'var(--color-active-element)' }}>Перенести</span>
            </button>
            <button type="button" disabled style={{ ...chipStyle, flex: 1, minWidth: 0, cursor: 'default', color: 'var(--color-interactive-element-muted)' }}>
              <MessageTextIcon />
              <span style={{ ...text.caption2, color: 'var(--color-interactive-element-muted)' }}>Чат</span>
            </button>
            <button type="button" onClick={() => setConfirmCancel(true)} style={{ ...chipStyle, flex: 1, minWidth: 0, color: 'var(--color-error-surface-accented)' }}>
              <CloseCircleIcon />
              <span style={{ ...text.caption2, color: 'var(--color-error-surface-accented)' }}>Отменить</span>
            </button>
          </div>
        </div>

        {confirmCancel && (
          <ConfirmDialog
            title="Отменить запись"
            message="Вы действительно хотите отменить запись? Клиент получит уведомление."
            confirmLabel="Отменить запись"
            cancelLabel="Назад"
            onConfirm={() => { setConfirmCancel(false); void handleCancelBooking() }}
            onCancel={() => setConfirmCancel(false)}
          />
        )}
      </div>
    )
  }

  // ─── Выбор цвета записи (из формы-сводки) ────────────────────────────────────
  if (step === 'color') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar title="Цвет записи" onBack={() => setStep('confirm')} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
          <div style={{ background: 'var(--color-surface-transparent)', borderRadius: 20, boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, justifyItems: 'center' }}>
            {BOOKING_COLORS.map((c) => {
              const selected = c.toUpperCase() === color.toUpperCase()
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setStep('confirm') }}
                  aria-label={c}
                  style={{ width: 48, height: 48, borderRadius: 24, background: c, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: selected ? '2px solid var(--color-on-surface)' : 'none', outlineOffset: 3 }}
                >
                  {selected && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10.5L8.5 14L15 6.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── Шаг 5: подтверждение (макет 10111-37975) ────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar title="Создание записи" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Клиент */}
        <FormCard title="Клиент">
          <FormRow label="Имя" value={selectedClient ? selectedClient.name : 'Выбрать'} prompt={!selectedClient} onClick={() => setStep('client')} last />
        </FormCard>

        {/* Услуги (мультиуслуги): список выбранных + «Добавить услугу». */}
        <FormCard title="Услуги">
          {selectedServices.length === 0 ? (
            <FormRow label="Наименование" value="Выбрать" prompt onClick={openServicePicker} last />
          ) : (
            <>
              {/* Строка услуги: имя + «длительность, цена» и стрелка — тап открывает
                  редактирование услуги для этого заказа (макет 10136-40181). */}
              {selectedServices.map((s) => {
                const priceKopecks = svcPrice(s)
                const priced = !s.isMisc || miscValid(s.id) || serviceOverrides[s.id]?.price != null
                return (
                  <OrderServiceRow
                    key={s.id}
                    title={s.name}
                    subtitle={priced
                      ? `${formatDurationHuman(svcDuration(s))}, ${formatPrice(priceKopecks)}`
                      : `${formatDurationHuman(svcDuration(s))}, цена по договорённости`}
                    onClick={() => setEditingServiceId(s.id)}
                  />
                )
              })}
              <FormRow label="Ещё услуга" value="Выбрать" prompt onClick={openServicePicker} last />
            </>
          )}
        </FormCard>

        {/* Дата и время */}
        <FormCard title="Дата и время">
          {/* В ручной записи мастер может выбрать место независимо от режима онлайн-записи профиля. */}
          <FormRow
            label="Где"
            value={outbound ? 'Выезд' : 'Принимаю у себя'}
            onClick={() => setOutbound((value) => !value)}
          />
          {outbound && (
            <FormRow
              label={address.trim() ? 'Адрес' : 'Адрес клиента'}
              prompt={!address.trim()}
              stacked={!!address.trim()}
              right={address.trim() ? (
                <div style={{ minWidth: 0 }}>
                  <BookingAddressText value={formatBookingAddress(address, addressDetails, addressComment)} />
                </div>
              ) : undefined}
              value="Выбрать"
              onClick={() => { setAddressReturnStep('confirm'); setStep('address') }}
            />
          )}
          <FormRow label="Дата" value={date ? dayjs(date).format('D MMMM, dd') : 'Выбрать'} prompt={!date} onClick={() => setStep('date')} />
          <FormRow label="Время" value={time || 'Выбрать'} prompt={!time} onClick={() => setStep(date ? 'time' : 'date')} />
          <FormRow
            label="Длительность"
            value={durationMin > 0 ? formatDuration(durationMin) : '0 мин'}
            onClick={selectedServices.length > 0 ? () => setDurationPickerOpen(true) : undefined}
          />
          <FormRow label="Напоминание клиенту" value={remind ? 'за 1 час' : 'Нет'} onClick={() => setRemind((v) => !v)} />
          <FormRow
            label="Цвет записи"
            right={<span style={{ width: 24, height: 24, borderRadius: 12, background: color, display: 'inline-block', flexShrink: 0 }} />}
            onClick={() => setStep('color')}
            last
          />
        </FormCard>

        {/* Стоимость: итог по всем услугам (индивидуальные цены «Прочее» — в карточке услуг). */}
        <FormCard title="Стоимость">
          {/* Итог заказа — редактируемый: мастер может задать сумму, отличную от суммы услуг.
              Пусто → снова считаем по услугам. */}
          <FormRow
            label="Итого"
            noArrow
            last
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  inputMode="numeric"
                  aria-label="Итоговая стоимость"
                  value={totalOverride ?? String(Math.round(servicesKopecks / 100))}
                  onChange={(e) => setTotalOverride(e.target.value.replace(/[^\d]/g, ''))}
                  style={{
                    ...text.body2, color: 'var(--color-on-surface)', background: 'none',
                    border: 'none', outline: 'none', textAlign: 'right', width: 96, padding: 0,
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ ...text.body2, color: 'var(--color-on-surface)' }}>₽</span>
              </div>
            }
          />
        </FormCard>

        {error && (
          <div style={{ ...text.caption1, color: 'var(--color-error-surface-accented)', padding: '0 8px' }}>{error}</div>
        )}
      </div>

      {/* Кнопка «Записать» */}
      <BookingFlowBottomButton disabled={!canSave} onClick={() => { void handleSave() }} icon={<CalendarEditIcon />}>
        {saving ? 'Записываем…' : 'Записать'}
      </BookingFlowBottomButton>

      {/* Предупреждение о пересечении времени — свободный выбор, но с подтверждением. */}
      {overlapWarn && (
        <ConfirmDialog
          title="Время занято"
          message="На это время уже есть запись. Записать всё равно?"
          confirmLabel="Записать"
          danger={false}
          onConfirm={() => { void handleSave(true) }}
          onCancel={() => setOverlapWarn(false)}
        />
      )}

      {/* Редактирование услуги для этого заказа (макет 10138-40554). */}
      {editingServiceId && (() => {
        const s = selectedServices.find((x) => x.id === editingServiceId)
        if (!s) return null
        return (
          <OrderServiceEditPortal
            service={s}
            duration={svcDuration(s)}
            priceKopecks={svcPrice(s)}
            onDuration={(min) => setServiceOverrides((p) => ({ ...p, [s.id]: { ...p[s.id], duration: min } }))}
            onPrice={(k) => setServiceOverrides((p) => ({ ...p, [s.id]: { ...p[s.id], price: k } }))}
            onRemove={() => removeService(s.id)}
            onClose={() => setEditingServiceId(null)}
          />
        )
      })()}

      {/* Колесо выбора длительности (макет 10302-42986): шаг 5 мин, «Выбрать» фиксирует. */}
      <WheelPicker
        open={durationPickerOpen}
        value={String(durationMin)}
        options={durationOptions}
        onSelect={(v) => setDurationOverride(Number(v))}
        onClose={() => setDurationPickerOpen(false)}
      />
    </div>
  )
}

// Карточка-группа формы-сводки (макет 10111-37975 «listItem»): полупрозрачная
// поверхность, скруг. 20, мягкая тень «Card Soft», заголовок по центру + разделитель.
function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', background: 'var(--color-surface-transparent)', borderRadius: 20, boxShadow: '0px 1px 2px 0px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderBottom: '1px solid var(--color-secondary-surface-muted)' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// Строка карточки: лейбл слева (Body2, onSurfaceSecondary), значение справа
// (Body2; «Выбрать» → primarySurface, иначе onSurface) + стрелка. В макете стрелка
// у всех строк, кроме «Стоимости» (noArrow). Последняя строка карточки — без разделителя.
function FormRow({ label, value, prompt, right, onClick, noArrow, last, stacked }: {
  label: string
  value?: string
  prompt?: boolean
  right?: React.ReactNode
  onClick?: () => void
  noArrow?: boolean
  last?: boolean
  stacked?: boolean
}) {
  const rowStyle: React.CSSProperties = {
    width: '100%', display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', justifyContent: 'space-between', gap: 8,
    padding: 16, background: 'none', border: 'none',
    borderBottom: last ? 'none' : '1px solid var(--color-secondary-surface-muted)',
    cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
  }
  const inner = (
    <>
      <span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)', flex: stacked ? undefined : 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: 1, minWidth: 0 }}>
        {right ?? (
          <span style={{ ...text.body2, color: prompt ? 'var(--color-primary-surface)' : 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>{value}</span>
        )}
        {!noArrow && <ArrowRightIcon />}
      </span>
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} style={rowStyle}>{inner}</button>
    : <div style={rowStyle}>{inner}</div>
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
        {/* «Прочее» (isMisc) — цена не задана, мастер вводит её на шаге подтверждения. */}
        {!service.isMisc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...text.callout1, color: hasDiscount ? 'var(--color-error-surface-accented)' : 'var(--color-on-surface)' }}>
              {formatPrice(dPrice ?? service.price)}
            </span>
            {hasDiscount && (
              <>
                <span style={{ ...text.caption2, color: 'var(--color-on-surface-muted)', textDecoration: 'line-through' }}>{formatPrice(service.price)}</span>
                <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 8px', boxSizing: 'border-box', borderRadius: 8, background: 'var(--color-error-surface-lite)', color: 'var(--color-on-error-surface-lite)', ...text.label2Caps }}>
                  Скидка
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <ArrowRightIcon />
    </button>
  )
}

// Кнопка-иконка в тулбаре шага выбора услуги (внутри pill-группы, p6, 24px иконка).
const toolbarIconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 6, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)',
}

// Таб сегмент-контрола (макет 10122-41126): h36, rounded 12, Callout2.
// Активный — фон chat-bg-elements + interactive-element-accented; иначе — interactive-element.
function SegmentTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, height: 36, borderRadius: 12, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, boxSizing: 'border-box',
        background: active ? 'var(--color-chat-bg-elements)' : 'none',
        color: active ? 'var(--color-interactive-element-accented)' : 'var(--color-interactive-element)',
        ...text.callout2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {children}
    </button>
  )
}

// Строка выбора услуги (макет 10122-41126): radio + название + «длит., цена» + карандаш.
// Тап по строке — staged-выбор; карандаш (stopPropagation) — переход к редактору услуги.
function ServiceSelectRow({ service: s, selected, onSelect, onEdit }: {
  service: Service; selected: boolean; onSelect: () => void; onEdit: () => void
}) {
  const price = discountedPrice(s.price, s.discountPercent) ?? s.price
  const subtitle = s.isMisc ? 'Цена по договорённости' : `${formatDuration(s.duration)}, ${formatPrice(price)}`
  return (
    <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface-transparent)', borderRadius: 20, padding: '16px 20px', cursor: 'pointer' }}>
      <CheckboxIcon checked={selected} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
      </div>
      <button type="button" aria-label="Редактировать услугу" onClick={(e) => { e.stopPropagation(); onEdit() }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-surface)', flexShrink: 0 }}>
        <PencilEditIcon />
      </button>
    </div>
  )
}

// Экран «Редактирование услуги» для конкретного заказа (макет 10138-40554):
// название (только чтение), продолжительность (колесо), стоимость, «Удалить из списка».
// Правки живут в записи и не меняют услугу в каталоге мастера.
function OrderServiceEditPortal({ service, duration, priceKopecks, onDuration, onPrice, onRemove, onClose }: {
  service: Service
  duration: number
  priceKopecks: number
  onDuration: (min: number) => void
  onPrice: (kopecks: number) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [wheelOpen, setWheelOpen] = useState(false)
  const [priceText, setPriceText] = useState(String(Math.round(priceKopecks / 100)))

  const durationOptions: WheelPickerOption[] = useMemo(() => {
    const set = new Set<number>()
    for (let m = 5; m <= 480; m += 5) set.add(m)
    if (duration > 0) set.add(duration)
    return [...set].sort((a, b) => a - b).map((m) => ({ value: String(m), label: formatDuration(m) }))
  }, [duration])

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'var(--gradient-hero-background)',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      display: 'flex', flexDirection: 'column',
    }}>
      <BookingFlowToolbar title="Редактирование услуги" onBack={onClose} backIcon={<ArrowLeftIcon />} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <OrderEditField label="Название услуги" value={service.name} />
        <OrderEditField
          label="Продолжительность"
          value={formatDurationHuman(duration)}
          onClick={() => setWheelOpen(true)}
          trailing={<ArrowRightIcon />}
        />
        <OrderEditField
          label="Стоимость"
          input={{
            value: priceText,
            onChange: (v) => {
              const digits = v.replace(/[^\d]/g, '')
              setPriceText(digits)
              onPrice(Math.round(Number(digits || '0') * 100))
            },
          }}
          trailing={<span style={{ ...text.body2, color: 'var(--color-on-surface-secondary)' }}>₽</span>}
        />

        <button
          type="button"
          onClick={() => { onRemove(); onClose() }}
          style={{
            width: '100%', height: 60, borderRadius: 20, border: 'none', marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            ...text.callout1,
            background: 'var(--color-chat-bg-elements)', color: 'var(--color-interactive-element-accented)',
          }}
        >
          Удалить из списка
        </button>
      </div>

      <BookingFlowBottomButton onClick={onClose}>Готово</BookingFlowBottomButton>

      <WheelPicker
        open={wheelOpen}
        value={String(duration)}
        options={durationOptions}
        onSelect={(v) => onDuration(Number(v))}
        onClose={() => setWheelOpen(false)}
      />
    </div>,
    document.body,
  )
}

// Поле экрана редактирования услуги: h72, surface-transparent rx20, лейбл Caption 2
// сверху и значение Callout 1 снизу; значение — текст, ввод или тап (стрелка).
function OrderEditField({ label, value, input, trailing, onClick }: {
  label: string
  value?: string
  input?: { value: string; onChange: (v: string) => void }
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)' }}>{label}</span>
        {input ? (
          <input
            inputMode="numeric"
            aria-label={label}
            value={input.value}
            onChange={(e) => input.onChange(e.target.value)}
            style={{
              ...text.callout1, color: 'var(--color-on-surface)', background: 'none',
              border: 'none', outline: 'none', padding: 0, width: '100%', fontFamily: 'inherit',
            }}
          />
        ) : (
          <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        )}
      </span>
      {trailing && <span style={{ flexShrink: 0, display: 'inline-flex', color: 'var(--color-interactive-element-secondary)' }}>{trailing}</span>}
    </>
  )
  const style: React.CSSProperties = {
    width: '100%', minHeight: 72, boxSizing: 'border-box',
    background: 'var(--color-surface-transparent)', borderRadius: 20,
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
    border: 'none', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
  }
  return onClick
    ? <button type="button" onClick={onClick} style={style}>{inner}</button>
    : <div style={style}>{inner}</div>
}

// Строка услуги в заказе (макет 10136-40181): имя (Callout 1) + «длительность, цена»
// (Caption 2) + стрелка. Тап — редактирование этой услуги для конкретного заказа.
function OrderServiceRow({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        borderBottom: '1px solid var(--color-secondary-surface-muted)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...text.callout1, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <span style={{ ...text.caption2, color: 'var(--color-on-surface-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>
      </span>
      <ArrowRightIcon />
    </button>
  )
}

// Чип времени (шаг «Время»): выбранный — active-surface; занятый — приглушён (но кликабелен).
function TimeChip({ label, selected, busy, disabled, onClick }: { label: string; selected: boolean; busy?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 69, padding: '12px 0', borderRadius: 18,
        background: selected ? 'var(--color-active-surface)' : 'var(--color-surface-transparent)',
        color: selected ? 'var(--color-interactive-element-accented)' : 'var(--color-on-surface)',
        ...text.callout1, border: 'none', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: (busy || disabled) && !selected ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  )
}

// Чекбокс выбора услуги (28px, мультивыбор, макет 10130-52706): круглый —
// выключено — кольцо; включено — заливка primary + белая галочка.
function CheckboxIcon({ checked }: { checked: boolean }) {
  return checked ? (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="11" fill="var(--color-primary-surface)" />
      <path d="M8.5 14.3L12.2 18L19.5 10.5" stroke="var(--color-on-primary-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="10.5" stroke="var(--color-interactive-element)" strokeWidth="1.5" />
    </svg>
  )
}

// vuesax/linear/edit-2 (макет 10130-52706) — чистый карандаш без нижней черты,
// как в виджетах главной. Наследует цвет (в строке услуги — primary-surface).
function PencilEditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M13.26 3.6 5.05 12.29c-.31.33-.61.98-.67 1.43l-.37 3.24c-.13 1.17.71 1.97 1.87 1.77l3.22-.55c.45-.08 1.08-.41 1.39-.75l8.21-8.69c1.42-1.5 2.06-3.21-.15-5.3-2.2-2.07-3.87-1.34-5.29.16Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.89 5.05c.43 2.76 2.67 4.87 5.45 5.15" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Toolbar({ title, subtitle, onBack, trailing }: { title: string; subtitle?: string; onBack: () => void; trailing?: React.ReactNode }) {
  return <BookingFlowToolbar title={title} subtitle={subtitle} onBack={onBack} trailing={trailing} backIcon={<ArrowLeftIcon />} />
}

function PillButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return <BookingFlowPillButton onClick={onClick} ariaLabel={ariaLabel}>{children}</BookingFlowPillButton>
}

function ToolbarIconButton({ onClick, ariaLabel, children }: { onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface)' }}>
      {children}
    </button>
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

function ArrowLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9.57 5.93L3.5 12L9.57 18.07" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 12H3.67" stroke="currentColor" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 12H18M12 6V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
