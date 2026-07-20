import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'
import { createClientService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'

const platform = vi.hoisted(() => ({
  send: vi.fn(),
  startSupport: vi.fn(),
}))

vi.mock('@vkontakte/vk-bridge', () => ({
  default: { send: platform.send },
}))
vi.mock('@client/api/support.api', () => ({
  startSupport: platform.startSupport,
}))

import DepositPage from './DepositPage'
import MessagesPage from './MessagesPage'
import { useBookingStore } from '../store/booking.store'

describe('client secondary pages', () => {
  beforeEach(() => {
    platform.send.mockReset()
    platform.startSupport.mockReset()
    platform.startSupport.mockResolvedValue({ ok: true, botUrl: 'https://max.ru/support' })
    useBookingStore.setState({
      masterId: MASTER_ID,
      masterProfileLink: 'https://max.ru/master',
      service: createClientService({ name: 'Окрашивание' }),
    })
    vi.stubEnv('VITE_VK_APP_ID', '12345')
  })

  it('DepositPage отправляет exact legacy bridge payload и открывает success', async () => {
    platform.send.mockResolvedValue({ status: true })
    const view = renderAtRoute(<DepositPage />, {
      route: '/book/deposit?bookingId=booking-deposit&amount=123400',
    })

    expect(screen.getByText(/1.234 ₽/)).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Оплатить' }))

    expect(platform.send).toHaveBeenCalledWith('VKWebAppOpenPayForm', {
      app_id: 12345,
      action: 'pay-to-service',
      params: {
        amount: 123400,
        description: 'Депозит: Окрашивание',
        payload: JSON.stringify({ bookingId: 'booking-deposit' }),
      },
    })
    await waitFor(() => expect(view.getLocation().pathname).toBe('/book/success'))
  })

  it('DepositPage остаётся на месте после bridge cancel и back использует history', async () => {
    platform.send.mockRejectedValue(new Error('cancelled'))
    const view = renderAtRoute(<DepositPage />, {
      entries: ['/book/confirm', '/book/deposit?bookingId=booking-deposit&amount=50000'],
    })

    await view.user.click(screen.getByRole('button', { name: 'Оплатить' }))
    await waitFor(() => expect(platform.send).toHaveBeenCalledOnce())
    expect(view.getLocation().pathname).toBe('/book/deposit')
    await view.user.click(screen.getByRole('button', { name: 'Правила отмены' }))
    expect(view.getLocation().pathname).toBe('/book/confirm')
  })

  it('MessagesPage показывает empty state и active messages navigation', () => {
    renderAtRoute(<MessagesPage />, { route: '/messages' })

    expect(screen.getByRole('heading', { name: 'Сообщения' })).toBeInTheDocument()
    expect(screen.getByText('Нет сообщений')).toBeInTheDocument()
    expect(screen.getByText('Сообщения', { selector: 'span' })).toHaveStyle({
      color: 'var(--color-primary-surface)',
    })
  })
})
