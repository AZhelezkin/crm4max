import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { SERVICE_ID } from '@/test/fixtures/auth'
import { createMasterService } from '@/test/fixtures/services'
import { server } from '@/test/msw/server'

import { servicesApi } from './services.api'

const PHOTO_ID = '41000000-0000-4000-8000-000000000004'

describe('master services API', () => {
  it('получает список услуг', async () => {
    const service = createMasterService()
    server.use(http.get('*/api/services', () => HttpResponse.json([service])))

    await expect(servicesApi.list()).resolves.toEqual([service])
  })

  it('создаёт услугу с exact payload', async () => {
    const payload = {
      name: 'Новая услуга',
      description: null,
      duration: 90,
      price: 300_000,
      discountPercent: 10,
      sessionsCount: 2,
      photo: null,
    }
    const service = createMasterService(payload)
    let body: object | null = null
    server.use(
      http.post('*/api/services', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(service)
      }),
    )

    const result = await servicesApi.create(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(service)
  })

  it('обновляет услугу по id', async () => {
    const payload = { name: 'Обновлённая услуга', isActive: false, discountPercent: null }
    const service = createMasterService(payload)
    let body: object | null = null
    server.use(
      http.put(`*/api/services/${SERVICE_ID}`, async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(service)
      }),
    )

    const result = await servicesApi.update(SERVICE_ID, payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(service)
  })

  it('удаляет услугу по id', async () => {
    server.use(http.delete(`*/api/services/${SERVICE_ID}`, () => new HttpResponse(null, { status: 204 })))

    const response = await servicesApi.remove(SERVICE_ID)

    expect(response.status).toBe(204)
  })

  it('добавляет work photo с order', async () => {
    const photo = { id: PHOTO_ID, url: 'https://cdn.test/photo.jpg', order: 2 }
    let body: object | null = null
    server.use(
      http.post(`*/api/services/${SERVICE_ID}/photos`, async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(photo)
      }),
    )

    const result = await servicesApi.addWorkPhoto(SERVICE_ID, photo.url, photo.order)

    expect(body).toEqual({ url: photo.url, order: 2 })
    expect(result).toEqual(photo)
  })

  it('удаляет work photo по photo id', async () => {
    server.use(
      http.delete(`*/api/services/photos/${PHOTO_ID}`, () => new HttpResponse(null, { status: 204 })),
    )

    const response = await servicesApi.removeWorkPhoto(PHOTO_ID)

    expect(response.status).toBe(204)
  })

  it('получает grouped popular services', async () => {
    const groups = [{ section: 'Красота', services: [{ id: SERVICE_ID, name: 'Стрижка' }] }]
    server.use(http.get('*/api/services/popular', () => HttpResponse.json(groups)))

    await expect(servicesApi.getPopular()).resolves.toEqual(groups)
  })
})
