import type { ChangeEvent, ReactNode } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { createSubscriptionState } from '@/test/fixtures/subscriptions'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  updateProfile: vi.fn(),
  updatePayment: vi.fn(),
  uploadPhoto: vi.fn(),
}))

vi.mock('@/api/subscription.api', () => ({
  subscriptionApi: { getMe: api.getSubscription },
}))
vi.mock('@/api/masters.api', () => ({
  mastersApi: {
    updateProfile: api.updateProfile,
    updatePayment: api.updatePayment,
  },
}))
vi.mock('@/api/upload.api', () => ({ uploadPhoto: api.uploadPhoto }))

vi.mock('@/pages/OnboardingPage', () => ({
  Step0Form: ({
    name,
    nameError,
    setName,
    phone,
    phoneError,
    showPhoneErrorMessage,
    onPhoneChange,
    description,
    setDescription,
    location,
    homeVisit,
    setHomeVisit,
    onAddressClick,
    onPhotoChange,
    onBack,
    footer,
  }: {
    name: string
    nameError?: boolean
    setName: (value: string) => void
    phone: string
    phoneError: string | null
    showPhoneErrorMessage?: boolean
    onPhoneChange: (value: string) => void
    description: string
    setDescription: (value: string) => void
    location: string
    homeVisit: boolean
    setHomeVisit: (value: boolean) => void
    onAddressClick: () => void
    onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
    onBack: () => void
    footer: ReactNode
  }) => (
    <div>
      <label>Имя<input aria-invalid={nameError || undefined} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Телефон<input aria-invalid={!!phoneError || undefined} value={phone} onChange={(event) => onPhoneChange(event.target.value)} /></label>
      {showPhoneErrorMessage && phoneError && <div>{phoneError}</div>}
      <label>Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <input aria-label="Загрузить фото профиля" type="file" onChange={onPhotoChange} />
      <button type="button" onClick={onAddressClick}>Адрес: {location}</button>
      <button type="button" onClick={() => setHomeVisit(!homeVisit)}>Выезд: {homeVisit ? 'да' : 'нет'}</button>
      <button type="button" onClick={onBack}>Назад из формы</button>
      {footer}
    </div>
  ),
}))

vi.mock('@/components/AddressPickerPortal', () => ({
  default: ({
    open,
    value,
    onClose,
    onConfirm,
  }: {
    open: boolean
    value: string
    onClose: () => void
    onConfirm: (address: string, coords: { lat: number; lng: number } | null) => void
  }) => open ? (
    <div>
      <span>Пикер: {value}</span>
      <button type="button" onClick={() => onConfirm('Москва, Новый адрес, 5', { lat: 55.7, lng: 37.6 })}>
        Выбрать новый адрес
      </button>
      <button type="button" onClick={onClose}>Закрыть пикер</button>
    </div>
  ) : null,
}))

import { useAuthStore } from '@/store/auth.store'

import AboutMePage from './AboutMePage'
import AddressEditPage from './AddressEditPage'
import PaymentSettingsPage from './PaymentSettingsPage'
import SettingsPage from './SettingsPage'

