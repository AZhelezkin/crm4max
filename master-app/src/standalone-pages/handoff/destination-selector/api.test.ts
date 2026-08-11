import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createDestinationContext, DESTINATION_TOKEN } from '@/test/fixtures/destination-selector'
import { server } from '@/test/msw/server'

import { getDestinationSelectorContext, saveDestinationSelectorAddress, saveDestinationSelectorMasterLocation } from './api'

describe('destination selector API', () => {
  it('получает context по exact token path', async () => {
    const response = { status: 'ok' as const, data: createDestinationContext() }
    server.use(
      http.get(`*/api/master-assistant/destination-selector/${DESTINATION_TOKEN}`, () => (
        HttpResponse.json(response)
      )),
    )

    await expect(getDestinationSelectorContext(DESTINATION_TOKEN)).resolves.toEqual(response)
  })

  it('сохраняет адрес по exact token path', async () => {
    const address = 'Москва, Тестовая улица, 2'
    let body: object | null = null
    server.use(
      http.post(
        `*/api/master-assistant/destination-selector/${DESTINATION_TOKEN}`,
        async ({ request }) => {
          body = await request.json() as object
          return HttpResponse.json({ status: 'ok' })
        },
      ),
    )

    const result = await saveDestinationSelectorAddress(DESTINATION_TOKEN, address)

    expect(body).toEqual({ clientAddress: address })
    expect(result).toEqual({ status: 'ok' })
  })

  it('сохраняет постоянный адрес мастера с координатами', async () => {
    let body: object | null = null
    server.use(
      http.post(`*/api/master-assistant/destination-selector/${DESTINATION_TOKEN}`, async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    const result = await saveDestinationSelectorMasterLocation(DESTINATION_TOKEN, {
      location: 'Москва, Тестовая улица, 2',
      lat: 55.76,
      lng: 37.61,
    })

    expect(body).toEqual({ location: 'Москва, Тестовая улица, 2', lat: 55.76, lng: 37.61 })
    expect(result).toEqual({ status: 'ok' })
  })

  it('возвращает frontend-visible handoff status без преобразования', async () => {
    server.use(
      http.get(`*/api/master-assistant/destination-selector/${DESTINATION_TOKEN}`, () => (
        HttpResponse.json({ status: 'expired' })
      )),
    )

    await expect(getDestinationSelectorContext(DESTINATION_TOKEN)).resolves.toEqual({ status: 'expired' })
  })
})
