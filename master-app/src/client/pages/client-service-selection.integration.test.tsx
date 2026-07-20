import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientMaster } from '@/test/fixtures/masters'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({ getById: vi.fn() }))

vi.mock('@client/api/masters.api', () => ({
  mastersApi: { getById: api.getById },
}))

import ServiceDetailPage from './ServiceDetailPage'
import ServiceSelectPage from './ServiceSelectPage'
import { useBookingStore } from '../store/booking.store'

function resetBookingStore() {
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

describe('client service selection journeys', () => {
  beforeEach(() => {
    api.getById.mockReset()
    resetBookingStore()
  })

  it('показывает flat list, открывает search mode и выбирает authoritative service', async () => {
    const haircut = createClientService({ id: 'service-haircut', name: 'Стрижка' })
    const coloring = createClientService({
      id: 'service-color',
      name: 'Окрашивание',
      description: 'Сложная техника блонд',
    })
    api.getById.mockResolvedValue(createClientMaster({ services: [haircut, coloring] }))
    const view = renderAtRoute(<ServiceSelectPage />, { route: '/book/services' })

    expect(await screen.findByText('Стрижка')).toBeInTheDocument()
    expect(screen.getByText('Окрашивание')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Поиск' }))
    expect(view.getLocation().pathname + view.getLocation().search).toBe('/book/services?search=1')
  })

  it('search фильтрует имя/описание, очищается и показывает empty result', async () => {
    const haircut = createClientService({ id: 'service-haircut', name: 'Стрижка' })
    const coloring = createClientService({
      id: 'service-color',
      name: 'Окрашивание',
      description: 'Сложная техника блонд',
    })
    api.getById.mockResolvedValue(createClientMaster({ services: [haircut, coloring] }))
    const view = renderAtRoute(<ServiceSelectPage />, { route: '/book/services?search=1' })
    const input = await screen.findByPlaceholderText('Поиск')

    await view.user.type(input, 'блонд')
    expect(screen.getByText('Окрашивание')).toBeInTheDocument()
    expect(screen.queryByText('Стрижка')).not.toBeInTheDocument()
    await view.user.clear(input)
    await view.user.type(input, 'маникюр')
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(input).toHaveValue('')
  })

  it('service selection сохраняет service и открывает detail route', async () => {
    const service = createClientService({ id: 'service-selected', name: 'Выбранная услуга' })
    api.getById.mockResolvedValue(createClientMaster({ services: [service] }))
    const view = renderAtRoute(<ServiceSelectPage />, { route: '/book/services' })

    await view.user.click(await screen.findByRole('button', { name: /Выбранная услуга/ }))

    expect(useBookingStore.getState().service).toEqual(service)
    expect(view.getLocation().pathname).toBe('/book/service')
  })

  it('detail отправляет regular service в calendar, а package очищает slots', async () => {
    useBookingStore.getState().setService(createClientService({ name: 'Обычная услуга', sessionsCount: 1 }))
    const view = renderAtRoute(<ServiceDetailPage />, { route: '/book/service' })

    await view.user.click(screen.getByRole('button', { name: 'Выбрать дату' }))
    expect(view.getLocation().pathname).toBe('/book/calendar')

    await act(async () => {
      useBookingStore.getState().setService(createClientService({ name: 'Курс', sessionsCount: 3 }))
      useBookingStore.getState().setSlots([{ date: '2026-07-21', time: '10:00' }])
    })
    await view.user.click(screen.getByRole('button', { name: 'Выбрать дату' }))
    expect(view.getLocation().pathname).toBe('/book/package')
    expect(useBookingStore.getState().slots).toEqual([])
  })

  it('detail back использует реальную history entry', async () => {
    useBookingStore.getState().setService(createClientService())
    const view = renderAtRoute(<ServiceDetailPage />, {
      entries: ['/book/services', '/book/service'],
    })

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(view.getLocation().pathname).toBe('/book/services')
  })

  it('gallery передаёт exact download/share arguments', async () => {
    const webApp = installWebApp()
    useBookingStore.getState().setService(createClientService({
      name: 'Фотоуслуга',
      workPhotos: [{ id: 'photo-1', url: 'https://cdn.test/work/photo-one.jpg', order: 0 }],
    }))
    const view = renderAtRoute(<ServiceDetailPage />, { route: '/book/service' })
    const image = document.querySelector<HTMLImageElement>('img[src="https://cdn.test/work/photo-one.jpg"]')
    expect(image).not.toBeNull()

    await view.user.click(image!)
    const toolbar = screen.getByRole('button', { name: 'Скачать' }).parentElement
    expect(toolbar).not.toBeNull()
    await view.user.click(within(toolbar!).getByRole('button', { name: 'Скачать' }))
    await view.user.click(within(toolbar!).getByRole('button', { name: 'Ещё' }))
    await view.user.click(screen.getByRole('button', { name: 'Поделиться' }))

    expect(webApp.downloadFile).toHaveBeenCalledWith(
      'https://cdn.test/work/photo-one.jpg',
      'photo-one.jpg',
    )
    expect(webApp.shareContent).toHaveBeenCalledWith({
      text: 'Фотоуслуга\nhttps://cdn.test/work/photo-one.jpg',
    })
  })
})
