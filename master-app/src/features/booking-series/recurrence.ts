import type {
  IsoWeekday,
  RecurrenceRule,
  RecurrenceSlot,
  SeriesOccurrenceDate,
} from './types'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const WEEKDAY_LABELS = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

function formatDisplayDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

export type RecurrenceValidationErrorCode =
  | 'INVALID_RULE'
  | 'INVALID_START_DATE'
  | 'INVALID_END_DATE'
  | 'END_DATE_BEFORE_START_DATE'
  | 'INVALID_INTERVAL_WEEKS'
  | 'INVALID_TIMEZONE'
  | 'SLOTS_REQUIRED'
  | 'INVALID_SLOT'
  | 'INVALID_DAY_OF_WEEK'
  | 'INVALID_TIME'
  | 'DUPLICATE_DAY_OF_WEEK'

export interface RecurrenceValidationError {
  code: RecurrenceValidationErrorCode
  field: string
  message: string
}

export interface RecurrenceValidationResult {
  valid: boolean
  errors: RecurrenceValidationError[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const match = DATE_PATTERN.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12) return false

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}

function isLocalTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

function isIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) return false

  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

export function validateRecurrenceRule(rule: unknown): RecurrenceValidationResult {
  const errors: RecurrenceValidationError[] = []

  if (!isRecord(rule)) {
    return {
      valid: false,
      errors: [{ code: 'INVALID_RULE', field: 'rule', message: 'Правило повторения не задано' }],
    }
  }

  const startDateValid = isLocalDate(rule.startDate)
  const endDateValid = rule.endDate === null || isLocalDate(rule.endDate)

  if (!startDateValid) {
    errors.push({
      code: 'INVALID_START_DATE',
      field: 'startDate',
      message: 'Дата начала должна быть в формате YYYY-MM-DD',
    })
  }

  if (!endDateValid) {
    errors.push({
      code: 'INVALID_END_DATE',
      field: 'endDate',
      message: 'Дата окончания должна быть пустой или в формате YYYY-MM-DD',
    })
  } else if (
    startDateValid
    && typeof rule.startDate === 'string'
    && typeof rule.endDate === 'string'
    && rule.endDate < rule.startDate
  ) {
    errors.push({
      code: 'END_DATE_BEFORE_START_DATE',
      field: 'endDate',
      message: 'Дата окончания не может быть раньше даты начала',
    })
  }

  if (rule.intervalWeeks !== 1 && rule.intervalWeeks !== 2) {
    errors.push({
      code: 'INVALID_INTERVAL_WEEKS',
      field: 'intervalWeeks',
      message: 'Интервал должен составлять одну или две недели',
    })
  }

  if (!isIanaTimezone(rule.timezone)) {
    errors.push({
      code: 'INVALID_TIMEZONE',
      field: 'timezone',
      message: 'Укажите корректную IANA timezone',
    })
  }

  if (!Array.isArray(rule.slots) || rule.slots.length === 0) {
    errors.push({
      code: 'SLOTS_REQUIRED',
      field: 'slots',
      message: 'Выберите хотя бы один день недели',
    })
  } else {
    const usedWeekdays = new Set<number>()

    rule.slots.forEach((slot, index) => {
      if (!isRecord(slot)) {
        errors.push({
          code: 'INVALID_SLOT',
          field: `slots.${index}`,
          message: 'Слот расписания задан неверно',
        })
        return
      }

      const dayOfWeek = slot.dayOfWeek
      if (!Number.isInteger(dayOfWeek) || typeof dayOfWeek !== 'number' || dayOfWeek < 1 || dayOfWeek > 7) {
        errors.push({
          code: 'INVALID_DAY_OF_WEEK',
          field: `slots.${index}.dayOfWeek`,
          message: 'День недели должен быть целым числом от 1 до 7',
        })
      } else if (usedWeekdays.has(dayOfWeek)) {
        errors.push({
          code: 'DUPLICATE_DAY_OF_WEEK',
          field: `slots.${index}.dayOfWeek`,
          message: 'Для каждого дня недели допустимо только одно время',
        })
      } else {
        usedWeekdays.add(dayOfWeek)
      }

      if (!isLocalTime(slot.time)) {
        errors.push({
          code: 'INVALID_TIME',
          field: `slots.${index}.time`,
          message: 'Время должно быть в формате HH:mm',
        })
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

function assertValidRule(rule: RecurrenceRule): void {
  const validation = validateRecurrenceRule(rule)
  if (validation.valid) return

  throw new RangeError(`Некорректное правило повторения: ${validation.errors.map((error) => error.message).join('; ')}`)
}

function localDateToDayNumber(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return Math.floor(date.getTime() / MILLISECONDS_PER_DAY)
}

function dayNumberToLocalDate(dayNumber: number): string {
  const date = new Date(dayNumber * MILLISECONDS_PER_DAY)
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoWeekday(dayNumber: number): IsoWeekday {
  const weekday = new Date(dayNumber * MILLISECONDS_PER_DAY).getUTCDay()
  return (weekday === 0 ? 7 : weekday) as IsoWeekday
}

function compareSlots(left: RecurrenceSlot, right: RecurrenceSlot): number {
  if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek
  if (left.time === right.time) return 0
  return left.time < right.time ? -1 : 1
}

/** UTC is used only as a stable civil-date counter; rule times remain local strings. */
export function generateOccurrenceDates(rule: RecurrenceRule, limit = 12): SeriesOccurrenceDate[] {
  assertValidRule(rule)

  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError('Лимит вхождений должен быть неотрицательным целым числом')
  }
  if (limit === 0) return []

  const startDay = localDateToDayNumber(rule.startDate)
  const endDay = rule.endDate === null ? null : localDateToDayNumber(rule.endDate)
  const anchorWeekStart = startDay - (isoWeekday(startDay) - 1)
  const slots = [...rule.slots].sort(compareSlots)
  const occurrences: SeriesOccurrenceDate[] = []
  const occurrenceKeys = new Set<string>()

  for (
    let weekStart = anchorWeekStart;
    endDay === null || weekStart <= endDay;
    weekStart += rule.intervalWeeks * 7
  ) {
    for (const slot of slots) {
      const occurrenceDay = weekStart + slot.dayOfWeek - 1
      if (occurrenceDay < startDay) continue
      if (endDay !== null && occurrenceDay > endDay) continue

      const date = dayNumberToLocalDate(occurrenceDay)
      const key = `${date}T${slot.time}`
      if (occurrenceKeys.has(key)) continue

      occurrenceKeys.add(key)
      occurrences.push({ date, time: slot.time })
      if (occurrences.length === limit) return occurrences
    }
  }

  return occurrences
}

export function formatRecurrenceSummary(rule: RecurrenceRule): string {
  assertValidRule(rule)

  const frequency = rule.intervalWeeks === 1 ? 'Каждую неделю' : 'Раз в две недели'
  const schedule = [...rule.slots]
    .sort(compareSlots)
    .map((slot) => `${WEEKDAY_LABELS[slot.dayOfWeek]} ${slot.time}`)
    .join(', ')

  return `${frequency} · ${schedule}`
}

export function formatRecurrencePeriod(rule: RecurrenceRule): string {
  assertValidRule(rule)
  const start = formatDisplayDate(rule.startDate)
  return rule.endDate
    ? `с ${start} по ${formatDisplayDate(rule.endDate)}`
    : `с ${start} без даты окончания`
}

export function formatRecurrenceSchedule(rule: RecurrenceRule): string {
  assertValidRule(rule)
  return [...rule.slots]
    .sort(compareSlots)
    .map((slot) => `${WEEKDAY_LABELS[slot.dayOfWeek]}. ${slot.time}`)
    .join(', ')
}
