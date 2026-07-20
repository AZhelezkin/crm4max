import AxeBuilder from '@axe-core/playwright'

import {
  MASTER_ID,
  clientMaster,
  expect,
  installClientApi,
  installMasterApi,
  installMaxWebApp,
  masterService,
  seedStorage,
  test,
} from './fixtures'

async function seriousOrCritical(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page }).analyze()
  return result.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(' ')).sort(),
    }))
}

test('master home accessibility baseline and keyboard focus', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  installMasterApi(api)
  await page.goto('./?startapp=mmode')
  await expect(page.getByRole('button', { name: /Создать запись/ })).toBeVisible()

  expect(await seriousOrCritical(page)).toEqual([])
  const create = page.getByRole('button', { name: /Создать запись/ })
  await create.focus()
  await expect(create).toBeFocused()
})

test('client profile accessibility baseline and keyboard focus', async ({ page, api }) => {
  await seedStorage(page, { client: true })
  installClientApi(api)
  await page.goto(`./?startapp=${MASTER_ID}`)
  await expect(page.getByRole('button', { name: 'Запись' })).toBeVisible()

  expect(await seriousOrCritical(page)).toEqual([])
  const booking = page.getByRole('button', { name: 'Запись' })
  await booking.focus()
  await expect(booking).toBeFocused()
})

test('client booking confirmation accessibility baseline and critical action focus', async ({ page, api }) => {
  const draft = JSON.stringify({
    state: {
      masterId: MASTER_ID,
      masterProfileLink: clientMaster.maxProfileLink,
      rescheduleId: null,
      service: masterService,
      categoryName: null,
      date: '2030-01-10',
      time: '10:00',
      slots: [],
      remind: true,
      clientAddress: null,
    },
    version: 0,
  })
  await seedStorage(page, { client: true, session: { 'booking-draft': draft } })
  installClientApi(api)
  await page.goto(`./?startapp=${MASTER_ID}#/book/confirm`)
  const submit = page.getByRole('button', { name: 'Записаться' })
  await expect(submit).toBeVisible()

  expect(await seriousOrCritical(page)).toEqual([])
  await submit.focus()
  await expect(submit).toBeFocused()
})

test('destination selector accessibility baseline and keyboard focus', async ({ page, api }) => {
  await seedStorage(page, { master: true })
  await installMaxWebApp(page, { startParam: 'm-dest-a11y-token' })
  installMasterApi(api)
  api.respond('GET', '/api/master-assistant/destination-selector/a11y-token', {
    status: 'ok',
    data: {
      clientName: 'Ирина Клиентова', serviceName: 'Стрижка', date: '2030-01-10', time: '10:00',
      clientAddress: 'Москва, Дом 1', expiresAt: '2030-01-01T00:00:00.000Z', draftVersion: 1,
    },
  })
  await page.goto('./')
  const submit = page.getByRole('button', { name: 'Продолжить' })
  await expect(submit).toBeEnabled()

  expect(await seriousOrCritical(page)).toEqual([])
  await submit.focus()
  await expect(submit).toBeFocused()
})