function setMaster(master = createMasterProfile()) {
  useAuthStore.setState({ token: 'master-token', master, isLoading: false })
  return master
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('master settings pages', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.getSubscription.mockResolvedValue(createSubscriptionState())
    api.updateProfile.mockResolvedValue(createMasterProfile())
    api.updatePayment.mockResolvedValue(createMasterProfile())
    setMaster()
  })

  it('SettingsPage показывает subscription state и exact section routes', async () => {
    api.getSubscription.mockResolvedValue(createSubscriptionState({
      status: 'ACTIVE',
      currentPeriodEnd: '2026-08-19T12:00:00.000Z',
    }))
    const about = renderAtRoute(<SettingsPage />)
    expect(await screen.findByText('Подписка активна')).toBeInTheDocument()
    expect(screen.getByText('до 19.08.2026')).toBeInTheDocument()
    await about.user.click(screen.getByRole('button', { name: /Мои данные/ }))
    expect(about.getLocation().pathname).toBe('/about')
    about.unmount()

    const schedule = renderAtRoute(<SettingsPage />)
    await schedule.user.click(screen.getByRole('button', { name: /График работы/ }))
    expect(schedule.getLocation().pathname).toBe('/schedule')
    schedule.unmount()

    const services = renderAtRoute(<SettingsPage />)
    await services.user.click(screen.getByRole('button', { name: /Мои услуги/ }))
    expect(services.getLocation().pathname).toBe('/services')
  })

  it('SettingsPage возвращается назад и остаётся failure-safe без subscription', async () => {
    api.getSubscription.mockRejectedValue(new Error('subscription unavailable'))
    const view = renderAtRoute(<SettingsPage />, { entries: ['/profile', '/settings'] })

    expect(screen.getByText('Подписка')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(view.getLocation().pathname).toBe('/profile')
  })

  it('AboutMePage показывает initial values и не пишет до submit', () => {
    const master = setMaster(createMasterProfile({
      name: 'Мария Тестова',
      phone: '+79991112233',
      description: 'Колорист',
      location: 'Москва, Старая улица, 1',
      homeVisit: false,
    }))
    renderAtRoute(<AboutMePage />)

    expect(screen.getByLabelText('Имя')).toHaveValue(master.name)
    expect(screen.getByLabelText('Телефон')).toHaveValue(master.phone)
    expect(screen.getByLabelText('Описание')).toHaveValue(master.description)
    expect(screen.getByRole('button', { name: `Адрес: ${master.location}` })).toBeInTheDocument()
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  it('AboutMePage валидирует имя и телефон без текста ошибки и разрешает исправить', async () => {
    const updated = createMasterProfile({ phone: '+7 (999) 111-22-33' })
    api.updateProfile.mockResolvedValue(updated)
    const view = renderAtRoute(<AboutMePage />)
    await view.user.clear(screen.getByLabelText('Имя'))
    await view.user.clear(screen.getByLabelText('Телефон'))
    await view.user.type(screen.getByLabelText('Телефон'), '123')

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(screen.getByLabelText('Имя')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Телефон')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Введите номер полностью: +7 (XXX) XXX-XX-XX')).not.toBeInTheDocument()
    expect(api.updateProfile).not.toHaveBeenCalled()

    await view.user.type(screen.getByLabelText('Имя'), 'Анна Мастерова')
    await view.user.clear(screen.getByLabelText('Телефон'))
    await view.user.type(screen.getByLabelText('Телефон'), '89991112233')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledOnce())
  })

  it('AboutMePage отправляет exact form/address payload, обновляет store и возвращается', async () => {
    const original = setMaster(createMasterProfile({ homeVisit: false }))
    const updated = createMasterProfile({
      ...original,
      name: 'Новое имя',
      location: 'Москва, Новый адрес, 5',
      lat: 55.7,
      lng: 37.6,
    })
    api.updateProfile.mockResolvedValue(updated)
    const view = renderAtRoute(<AboutMePage />, { entries: ['/settings', '/about'] })
    await view.user.clear(screen.getByLabelText('Имя'))
    await view.user.type(screen.getByLabelText('Имя'), 'Новое имя')
    await view.user.click(screen.getByRole('button', { name: /Адрес:/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать новый адрес' }))

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({
      name: 'Новое имя',
      phone: original.phone,
      description: original.description,
      location: 'Москва, Новый адрес, 5',
      homeVisit: false,
      lat: 55.7,
      lng: 37.6,
      photo: original.photo,
    }))
    expect(view.getLocation().pathname).toBe('/settings')
    expect(useAuthStore.getState().master).toEqual(updated)
  })

  it('AboutMePage блокирует duplicate submit пока authoritative update pending', async () => {
    const updated = createMasterProfile({ name: 'Анна Мастерова' })
    const update = deferred<ReturnType<typeof createMasterProfile>>()
    api.updateProfile.mockReturnValue(update.promise)
    const view = renderAtRoute(<AboutMePage />, { entries: ['/settings', '/about'] })
    const submit = screen.getByRole('button', { name: 'Сохранить' })

    await view.user.click(submit)
    expect(screen.getByRole('button', { name: 'Сохраняем...' })).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Сохраняем...' }))
    expect(api.updateProfile).toHaveBeenCalledOnce()

    await act(async () => update.resolve(updated))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/settings'))
    expect(useAuthStore.getState().master).toEqual(updated)
  })

  it('AboutMePage показывает одинаковый popup при ошибке сохранения профиля', async () => {
    api.updateProfile.mockRejectedValue(new Error('update unavailable'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const view = renderAtRoute(<AboutMePage />)

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/Не удалось сохранить фото\s+профиля\. Попробуйте ещё раз/)).toBeInTheDocument()
    expect(error).toHaveBeenCalled()
  })

  it('AboutMePage показывает тот же popup при ошибке загрузки фото', async () => {
    api.uploadPhoto.mockRejectedValue(new Error('upload unavailable'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:profile-photo') })
    const view = renderAtRoute(<AboutMePage />)

    await view.user.upload(
      screen.getByLabelText('Загрузить фото профиля'),
      new File(['photo'], 'photo.png', { type: 'image/png' }),
    )

    expect(await screen.findByText(/Не удалось сохранить фото\s+профиля\. Попробуйте ещё раз/)).toBeInTheDocument()
    expect(error).toHaveBeenCalled()
  })

  it('AddressEditPage показывает values и сохраняет bounded note с coordinates', async () => {
    const original = setMaster(createMasterProfile({
      location: 'Москва, Старая улица, 1',
      locationNote: 'Старый комментарий',
    }))
    const updated = createMasterProfile({
      ...original,
      location: 'Москва, Новый адрес, 5',
      locationNote: 'Новый комментарий',
      lat: 55.7,
      lng: 37.6,
    })
    api.updateProfile.mockResolvedValue(updated)
    const view = renderAtRoute(<AddressEditPage />, { entries: ['/', '/address'] })
    const note = view.container.querySelector('textarea')!

    expect(screen.getByText(original.location!)).toBeInTheDocument()
    expect(note).toHaveValue('Старый комментарий')
    expect(api.updateProfile).not.toHaveBeenCalled()

    fireEvent.change(note, { target: { value: 'Новый комментарий' } })
    await view.user.click(screen.getByRole('button', { name: /Адрес Москва/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать новый адрес' }))
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({
      location: 'Москва, Новый адрес, 5',
      locationNote: 'Новый комментарий',
      lat: 55.7,
      lng: 37.6,
    }))
    expect(view.getLocation().pathname).toBe('/')
    expect(useAuthStore.getState().master).toEqual(updated)
  })

  it('PaymentSettingsPage сохраняет карту только после submit', async () => {
    const original = setMaster(createMasterProfile({ cardNumber: '2200000000000000' }))
    const updated = createMasterProfile({ ...original, cardNumber: '5555444433332222' })
    api.updatePayment.mockResolvedValue(updated)
    const view = renderAtRoute(<PaymentSettingsPage />)
    const input = screen.getByPlaceholderText('0000 0000 0000 0000')

    expect(input).toHaveValue('2200000000000000')
    expect(api.updatePayment).not.toHaveBeenCalled()
    await view.user.clear(input)
    await view.user.type(input, '5555444433332222')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.updatePayment).toHaveBeenCalledWith({ cardNumber: '5555444433332222' }))
    expect(useAuthStore.getState().master).toEqual(updated)
  })

  it('PaymentSettingsPage привязывает VK Pay и скрывает affordance после store update', async () => {
    const original = setMaster(createMasterProfile({ vkPayLinked: false }))
    api.updatePayment.mockResolvedValue(createMasterProfile({ ...original, vkPayLinked: true }))
    const view = renderAtRoute(<PaymentSettingsPage />)

    await view.user.click(screen.getByRole('button', { name: 'Привязать VK Pay' }))

    await waitFor(() => expect(api.updatePayment).toHaveBeenCalledWith({ vkPayLinked: true }))
    expect(screen.getByText('✅ VK Pay привязан')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Привязать VK Pay' })).not.toBeInTheDocument()
  })
})
