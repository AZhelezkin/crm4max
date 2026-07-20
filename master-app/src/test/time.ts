import { vi } from 'vitest'

export const FIXED_NOW = '2026-07-19T09:30:00.000Z'

export function useFixedTime(iso = FIXED_NOW) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

export function mockDeviceTimezone(timeZone: string) {
  const original = new Intl.DateTimeFormat().resolvedOptions()
  return vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...original,
    timeZone,
  })
}
