import { api } from './client'
import type { Schedule } from '@/types'

export const scheduleApi = {
  get: () =>
    api.get<Schedule>('/schedule/me').then((r) => r.data),

  upsert: (data: {
    workingDays: number[]
    startTime: string
    endTime: string
    breakStart?: string | null
    breakEnd?: string | null
    bufferMinutes: number
  }) => api.put<Schedule>('/schedule/me', data).then((r) => r.data),
}
