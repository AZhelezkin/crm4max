import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  checkAccess: vi.fn(),
  getMaster: vi.fn(),
  rememberVisit: vi.fn(),
  listBookings: vi.fn(),
  createReview: vi.fn(),
}))

vi.mock('@/App', () => ({ startParam: '' }))
vi.mock('@client/api/masters.api', () => ({
  mastersApi: { checkClientAccess: api.checkAccess, getById: api.getMaster, rememberVisit: api.rememberVisit },
}))
vi.mock('@client/api/bookings.api', () => ({
  bookingsApi: { list: api.listBookings },
}))
vi.mock('@client/api/reviews.api', () => ({
  reviewsApi: { create: api.createReview },
}))

import MasterCardPage from './MasterCardPage'
import { useBookingStore } from '../store/booking.store'

function seedStore() {
  useBookingStore.setState({
    masterId: MASTER_ID,
    masterProfileLink: null,
    rescheduleId: null,
    service: null,
    categoryName: null,
    date: '',
    time: '',
    slots: [],
    remind: true,
    clientAddress: null,
  })
}

describe('MasterCardPage contact and media effects', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.checkAccess.mockResolvedValue({ access: 'allowed' })
    api.listBookings.mockResolvedValue([])
    api.rememberVisit.mockResolvedValue(undefined)
    api.createReview.mockResolvedValue(undefined)
    seedStore()
  })

  it('показывает блокировку записи с телефоном мастера и заданной типографикой', async () => {
    api.getMaster.mockResolvedValue(createClientMaster({
      blocked: true,
      phone: '+7 (953) 888-22-44',
    }))

    renderAtRoute(<MasterCardPage />, { route: '/' })

    const title = await screen.findByText('Онлайн-запись недоступна')
    const explanation = screen.getByText(/Напомните мастеру/)
    const phone = screen.getByText('+7 (953) 888-22-44')
    expect(title).toHaveStyle({ fontSize: '24px', lineHeight: '30px', fontWeight: '700', whiteSpace: 'nowrap' })
    expect(explanation).toHaveStyle({ fontSize: '13px', lineHeight: '18px', fontWeight: '400' })
    expect(phone).toHaveStyle({ display: 'block' })
  })

  it('передаёт exact phone, MAX profile и shared contact', async () => {
    const webApp = installWebApp()
    api.getMaster.mockResolvedValue(createClientMaster({
      name: 'Анна Контактная',
      phone: '+7 (999) 123-45-67',
      maxProfileLink: 'https://max.ru/anna-contact',
    }))
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await screen.findByText('Анна Контактная')

    await view.user.click(screen.getByRole('button', { name: 'Звонок' }))
    await view.user.click(screen.getByRole('button', { name: 'Чат' }))
    await view.user.click(screen.getByRole('button', { name: 'Ещё' }))
    await view.user.click(screen.getByRole('button', { name: 'Поделиться контактом' }))

    expect(webApp.openLink).toHaveBeenCalledWith('tel:+79991234567')
    expect(webApp.openMaxLink).toHaveBeenCalledWith('https://max.ru/anna-contact')
    expect(webApp.shareContent).toHaveBeenCalledWith({
      text: `Запишитесь к мастеру Анна Контактная в Max:\nhttps://max.ru/id9706002253_1_bot?start=${MASTER_ID}`,
    })
  })

  it('передаёт exact master photo URL, filename и share text', async () => {
    const webApp = installWebApp()
    const photoUrl = 'https://cdn.test/master/work-image.webp?version=2'
    api.getMaster.mockResolvedValue(createClientMaster({
      services: [createClientService({
        name: 'Окрашивание',
        workPhotos: [{ id: 'master-photo', url: photoUrl, order: 0 }],
      })],
    }))
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await screen.findByText('Анна Мастерова')
    await view.user.click(screen.getByRole('button', { name: /Фото/ }))
    const image = document.querySelector<HTMLImageElement>(`img[src="${photoUrl}"]`)
    expect(image).not.toBeNull()

    await view.user.click(image!)
    const download = screen.getByRole('button', { name: 'Скачать' })
    const lightboxToolbar = download.parentElement
    expect(lightboxToolbar).not.toBeNull()
    await view.user.click(download)
    await view.user.click(within(lightboxToolbar!).getByRole('button', { name: 'Ещё' }))
    await view.user.click(screen.getByRole('button', { name: 'Поделиться' }))

    expect(webApp.downloadFile).toHaveBeenCalledWith(photoUrl, 'work-image.webp')
    expect(webApp.shareContent).toHaveBeenCalledWith({
      text: `Окрашивание\n${photoUrl}`,
    })
  })

  it('открывает внутренний экран адреса вместо внешней карты', async () => {
    const webApp = installWebApp()
    api.getMaster.mockResolvedValue(createClientMaster({ homeVisit: false, location: 'Москва, Дом 1' }))
    const view = renderAtRoute(<MasterCardPage />, { route: '/' })
    await screen.findByText('Москва, Дом 1')

    await view.user.click(screen.getByRole('button', { name: /Москва, Дом 1/ }))

    expect(view.getLocation().pathname).toBe('/master/address')
    expect(webApp.openLink).not.toHaveBeenCalled()
  })
})
