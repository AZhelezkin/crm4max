import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { MASTER_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { server } from '@/test/msw/server'
import { mockDeviceTimezone } from '@/test/time'

import { mastersApi } from './masters.api'

describe('client masters API', () => {
  it('получает профиль мастера по id', async () => {
    const master = createClientMaster()
    server.use(http.get(`*/api/masters/${MASTER_ID}`, () => HttpResponse.json(master)))

    await expect(mastersApi.getById(MASTER_ID)).resolves.toEqual(master)
  })

  it('получает список последних мастеров', async () => {
    const recent = [{
      id: MASTER_ID,
      name: 'Анна Мастерова',
      photo: null,
      description: 'Тестовый профиль',
    }]
    server.use(http.get('*/api/masters/recent', () => HttpResponse.json(recent)))

    await expect(mastersApi.getRecentMasters()).resolves.toEqual(recent)
  })

  it('передаёт client timezone в slots query', async () => {
    mockDeviceTimezone('Asia/Vladivostok')
    let search = ''
    const slots = [{ time: '17:00', masterDate: '2026-07-21', masterTime: '10:00' }]
    server.use(
      http.get(`*/api/schedule/${MASTER_ID}/slots`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(slots)
      }),
    )

    const result = await mastersApi.getSlots(MASTER_ID, '2026-07-21', SERVICE_ID)

    expect(search).toBe(`?date=2026-07-21&serviceId=${SERVICE_ID}&tz=Asia%2FVladivostok`)
    expect(result).toEqual(slots)
  })

  it('передаёт client timezone и range в availability query', async () => {
    mockDeviceTimezone('Europe/Kaliningrad')
    let search = ''
    const availability = { '2026-07-21': true }
    server.use(
      http.get(`*/api/schedule/${MASTER_ID}/availability`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(availability)
      }),
    )

    const result = await mastersApi.getAvailability(
      MASTER_ID,
      '2026-07-21',
      '2026-07-31',
      SERVICE_ID,
    )

    expect(search).toBe(
      `?from=2026-07-21&to=2026-07-31&serviceId=${SERVICE_ID}&tz=Europe%2FKaliningrad`,
    )
    expect(result).toEqual(availability)
  })
})
