import {
  BOOKING_ID,
  MASTER_ID,
  clientBooking,
  expect,
  installClientApi,
  installMasterApi,
  installMaxWebApp,
  seedStorage,
  test,
} from './fixtures'

test('MAX start_param имеет приоритет и открывает master shell', async ({ page, api }) => {
  await seedStorage(page, { master: true, client: true })
  await installMaxWebApp(page, { startParam: 'mmode' })
  installMasterApi(api)

  await page.goto(`./?startapp=${MASTER_ID}`)

  expect(new URL(page.url()).pathname).toBe('/crm4max/')
  const sameOriginAssets = await page.locator('script[src], link[href]').evaluateAll((elements) => (
    elements
      .map((element) => new URL(
        element instanceof HTMLScriptElement ? element.src : (element as HTMLLinkElement).href,
      ))
      .filter((url) => url.origin === window.location.origin)
      .map((url) => url.pathname)
  ))
  expect(sameOriginAssets.length).toBeGreaterThan(0)
  expect(sameOriginAssets.every((path) => path.startsWith('/crm4max/'))).toBe(true)
  await expect(page.getByText('Анна Мастерова').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Создать запись/ })).toBeVisible()
})

test('browser masterId fallback открывает client profile', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)

  await page.goto(`./?masterId=${MASTER_ID}`)

  await expect(page.getByText('Анна Мастерова').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Запись' })).toBeVisible()
})

test('client composite deep link одноразовый внутри instance и восстанавливается после reload', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)
  api.respond('GET', `/api/bookings/${BOOKING_ID}`, clientBooking())

  await page.goto(`./?startapp=${MASTER_ID}-${BOOKING_ID}`)

  await expect(page).toHaveURL(new RegExp(`#\/my-bookings\/${BOOKING_ID}$`))
  await expect(page.getByText('Вы записаны!')).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть' }).click()
  await expect(page).toHaveURL(/#\/my-bookings$/)

  await page.evaluate(() => { window.location.hash = '#/' })
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByText('Анна Мастерова').first()).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(new RegExp(`#\/my-bookings\/${BOOKING_ID}$`))
})

test('cmasters открывает recent masters и выбор возвращает profile', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)

  await page.goto('./?startapp=cmasters')

  await expect(page).toHaveURL(/#\/masters$/)
  await page.getByRole('button', { name: /Анна Мастерова/ }).click()
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByText('Анна Мастерова').first()).toBeVisible()
})

test('master composite и destination selector сохраняют exact launch identity', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  installMasterApi(api)
  api.respond('GET', `/api/bookings/${BOOKING_ID}`, {
    ...clientBooking(),
    payments: [],
  })

  await page.goto(`./?startapp=m-${MASTER_ID}-${BOOKING_ID}`)
  await expect(page).toHaveURL(new RegExp(`#\/bookings\/${BOOKING_ID}$`))
  await expect(page.getByText('Ирина Клиентова')).toBeVisible()

  const selectorToken = 'selector-e2e-token'
  api.respond('GET', `/api/master-assistant/destination-selector/${selectorToken}`, {
    status: 'ok',
    data: {
      clientName: 'Ирина Клиентова',
      serviceName: 'Стрижка',
      date: '2030-01-10',
      time: '10:00',
      clientAddress: 'Москва, Дом 1',
      expiresAt: '2030-01-01T00:00:00.000Z',
      draftVersion: 1,
    },
  })
  await page.goto(`./?startapp=m-dest-${selectorToken}`)
  await expect(page.getByText('Укажите адрес клиента')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Продолжить' })).toBeEnabled()
})
