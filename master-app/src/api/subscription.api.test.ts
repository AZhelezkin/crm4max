import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { server } from '@/test/msw/server'

import { subscriptionApi } from './subscription.api'

describe('subscription API', () => {
  it('запускает trial по exact endpoint', async () => {
    const response = { paymentURL: 'https://pay.test/trial' }
    server.use(http.post('*/api/subscription/trial', () => HttpResponse.json(response)))

    await expect(subscriptionApi.startTrial()).resolves.toEqual(response)
  })

  it.each([
    ['default month', undefined, 'MONTH'],
    ['month', 'MONTH', 'MONTH'],
    ['year', 'YEAR', 'YEAR'],
  ] as const)('передаёт period для %s', async (_label, input, expectedPeriod) => {
    let body: object | null = null
    const response = { paymentURL: `https://pay.test/${expectedPeriod.toLowerCase()}` }
    server.use(
      http.post('*/api/subscription/pay', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(response)
      }),
    )

    const result = input ? await subscriptionApi.pay(input) : await subscriptionApi.pay()

    expect(body).toEqual({ period: expectedPeriod })
    expect(result).toEqual(response)
  })

  it('получает текущее состояние подписки', async () => {
    const subscription = createSubscriptionState()
    server.use(http.get('*/api/subscription/me', () => HttpResponse.json(subscription)))

    await expect(subscriptionApi.getMe()).resolves.toEqual(subscription)
  })

  it('сохраняет null для отсутствующей подписки', async () => {
    server.use(http.get('*/api/subscription/me', () => HttpResponse.json(null)))

    await expect(subscriptionApi.getMe()).resolves.toBeNull()
  })
})
