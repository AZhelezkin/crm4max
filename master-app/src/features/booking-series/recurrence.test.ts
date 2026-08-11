import { describe, expect, it } from 'vitest'

import type { RecurrenceRule } from './types'
import {
  formatRecurrenceSummary,
  generateOccurrenceDates,
  validateRecurrenceRule,
} from './recurrence'

function createRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    startDate: '2026-08-17',
    endDate: '2026-09-30',
    intervalWeeks: 1,
    timezone: 'Europe/Moscow',
    slots: [{ dayOfWeek: 1, time: '14:00' }],
    ...overrides,
  }
}

describe('recurrence occurrence dates', () => {
  it('генерирует еженедельные даты', () => {
    const rule = createRule({
      endDate: '2026-08-26',
      slots: [
        { dayOfWeek: 1, time: '14:00' },
        { dayOfWeek: 3, time: '16:30' },
      ],
    })

    expect(generateOccurrenceDates(rule)).toEqual([
      { date: '2026-08-17', time: '14:00' },
      { date: '2026-08-19', time: '16:30' },
      { date: '2026-08-24', time: '14:00' },
      { date: '2026-08-26', time: '16:30' },
    ])
  })

  it('якорит двухнедельный интервал на ISO-неделе startDate', () => {
    const rule = createRule({
      startDate: '2026-08-19',
      endDate: '2026-09-04',
      intervalWeeks: 2,
      slots: [
        { dayOfWeek: 1, time: '10:00' },
        { dayOfWeek: 5, time: '18:00' },
      ],
    })

    expect(generateOccurrenceDates(rule)).toEqual([
      { date: '2026-08-21', time: '18:00' },
      { date: '2026-08-31', time: '10:00' },
      { date: '2026-09-04', time: '18:00' },
    ])
  })

  it('включает startDate и endDate', () => {
    const rule = createRule({
      startDate: '2026-08-17',
      endDate: '2026-08-19',
      slots: [
        { dayOfWeek: 1, time: '09:00' },
        { dayOfWeek: 3, time: '17:00' },
      ],
    })

    expect(generateOccurrenceDates(rule)).toEqual([
      { date: '2026-08-17', time: '09:00' },
      { date: '2026-08-19', time: '17:00' },
    ])
  })

  it('переносит weekday раньше startDate на следующую активную неделю', () => {
    const rule = createRule({
      startDate: '2026-08-19',
      endDate: '2026-08-24',
      slots: [{ dayOfWeek: 1, time: '14:00' }],
    })

    expect(generateOccurrenceDates(rule)).toEqual([
      { date: '2026-08-24', time: '14:00' },
    ])
  })

  it('детерминированно сортирует weekdays и связанные с ними времена', () => {
    const rule = createRule({
      endDate: '2026-08-23',
      slots: [
        { dayOfWeek: 7, time: '08:15' },
        { dayOfWeek: 3, time: '18:45' },
        { dayOfWeek: 1, time: '12:30' },
      ],
    })

    expect(generateOccurrenceDates(rule)).toEqual([
      { date: '2026-08-17', time: '12:30' },
      { date: '2026-08-19', time: '18:45' },
      { date: '2026-08-23', time: '08:15' },
    ])
    expect(formatRecurrenceSummary(rule)).toBe('Каждую неделю · Пн 12:30, Ср 18:45, Вс 08:15')
  })

  it('не создаёт дубли', () => {
    const occurrences = generateOccurrenceDates(createRule({ endDate: null }), 40)
    const keys = occurrences.map(({ date, time }) => `${date}T${time}`)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('ограничивает бессрочный preview двенадцатью вхождениями по умолчанию', () => {
    const occurrences = generateOccurrenceDates(createRule({ endDate: null }))

    expect(occurrences).toHaveLength(12)
    expect(occurrences[occurrences.length - 1]).toEqual({ date: '2026-11-02', time: '14:00' })
  })

  it.each([
    ['неполная дата', createRule({ startDate: '2026-8-17' }), 'INVALID_START_DATE'],
    ['несуществующая дата', createRule({ endDate: '2026-02-30' }), 'INVALID_END_DATE'],
    ['endDate раньше startDate', createRule({ endDate: '2026-08-16' }), 'END_DATE_BEFORE_START_DATE'],
    ['неподдерживаемый interval', { ...createRule(), intervalWeeks: 3 }, 'INVALID_INTERVAL_WEEKS'],
    ['нет weekday', createRule({ slots: [] }), 'SLOTS_REQUIRED'],
    ['weekday вне ISO 1..7', { ...createRule(), slots: [{ dayOfWeek: 0, time: '14:00' }] }, 'INVALID_DAY_OF_WEEK'],
    ['нет времени', { ...createRule(), slots: [{ dayOfWeek: 1, time: '' }] }, 'INVALID_TIME'],
    ['нестрогое время', { ...createRule(), slots: [{ dayOfWeek: 1, time: '9:00' }] }, 'INVALID_TIME'],
    [
      'два времени одного weekday',
      createRule({ slots: [{ dayOfWeek: 1, time: '09:00' }, { dayOfWeek: 1, time: '10:00' }] }),
      'DUPLICATE_DAY_OF_WEEK',
    ],
    ['невалидная timezone', createRule({ timezone: 'Moscow' }), 'INVALID_TIMEZONE'],
  ])('отклоняет невалидное правило: %s', (_label, candidate, expectedCode) => {
    const validation = validateRecurrenceRule(candidate)

    expect(validation.valid).toBe(false)
    expect(validation.errors.map(({ code }) => code)).toContain(expectedCode)
    expect(() => generateOccurrenceDates(candidate as RecurrenceRule)).toThrow('Некорректное правило повторения')
  })

  it('принимает валидное правило и форматирует двухнедельное summary', () => {
    const rule = createRule({ intervalWeeks: 2 })

    expect(validateRecurrenceRule(rule)).toEqual({ valid: true, errors: [] })
    expect(formatRecurrenceSummary(rule)).toBe('Раз в две недели · Пн 14:00')
  })
})
