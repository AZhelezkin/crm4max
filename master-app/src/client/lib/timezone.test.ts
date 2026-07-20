import { describe, expect, it, vi } from 'vitest'

import { mockDeviceTimezone } from '@/test/time'

import { deviceTz, toClientLocal, toMasterLocal } from './timezone'

describe('client timezone conversion', () => {
  it('возвращает device IANA timezone', () => {
    mockDeviceTimezone('Asia/Vladivostok')

    expect(deviceTz()).toBe('Asia/Vladivostok')
  })

  it('использует Europe/Moscow при пустом или недоступном Intl timezone', () => {
    mockDeviceTimezone('')
    expect(deviceTz()).toBe('Europe/Moscow')

    vi.restoreAllMocks()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('timezone unavailable')
    })
    expect(deviceTz()).toBe('Europe/Moscow')
  })

  it('не меняет wall-clock при одинаковом timezone', () => {
    mockDeviceTimezone('Europe/Moscow')

    expect(toClientLocal('2026-07-21', '10:00', 'Europe/Moscow')).toEqual({
      date: '2026-07-21',
      time: '10:00',
    })
    expect(toMasterLocal('2026-07-21', '10:00', 'Europe/Moscow')).toEqual({
      date: '2026-07-21',
      time: '10:00',
    })
  })

  it('переносит дату при переводе времени мастера во Владивосток', () => {
    mockDeviceTimezone('Asia/Vladivostok')

    expect(toClientLocal('2026-07-21', '23:30', 'Europe/Moscow')).toEqual({
      date: '2026-07-22',
      time: '06:30',
    })
  })

  it('возвращает client wall-clock в master timezone', () => {
    mockDeviceTimezone('Asia/Vladivostok')

    expect(toMasterLocal('2026-07-22', '06:30', 'Europe/Moscow')).toEqual({
      date: '2026-07-21',
      time: '23:30',
    })
  })

  it('фиксирует legacy RangeError для malformed date/time', () => {
    mockDeviceTimezone('Asia/Vladivostok')

    expect(() => toClientLocal('invalid-date', 'invalid-time', 'Europe/Moscow')).toThrow(RangeError)
    expect(() => toMasterLocal('invalid-date', 'invalid-time', 'Europe/Moscow')).toThrow(RangeError)
  })

  it('сохраняет instant при round trip через DST boundary', () => {
    mockDeviceTimezone('America/New_York')

    const client = toClientLocal('2026-03-29', '01:30', 'Europe/Berlin')
    const master = toMasterLocal(client.date, client.time, 'Europe/Berlin')

    expect(client).toEqual({ date: '2026-03-28', time: '20:30' })
    expect(master).toEqual({ date: '2026-03-29', time: '01:30' })
  })
})
