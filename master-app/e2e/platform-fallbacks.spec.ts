import {
  BOOKING_ID,
  CLIENT_ID,
  MASTER_ID,
  clientBooking,
  expect,
  installBrowserCapabilities,
  installClientApi,
  installMasterApi,
  installMaxWebApp,
  masterBooking,
  seedStorage,
  test,
} from './fixtures'

test('support browser fallback открывает returned URL без live navigation', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  await installBrowserCapabilities(page)
  installClientApi(api)
  api.respond('POST', '/api/support/start', { ok: true, botUrl: 'https://max.ru/e2e-support' })

  await page.goto(`./?startapp=${MASTER_ID}`)
  await page.getByRole('button', { name: 'Поддержка' }).click()

  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __e2ePlatformCalls: { windowOpen: Array<[string, string]> } })
      .__e2ePlatformCalls.windowOpen,
  )).toEqual([['https://max.ru/e2e-support', '_blank']])
})

test('share, clipboard и QR download используют browser capabilities', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await installBrowserCapabilities(page)
  installMasterApi(api)

  await page.goto('./?startapp=mmode#/share')
  await expect(page.getByText('Ссылка для записи')).toBeVisible()
  await page.getByTitle('Поделиться').click()
  await page.getByRole('button', { name: 'Скопировать ссылку' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать QR-код' }).click()
  const download = await downloadPromise

  const calls = await page.evaluate(() =>
    (window as typeof window & {
      __e2ePlatformCalls: { share: ShareData[]; clipboard: string[] }
    }).__e2ePlatformCalls,
  )
  expect(calls.share).toEqual([{
    title: 'Анна Мастерова',
    text: 'Записывайтесь ко мне через Max: Анна Мастерова',
    url: `https://max.ru/id9706002253_1_bot?start=${MASTER_ID}`,
  }])
  expect(calls.clipboard).toEqual([`https://max.ru/id9706002253_1_bot?start=${MASTER_ID}`])
  expect(download.suggestedFilename()).toBe('qr-code.png')
})

test('calendar browser branch получает authoritative booking arguments', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await installBrowserCapabilities(page)
  installMasterApi(api)
  api.respond('GET', `/api/bookings/${BOOKING_ID}`, masterBooking())

  await page.goto(`./?startapp=mmode#/bookings/${BOOKING_ID}`)
  await page.getByRole('button', { name: /Добавить в календарь/ }).click()

  const opened = await page.evaluate(() =>
    (window as typeof window & { __e2ePlatformCalls: { windowOpen: Array<[string, string]> } })
      .__e2ePlatformCalls.windowOpen,
  )
  expect(opened).toHaveLength(1)
  expect(opened[0][0]).toContain('calendar.google.com/calendar/render')
  expect(new URL(opened[0][0]).searchParams.get('text')).toContain('Стрижка')
})

test('QR WebApp double сохраняет master identity и открывает profile', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  await installMaxWebApp(page, { codeResult: MASTER_ID })
  installClientApi(api)
  api.respond('POST', '/api/auth/max', { token: 'e2e-client-token', userId: CLIENT_ID, role: 'client' })

  await page.goto('./')
  await page.getByRole('button', { name: 'Сканировать' }).click()

  await expect(page.getByText('Анна Мастерова').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __e2ePlatformCalls: { openCodeReader: number } })
      .__e2ePlatformCalls.openCodeReader,
  )).toBe(1)
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('booking-draft'))).toContain(MASTER_ID)
})

const destinationContext = {
  status: 'ok',
  data: {
    clientName: 'Ирина Клиентова', serviceName: 'Стрижка', date: '2030-01-10', time: '10:00',
    clientAddress: 'Москва, Дом 1', expiresAt: '2030-01-01T00:00:00.000Z', draftVersion: 1,
  },
}

test('destination selector success сохраняет exact address и закрывает WebApp', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await installMaxWebApp(page, { startParam: 'm-dest-destination-success' })
  installMasterApi(api)
  api.respond('GET', '/api/master-assistant/destination-selector/destination-success', destinationContext)
  api.respond('POST', '/api/master-assistant/destination-selector/destination-success', { status: 'ok' })

  await page.goto('./')
  await expect(page.getByPlaceholder('Улица, дом, квартира')).toHaveValue('Москва, Дом 1')
  await page.getByRole('button', { name: 'Продолжить' }).click()
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __e2ePlatformCalls: { close: number } }).__e2ePlatformCalls.close,
  )).toBe(1)
  const save = api.callsFor('POST', '/api/master-assistant/destination-selector/destination-success')
  expect(save).toHaveLength(1)
  expect(save[0].postDataJSON()).toEqual({ clientAddress: 'Москва, Дом 1' })
})

test('destination selector error остаётся retryable и не закрывает WebApp', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await installMaxWebApp(page, { startParam: 'm-dest-destination-error' })
  installMasterApi(api)
  api.respond('GET', '/api/master-assistant/destination-selector/destination-error', destinationContext)
  api.respond('POST', '/api/master-assistant/destination-selector/destination-error', { status: 'invalid_address' })

  await page.goto('./')
  await page.getByRole('button', { name: 'Продолжить' }).click()

  await expect(page.getByRole('button', { name: 'Продолжить' })).toBeEnabled()
  expect(api.callsFor('POST', '/api/master-assistant/destination-selector/destination-error')).toHaveLength(1)
  expect(await page.evaluate(() =>
    (window as typeof window & { __e2ePlatformCalls: { close: number } }).__e2ePlatformCalls.close,
  )).toBe(0)
})
