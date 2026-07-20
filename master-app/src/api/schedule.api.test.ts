import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createMasterSchedule } from '@/test/fixtures/schedule'
import { server } from '@/test/msw/server'

import { scheduleApi } from './schedule.api'

describe('master schedule API', () => {
  it('получает расписание мастера', async () => {
    const schedule = createMasterSchedule()
    server.use(http.get('*/api/schedule/me', () => HttpResponse.json(schedule)))

    await expect(scheduleApi.get()).resolves.toEqual(schedule)
  })

  it('сохраняет exact weekly schedule payload', async () => {
    const payload = {
      workingDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
      breakStart: null,
      breakEnd: null,
      bufferMinutes: 15,
    }
    const schedule = createMasterSchedule(payload)
    let body: object | null = null
    server.use(
      http.put('*/api/schedule/me', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(schedule)
      }),
    )

    const result = await scheduleApi.upsert(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(schedule)
  })
})
