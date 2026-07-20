import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDestinationContext, DESTINATION_TOKEN } from '@/test/fixtures/destination-selector'
import { installWebApp } from '@/test/web-app-fixture'

const apiMock = vi.hoisted(() => ({
  getContext: vi.fn(),
  saveAddress: vi.fn(),
}))

vi.mock('./api', () => ({
  getDestinationSelectorContext: apiMock.getContext,
  saveDestinationSelectorAddress: apiMock.saveAddress,
}))

vi.mock('@client/components/AddressSuggestField', () => ({
  default: ({
    value,
    onChange,
    label,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    label: string
    placeholder: string
  }) => (
    <label>
      {label}
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}))

import { useAuthStore } from '@/store/auth.store'

import DestinationSelectorPage from './DestinationSelectorPage'

describe('DestinationSelectorPage', () => {
  beforeEach(() => {
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ clientAddress: 'Адрес клиента' }),
    })
    apiMock.saveAddress.mockResolvedValue({ status: 'invalid_address' })
  })

  it('сигнализирует ready, запускает auth и ждёт его до context load', async () => {
    const webApp = installWebApp()
    const init = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ master: null, token: null, isLoading: true, init })

    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    expect(webApp.ready).toHaveBeenCalledOnce()
    expect(init).toHaveBeenCalledOnce()
    expect(apiMock.getContext).not.toHaveBeenCalled()

    act(() => {
      useAuthStore.setState({ isLoading: false })
    })

    await waitFor(() => expect(apiMock.getContext).toHaveBeenCalledWith(DESTINATION_TOKEN))
  })

  it('закрывает WebApp из toolbar', async () => {
    const user = userEvent.setup()
    const webApp = installWebApp()
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    await user.click(screen.getByRole('button', { name: 'Закрыть' }))

    expect(webApp.close).toHaveBeenCalledOnce()
  })

  it('разрешает продолжить после ready context и отправляет только address attach', async () => {
    const user = userEvent.setup()
    installWebApp()
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    const continueButton = screen.getByRole('button', { name: 'Продолжить' })
    expect(continueButton).toBeDisabled()
    await waitFor(() => expect(continueButton).toBeEnabled())

    await user.click(continueButton)

    await waitFor(() => expect(apiMock.saveAddress).toHaveBeenCalledWith(
      DESTINATION_TOKEN,
      'Адрес клиента',
    ))
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeEnabled()
  })

  it('оставляет continue disabled для пустого адреса', async () => {
    const user = userEvent.setup()
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ clientAddress: null }),
    })
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)
    const input = await screen.findByPlaceholderText('Улица, дом, квартира')

    await user.type(input, '   ')

    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled()
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })
})
