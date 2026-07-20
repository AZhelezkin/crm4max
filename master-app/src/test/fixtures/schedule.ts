import type { Schedule as ClientSchedule } from '@client/types'
import type { Schedule as MasterSchedule } from '@/types'

export function createMasterSchedule(overrides: Partial<MasterSchedule> = {}): MasterSchedule {
  return {
    id: '90000000-0000-4000-8000-000000000009',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    bufferMinutes: 15,
    ...overrides,
  }
}

export function createClientSchedule(overrides: Partial<ClientSchedule> = {}): ClientSchedule {
  const schedule = createMasterSchedule()
  return {
    workingDays: schedule.workingDays,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakStart: schedule.breakStart,
    breakEnd: schedule.breakEnd,
    bufferMinutes: schedule.bufferMinutes,
    ...overrides,
  }
}
