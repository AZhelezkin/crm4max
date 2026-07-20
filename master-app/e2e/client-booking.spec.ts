import dayjs from 'dayjs'

import {
  BOOKING_ID,
  MASTER_ID,
  SERVICE_ID,
  clientBooking,
  expect,
  installClientApi,
  seedStorage,
  test,
} from './fixtures'

function installAvailability(api: import('./fixtures').ApiMock) {
  api.use((request) => {
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.pathname !== `/api/schedule/${MASTER_ID}/availability`) return undefined
    const from = dayjs(url.searchParams.get('from'))
    const to = dayjs(url.searchParams.get('to'))
    const body: Record<string, boolean> = {}
    for (let date = from; !date.isAfter(to); date = date.add(1, 'day')) body[date.format('YYYY-MM-DD')] = true
    return { body }
  })
  api.respond('GET', `/api/schedule/${MASTER_ID}/slots`, [
    { time: '12:00', masterDate: '2030-01-10', masterTime: '10:00' },
  ])
}

async function pickFirstEnabledCalendarDay(page: import('@playwright/test').Page) {
  const days = page.getByRole('button', { name: /^\d{1,2}$/ })
  for (let index = 0; index < await days.count(); index += 1) {
    const day = days.nth(index)
    if (await day.isEnabled()) {
      await day.click()
      return
    }
  }
  throw new Error('No enabled client calendar day')
}

test('UUID profile → service → slot → persisted confirm → authoritative success', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)
  installAvailability(api)
  api.use((request) => {
    const url = new URL(request.url())
    if (request.method() !== 'POST' || url.pathname !== '/api/bookings') return undefined
    const payload = request.postDataJSON() as { date: string; time: string }
    return { body: clientBooking({ id: 'booking-client-created', date: payload.date, time: payload.time }) }
  })
  api.respond('GET', '/api/bookings/booking-client-created', clientBooking({ id: 'booking-client-created' }))

  await page.goto(`./?startapp=${MASTER_ID}`)
  await page.getByRole('button', { name: /Стрижка/ }).click()
  await expect(page).toHaveURL(/#\/book\/service$/)
  await page.getByRole('button', { name: 'Выбрать дату' }).click()
  await pickFirstEnabledCalendarDay(page)
  await page.getByRole('button', { name: '12:00' }).click()
  await expect(page).toHaveURL(/#\/book\/confirm$/)

  const persisted = await page.evaluate(() => sessionStorage.getItem('booking-draft'))
  expect(persisted).toContain(SERVICE_ID)
  await page.reload()
  await expect(page.getByText('Подтверждение')).toBeVisible()
  expect(api.callsFor('POST', '/api/bookings')).toHaveLength(0)

  await page.getByRole('button', { name: 'Записаться' }).click()

  await expect(page).toHaveURL(/#\/book\/success$/)
  await expect(page.getByText('Вы записаны!')).toBeVisible()
  const writes = api.callsFor('POST', '/api/bookings')
  expect(writes).toHaveLength(1)
  expect(writes[0].postDataJSON()).toEqual({
    masterId: MASTER_ID,
    serviceId: SERVICE_ID,
    date: '2030-01-10',
    time: '10:00',
    remind: true,
    clientAddress: null,
  })
})

test('existing booking reschedule пишет canonical slot без create', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)
  installAvailability(api)
  api.respond('GET', `/api/bookings/${BOOKING_ID}`, clientBooking())
  api.respond('POST', `/api/bookings/${BOOKING_ID}/reschedule`, clientBooking({ date: '2030-01-10', time: '10:00' }))

  await page.goto(`./?startapp=${MASTER_ID}#/my-bookings/${BOOKING_ID}`)
  await page.getByRole('button', { name: 'Перенести' }).click()
  await pickFirstEnabledCalendarDay(page)
  await page.getByRole('button', { name: '12:00' }).click()
  await expect(page).toHaveURL(/#\/book\/confirm$/)
  await page.getByRole('button', { name: 'Перенести' }).click()

  await expect(page).toHaveURL(/#\/my-bookings$/)
  expect(api.callsFor('POST', '/api/bookings')).toHaveLength(0)
  const writes = api.callsFor('POST', `/api/bookings/${BOOKING_ID}/reschedule`)
  expect(writes).toHaveLength(1)
  expect(writes[0].postDataJSON()).toEqual({ date: '2030-01-10', time: '10:00' })
})

test('existing booking cancel выполняет один explicit action и остаётся retry-safe', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)
  api.respond('GET', `/api/bookings/${BOOKING_ID}`, clientBooking())
  api.respond('POST', `/api/bookings/${BOOKING_ID}/cancel`, clientBooking({ status: 'CANCELLED' }))

  await page.goto(`./?startapp=${MASTER_ID}#/my-bookings/${BOOKING_ID}`)
  await expect(page.getByText('Вы записаны!')).toBeVisible()
  expect(api.callsFor('POST', `/api/bookings/${BOOKING_ID}/cancel`)).toHaveLength(0)
  await page.getByRole('button', { name: 'Отменить' }).click()

  await expect(page).toHaveURL(/#\/my-bookings$/)
  expect(api.callsFor('POST', `/api/bookings/${BOOKING_ID}/cancel`)).toHaveLength(1)
})
