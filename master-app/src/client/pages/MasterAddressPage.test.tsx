import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { installWebApp } from '@/test/web-app-fixture'
import { MASTER_ID } from '@/test/fixtures/auth'

const api = vi.hoisted(() => ({ getAddressDetails: vi.fn() }))
vi.mock('@client/api/masters.api', () => ({ mastersApi: { getAddressDetails: api.getAddressDetails } }))

import { useBookingStore } from '@client/store/booking.store'
import MasterAddressPage from './MasterAddressPage'

describe('MasterAddressPage', () => {
  beforeEach(() => {
    api.getAddressDetails.mockReset()
    api.getAddressDetails.mockResolvedValue({
      location: 'Москва, Тестовая улица, 1',
      locationNote: 'Подъезд: 2\nДомофон: #402*\nЭтаж: 4\nКвартира/офис: 402\nКомментарий: Вход со двора',
      lat: 55.7,
      lng: 37.6,
    })
    useBookingStore.setState({ masterId: MASTER_ID })
  })

  it('показывает read-only реквизиты и копирует чистый адрес', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/master/address']}><Routes><Route path="/master/address" element={<MasterAddressPage />} /></Routes></MemoryRouter>)

    await screen.findByText('Москва, Тестовая улица, 1')
    expect(screen.getByLabelText('Подъезд')).toHaveTextContent('2')
    expect(screen.getByLabelText('Домофон')).toHaveTextContent('#402*')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: /Адрес Москва/ }))
    await user.click(screen.getByRole('button', { name: 'Скопировать' }))

    expect(writeText).toHaveBeenCalledWith('Москва, Тестовая улица, 1')
    expect(screen.getByRole('status')).toHaveTextContent('Скопировано')
  })

  it('открывает Android geo scheme через MAX bridge', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android')
    const webApp = installWebApp()
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/master/address']}><Routes><Route path="/master/address" element={<MasterAddressPage />} /></Routes></MemoryRouter>)
    await screen.findByText('Москва, Тестовая улица, 1')

    await user.click(screen.getByRole('button', { name: /Адрес Москва/ }))
    await user.click(screen.getByRole('button', { name: 'Открыть в картах' }))

    expect(webApp.openLink).toHaveBeenCalledWith('geo:55.7,37.6?q=55.7%2C37.6')
  })

  it('возвращается на профиль, если реквизиты недоступны', async () => {
    api.getAddressDetails.mockRejectedValue(new Error('forbidden'))
    render(<MemoryRouter initialEntries={['/master/address']}><Routes><Route path="/master/address" element={<MasterAddressPage />} /><Route path="/" element={<div>Профиль</div>} /></Routes></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Профиль')).toBeInTheDocument())
  })
})
