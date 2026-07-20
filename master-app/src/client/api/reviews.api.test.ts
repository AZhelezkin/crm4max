import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { BOOKING_ID, REVIEW_ID } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'

import { reviewsApi } from './reviews.api'

describe('client reviews API', () => {
  it('создаёт отзыв с exact payload', async () => {
    const payload = { bookingId: BOOKING_ID, rating: 5, text: 'Отлично' }
    const review = {
      id: REVIEW_ID,
      rating: 5,
      text: 'Отлично',
      createdAt: '2026-07-21T12:00:00.000Z',
      client: { name: 'Ирина Клиентова', photo: null },
    }
    let body: object | null = null
    server.use(
      http.post('*/api/reviews', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json(review)
      }),
    )

    const result = await reviewsApi.create(payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(review)
  })

  it('не добавляет отсутствующий optional text', async () => {
    const payload = { bookingId: BOOKING_ID, rating: 4 }
    let body: object | null = null
    server.use(
      http.post('*/api/reviews', async ({ request }) => {
        body = await request.json() as object
        return HttpResponse.json({
          id: REVIEW_ID,
          rating: 4,
          text: null,
          createdAt: '2026-07-21T12:00:00.000Z',
          client: { name: 'Ирина Клиентова', photo: null },
        })
      }),
    )

    await reviewsApi.create(payload)

    expect(body).toEqual(payload)
  })
})
