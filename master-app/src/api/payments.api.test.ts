import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { createPayment } from '@/test/fixtures/payments'
import { server } from '@/test/msw/server'

import { paymentsApi } from './payments.api'

describe('master payments API', () => {
  it('получает список платежей', async () => {
    const payment = createPayment()
    server.use(http.get('*/api/payments', () => HttpResponse.json([payment])))

    await expect(paymentsApi.list()).resolves.toEqual([payment])
  })

  it('экспортирует все платежи без date query', async () => {
    let search = 'not-read'
    const exportFile = { url: 'https://cdn.test/export.xlsx', filename: 'payments.xlsx' }
    server.use(
      http.get('*/api/payments/export', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(exportFile)
      }),
    )

    const result = await paymentsApi.exportXlsx()

    expect(search).toBe('')
    expect(result).toEqual(exportFile)
  })

  it('вычисляет tzOffset для полудня выбранной даты', async () => {
    const offsetDates: Array<{ year: number; month: number; day: number; hour: number }> = []
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function (this: Date) {
      offsetDates.push({
        year: this.getFullYear(),
        month: this.getMonth() + 1,
        day: this.getDate(),
        hour: this.getHours(),
      })
      return -180
    })
    let search = ''
    server.use(
      http.get('*/api/payments/export', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({ url: 'https://cdn.test/day.xlsx', filename: 'day.xlsx' })
      }),
    )

    await paymentsApi.exportXlsx('2026-07-21')

    expect(offsetDates).toEqual([{ year: 2026, month: 7, day: 21, hour: 12 }])
    const searchParams = new URLSearchParams(search)
    expect(searchParams.get('date')).toBe('2026-07-21')
    expect(searchParams.get('tzOffset')).toBe('-180')
  })
})
