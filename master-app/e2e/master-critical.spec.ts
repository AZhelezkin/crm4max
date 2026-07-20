import {
  MASTER_ID,
  expect,
  installMasterApi,
  masterBooking,
  seedStorage,
  test,
} from './fixtures'

test('authenticated home создаёт booking и показывает authoritative success', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  installMasterApi(api)
  api.respond('GET', `/api/schedule/${MASTER_ID}/slots`, ['10:00', '11:00'])
  api.use(async (request) => {
    const url = new URL(request.url())
    if (request.method() !== 'POST' || url.pathname !== '/api/bookings') return undefined
    const payload = request.postDataJSON() as { date: string; time: string }
    return { body: masterBooking({ id: 'booking-browser-created', date: payload.date, time: payload.time }) }
  })

  await page.goto('./?startapp=mmode')
  await page.getByRole('button', { name: /Создать запись/ }).click()
  await expect(page).toHaveURL(/#\/bookings\/new$/)

  await page.getByRole('button', { name: /Имя.*Выбрать/ }).click()
  await page.getByRole('button', { name: /Ирина Клиентова/ }).click()
  await page.getByRole('button', { name: /Наименование.*Выбрать/ }).click()
  await page.getByText('Стрижка', { exact: true }).click()
  await page.getByRole('button', { name: 'Выбрать', exact: true }).click()
  await page.getByRole('button', { name: /Время.*Выбрать/ }).click()
  await page.getByRole('button', { name: '10:00', exact: true }).click()

  expect(api.callsFor('POST', '/api/bookings')).toHaveLength(0)
  await page.getByRole('button', { name: 'Записать', exact: true }).click()

  await expect(page.getByText('Запись создана!')).toBeVisible()
  const writes = api.callsFor('POST', '/api/bookings')
  expect(writes).toHaveLength(1)
  expect(writes[0].postDataJSON()).toMatchObject({
    masterId: MASTER_ID,
    serviceId: '40000000-0000-4000-8000-000000000004',
    masterClientId: '50000000-0000-4000-8000-000000000005',
    time: '10:00',
    allowOverlap: true,
  })
})

test('subscription external return перепроверяется по focus и показывает success', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await page.addInitScript(() => {
    localStorage.setItem('sub:payPending', '1')
    localStorage.setItem('sub:preErr', 'old-error')
  })
  installMasterApi(api)
  let subscriptionReads = 0
  let returnActive = false
  api.use((request) => {
    const url = new URL(request.url())
    if (request.method() !== 'GET' || url.pathname !== '/api/subscription/me') return undefined
    subscriptionReads += 1
    return returnActive
      ? {
          body: {
            status: 'ACTIVE', trialEndsAt: null, currentPeriodEnd: '2030-01-01T00:00:00.000Z',
            graceEndsAt: null, cardPan: '2200••••1234', lastChargeError: null, hasAccess: true,
          },
        }
      : {
          body: {
            status: 'BLOCKED', trialEndsAt: null, currentPeriodEnd: null, graceEndsAt: null,
            cardPan: null, lastChargeError: 'old-error', hasAccess: false,
          },
        }
  })

  await page.goto('./?startapp=mmode')
  await expect(page.getByText('Выберите период подписки')).toBeVisible()

  returnActive = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))

  await expect(page.getByText('Подписка оформлена!')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sub:payPending'))).toBeNull()
  expect(subscriptionReads).toBeGreaterThanOrEqual(2)
})
