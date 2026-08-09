import { api } from './client'
import type { EffectiveWorkWindow, Schedule } from '@/types'

export const scheduleApi = {
  get: () =>
    api.get<Schedule>('/schedule/me').then((r) => r.data),

  getEffectiveWindows: (date: string) =>
    api.get<EffectiveWorkWindow[]>('/schedule/me/windows', { params: { date } }).then((r) => r.data),

  upsert: (data: {
    workingDays: number[]
    startTime: string
    endTime: string
    breakStart?: string | null
    breakEnd?: string | null
    bufferMinutes: number
  }) => api.put<Schedule>('/schedule/me', data).then((r) => r.data),
}
