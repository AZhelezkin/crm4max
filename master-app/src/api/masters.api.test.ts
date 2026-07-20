import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { MASTER_ID, REVIEW_ID, SERVICE_ID } from '@/test/fixtures/auth'
import { createMasterProfile } from '@/test/fixtures/masters'
import { server } from '@/test/msw/server'

import { mastersApi } from './masters.api'

describe('master profile API', () => {
  it('получает текущий профиль', async () => {
    const master = createMasterProfile()
    server.use(http.get('*/api/masters/me', () => HttpResponse.json(master)))

    await expect(mastersApi.getMe()).resolves.toEqual(master)
  })

  it('извлекает reviews из master response', async () => {
    const reviews = [{
      id: REVIEW_ID,
      rating: 5,
      text: 'Отлично',
      createdAt: '2026-07-01T10:00:00.000Z',
      client: { name: 'Ирина', photo: null },
    }]
    server.use(
      http.get(`*/api/masters/${MASTER_ID}`, () => HttpResponse.json({ reviews })),
    )

    await expect(mastersApi.getReviews(MASTER_ID)).resolves.toEqual(reviews)
  })

  it('обновляет только переданные profile fields', async () => {
    const payload = { name: 'Новое имя', homeVisit: false, locationNote: null }
    const master = createMasterProfile(payload)
    let body: object | null = null
    server.use(
      http.put('*/api/masters/me', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(master)
      }),
    )

    const result = await mastersApi.updateProfile(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(master)
  })

  it('обновляет payment settings', async () => {
    const payload = { cardNumber: '2200000000000000', vkPayLinked: true }
    const master = createMasterProfile({ cardNumber: payload.cardNumber, vkPayLinked: true })
    let body: object | null = null
    server.use(
      http.put('*/api/masters/me/payment', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(master)
      }),
    )

    const result = await mastersApi.updatePayment(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(master)
  })

  it('передаёт date и serviceId в slots query', async () => {
    let query = ''
    server.use(
      http.get(`*/api/schedule/${MASTER_ID}/slots`, ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json(['10:00', '11:00'])
      }),
    )

    const result = await mastersApi.getSlots(MASTER_ID, '2026-07-21', SERVICE_ID)

    expect(query).toBe(`?date=2026-07-21&serviceId=${SERVICE_ID}`)
    expect(result).toEqual(['10:00', '11:00'])
  })

  it('передаёт range и serviceId в availability query', async () => {
    let query = ''
    const availability = { '2026-07-21': true, '2026-07-22': false }
    server.use(
      http.get(`*/api/schedule/${MASTER_ID}/availability`, ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json(availability)
      }),
    )

    const result = await mastersApi.getAvailability(
      MASTER_ID,
      '2026-07-21',
      '2026-07-31',
      SERVICE_ID,
    )

    expect(query).toBe(`?from=2026-07-21&to=2026-07-31&serviceId=${SERVICE_ID}`)
    expect(result).toEqual(availability)
  })
})
