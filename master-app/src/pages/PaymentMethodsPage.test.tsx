import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  rebindCard: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getMe, rebindCard: api.rebindCard },
}))

import PaymentMethodsPage from './PaymentMethodsPage'

describe('PaymentMethodsPage', () => {
  beforeEach(() => {
    api.getMe.mockReset()
    api.rebindCard.mockReset()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: '430000******0777' }))
    api.rebindCard.mockResolvedValue({ paymentURL: 'https://pay.test/rebind' })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('показывает последние 4 цифры карты и префетчит URL перепривязки', async () => {
    renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('** 0777')).toBeInTheDocument()
    expect(screen.getByText('Банковская карта')).toBeInTheDocument()
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())
  })

  it('карандаш → диалог «Изменить карту» → открывает форму перепривязки', async () => {
    const webApp = installWebApp()
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    expect(screen.getByText(/привязать новую карту для оплаты подписки/)).toBeInTheDocument()
    // Форма ещё не открыта — только диалог.
    expect(webApp.openLink).not.toHaveBeenCalled()

    // В диалоге две кнопки: подтверждение тоже называется «Изменить карту».
    const confirm = screen.getAllByRole('button', { name: 'Изменить карту' }).at(-1)!
    await view.user.click(confirm)

    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/rebind')
  })

  it('«Отмена» в диалоге не открывает форму', async () => {
    const webApp = installWebApp()
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })
    await screen.findByText('** 0777')

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))
    await view.user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(webApp.openLink).not.toHaveBeenCalled()
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
  })

  it('без привязанной карты — «Не привязана», тап сразу открывает привязку', async () => {
    const webApp = installWebApp()
    api.getMe.mockResolvedValue(createSubscriptionState({ cardPan: null }))
    const view = renderAtRoute(<PaymentMethodsPage />, { route: '/payment-methods' })

    expect(await screen.findByText('Не привязана')).toBeInTheDocument()
    await waitFor(() => expect(api.rebindCard).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Изменить карту' }))

    // Подтверждать нечего — форма привязки открывается сразу, без диалога.
    expect(screen.queryByText(/привязать новую карту/)).not.toBeInTheDocument()
    expect(webApp.openLink).toHaveBeenCalledWith('https://pay.test/rebind')
  })
})
