import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDestinationContext, DESTINATION_TOKEN } from '@/test/fixtures/destination-selector'
import { installWebApp } from '@/test/web-app-fixture'

const apiMock = vi.hoisted(() => ({
  getContext: vi.fn(),
  saveAddress: vi.fn(),
  saveMasterLocation: vi.fn(),
}))
const pickerRenderMock = vi.hoisted(() => vi.fn())

vi.mock('./api', () => ({
  getDestinationSelectorContext: apiMock.getContext,
  saveDestinationSelectorAddress: apiMock.saveAddress,
  saveDestinationSelectorMasterLocation: apiMock.saveMasterLocation,
}))

vi.mock('@client/components/AddressSuggestField', () => ({
  default: ({
    value,
    onChange,
    onPickerOpen,
    label,
    placeholder,
  }: {
    value: string
    onChange: (value: string) => void
    onPickerOpen?: () => void
    label: string
    placeholder: string
  }) => (
    <label>
      {label}
      <input
        value={value}
        placeholder={placeholder}
        readOnly={Boolean(onPickerOpen)}
        onClick={onPickerOpen}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ),
}))

vi.mock('@/components/AddressPickerPortal', () => ({
  default: (props: {
    open: boolean
    value: string
    details?: unknown
    onClose: () => void
    onConfirm: (address: string, coords: { lat: number; lng: number } | null) => void
  }) => {
    pickerRenderMock(props)
    if (!props.open) return null
    return (
      <div role="dialog" aria-label="Карта выбора адреса">
        <button type="button" onClick={() => {
          props.onConfirm('Москва, Тестовая улица, 2', { lat: 55.76, lng: 37.61 })
          props.onClose()
        }}>
          Выбрать адрес на карте
        </button>
      </div>
    )
  },
}))

import { useAuthStore } from '@/store/auth.store'

import DestinationSelectorPage from './DestinationSelectorPage'

describe('DestinationSelectorPage', () => {
  beforeEach(() => {
    pickerRenderMock.mockClear()
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ clientAddress: 'Адрес клиента' }),
    })
    apiMock.saveAddress.mockResolvedValue({ status: 'invalid_address' })
    apiMock.saveMasterLocation.mockResolvedValue({ status: 'invalid_address' })
  })

  it('сигнализирует ready, запускает auth и ждёт его до context load', async () => {
    const webApp = installWebApp()
    const init = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ master: null, token: null, isLoading: true, init })

    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    expect(webApp.ready).toHaveBeenCalledOnce()
    expect(init).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { level: 1, name: 'Адрес клиента' })).toBeInTheDocument()
    expect(apiMock.getContext).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Город, улица, дом')).toBeDisabled()

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

  it('для адреса клиента открывает карту и отправляет адрес со всеми реквизитами', async () => {
    const user = userEvent.setup()
    installWebApp()
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    const continueButton = screen.getByRole('button', { name: 'Продолжить' })
    expect(continueButton).toBeDisabled()
    await waitFor(() => expect(continueButton).toBeEnabled())

    await user.click(screen.getByPlaceholderText('Город, улица, дом'))
    expect(screen.getByRole('dialog', { name: 'Карта выбора адреса' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Выбрать адрес на карте' }))
    await user.type(screen.getByPlaceholderText('Этаж'), '4')
    await user.type(screen.getByPlaceholderText('Квартира/офис'), '402')
    await user.type(screen.getByPlaceholderText('Домофон'), '#402*')
    await user.type(screen.getByPlaceholderText('Комментарий'), 'Вход со стороны бульвара')

    await user.click(continueButton)

    await waitFor(() => expect(apiMock.saveAddress).toHaveBeenCalledWith(
      DESTINATION_TOKEN,
      'Москва, Тестовая улица, 2\nДополнительно [CRM4MAX/1]:\nЭтаж: 4\nКвартира/офис: 402\nДомофон: #402*\nКомментарий: Вход со стороны бульвара',
    ))
    expect(screen.getByRole('alert')).toHaveTextContent('Проверьте адрес')
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeEnabled()
  })

  it('показывает дополнительные поля из сохранённого адреса', async () => {
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({
        clientAddress: 'Москва, Серебряническая набережная, 240\nэтаж 4, кв./офис 105, домофон #402*\nНа двери будет табличка',
      }),
    })
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })

    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)

    expect(await screen.findByDisplayValue('Москва, Серебряническая набережная, 240')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByDisplayValue('105')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#402*')).toBeInTheDocument()
    expect(screen.getByDisplayValue('На двери будет табличка')).toBeInTheDocument()
  })

  it('оставляет continue disabled для пустого адреса', async () => {
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ clientAddress: null }),
    })
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)
    await screen.findByPlaceholderText('Город, улица, дом')

    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeDisabled()
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })

  it('для адреса мастера открывает карту и сохраняет точку со всеми реквизитами', async () => {
    const user = userEvent.setup()
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ addressPurpose: 'master_location', clientAddress: null, masterLocation: null }),
    })
    installWebApp()
    useAuthStore.setState({ isLoading: false, init: vi.fn().mockResolvedValue(undefined) })
    render(<DestinationSelectorPage token={DESTINATION_TOKEN} />)
    const input = await screen.findByPlaceholderText('Улица, дом')

    expect(screen.getByRole('heading', { level: 1, name: 'Адрес мастера' })).toBeInTheDocument()
    expect(screen.getByText('Укажите адрес мастера')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Этаж')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Квартира/офис')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Домофон')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Комментарий')).toBeInTheDocument()

    await user.click(input)

    expect(screen.getByRole('dialog', { name: 'Карта выбора адреса' })).toBeInTheDocument()
    const openPickerProps = pickerRenderMock.mock.calls
      .map(([props]) => props as { open: boolean; details?: unknown })
      .find((props) => props.open)
    expect(openPickerProps).not.toHaveProperty('details')

    await user.click(screen.getByRole('button', { name: 'Выбрать адрес на карте' }))
    await user.type(screen.getByPlaceholderText('Этаж'), '4')
    await user.type(screen.getByPlaceholderText('Квартира/офис'), '402')
    await user.type(screen.getByPlaceholderText('Домофон'), '#402*')
    await user.type(screen.getByPlaceholderText('Комментарий'), 'Вход со двора')
    await user.click(screen.getByRole('button', { name: 'Продолжить' }))

    await waitFor(() => expect(apiMock.saveMasterLocation).toHaveBeenCalledWith(DESTINATION_TOKEN, {
      location: 'Москва, Тестовая улица, 2\nДополнительно [CRM4MAX/1]:\nЭтаж: 4\nКвартира/офис: 402\nДомофон: #402*\nКомментарий: Вход со двора',
      lat: 55.76,
      lng: 37.61,
    }))
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })
})
