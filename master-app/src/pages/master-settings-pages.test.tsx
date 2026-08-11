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
    photoPreview,
    homeVisit,
    setHomeVisit,
    onAddressClick,
    showAddress = true,
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
    photoPreview: string | null
    homeVisit: boolean
    setHomeVisit: (value: boolean) => void
    onAddressClick: () => void
    showAddress?: boolean
    onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
    onBack: () => void
    footer: ReactNode
  }) => (
    <div>
      <label>Имя<input aria-invalid={nameError || undefined} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Телефон<input aria-invalid={!!phoneError || undefined} value={phone} onChange={(event) => onPhoneChange(event.target.value)} /></label>
      {showPhoneErrorMessage && phoneError && <div>{phoneError}</div>}
      <label>Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {photoPreview && <img src={photoPreview} alt="Текущее фото профиля" />}
      <input aria-label="Загрузить фото профиля" type="file" onChange={onPhotoChange} />
      {showAddress && <button type="button" onClick={onAddressClick}>Адрес: {location}</button>}
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

vi.mock('@/components/AvatarCropPortal', () => ({
  default: ({
    open,
    onCancel,
    onConfirm,
  }: {
    open: boolean
    onCancel: () => void
    onConfirm: (file: File) => void
  }) => open ? (
    <div>
      <span>Кадрирование фото</span>
      <button type="button" onClick={onCancel}>Отменить кадрирование</button>
      <button type="button" onClick={() => onConfirm(new File(['cropped'], 'avatar.jpg', { type: 'image/jpeg' }))}>
        Сохранить кадрирование
      </button>
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
    services.unmount()

    const subscription = renderAtRoute(<SettingsPage />)
    await subscription.user.click(await screen.findByRole('button', { name: 'Отменить подписку' }))
    expect(subscription.getLocation().pathname).toBe('/subscription')
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
    expect(screen.queryByRole('button', { name: /Адрес:/ })).not.toBeInTheDocument()
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

  it('AboutMePage не отправляет адрес, обновляет store и возвращается', async () => {
    const original = setMaster(createMasterProfile({ homeVisit: false }))
    const updated = createMasterProfile({
      ...original,
      name: 'Новое имя',
    })
    api.updateProfile.mockResolvedValue(updated)
    const view = renderAtRoute(<AboutMePage />, { entries: ['/settings', '/about'] })
    await view.user.clear(screen.getByLabelText('Имя'))
    await view.user.type(screen.getByLabelText('Имя'), 'Новое имя')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({
      name: 'Новое имя',
      phone: original.phone,
      description: original.description,
      homeVisit: false,
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
    const persistedPhoto = 'https://cdn.test/old-avatar.jpg'
    setMaster(createMasterProfile({ photo: persistedPhoto }))
    api.uploadPhoto.mockRejectedValue(new Error('upload unavailable'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:crop-photo')
      .mockReturnValueOnce('blob:profile-photo')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const view = renderAtRoute(<AboutMePage />)

    await view.user.upload(
      screen.getByLabelText('Загрузить фото профиля'),
      new File(['photo'], 'photo.png', { type: 'image/png' }),
    )

    expect(screen.getByText('Кадрирование фото')).toBeInTheDocument()
    expect(api.uploadPhoto).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Сохранить кадрирование' }))

    expect(api.uploadPhoto).toHaveBeenCalledWith(expect.any(File), 'masters')
    expect(await screen.findByText(/Не удалось сохранить фото\s+профиля\. Попробуйте ещё раз/)).toBeInTheDocument()
    expect(screen.getByAltText('Текущее фото профиля')).toHaveAttribute('src', persistedPhoto)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:crop-photo')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo')

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ photo: persistedPhoto }))
    expect(error).toHaveBeenCalled()
  })

  it('AboutMePage сохраняет загруженный URL в профиль и store', async () => {
    const uploadedPhoto = 'https://cdn.test/new-avatar.jpg'
    const original = setMaster(createMasterProfile({ photo: 'https://cdn.test/old-avatar.jpg' }))
    api.uploadPhoto.mockResolvedValue(uploadedPhoto)
    api.updateProfile.mockResolvedValue(createMasterProfile({ ...original, photo: uploadedPhoto }))
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValueOnce('blob:crop-photo').mockReturnValueOnce('blob:profile-photo'),
    })
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const view = renderAtRoute(<AboutMePage />, { entries: ['/settings', '/about'] })

    await view.user.upload(
      screen.getByLabelText('Загрузить фото профиля'),
      new File(['photo'], 'photo.png', { type: 'image/png' }),
    )
    await view.user.click(screen.getByRole('button', { name: 'Сохранить кадрирование' }))
    expect(await screen.findByAltText('Текущее фото профиля')).toHaveAttribute('src', uploadedPhoto)

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ photo: uploadedPhoto }))
    expect(useAuthStore.getState().master?.photo).toBe(uploadedPhoto)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile-photo')
  })

  it('AboutMePage применяет только последний concurrent upload и держит Save disabled', async () => {
    const originalPhoto = 'https://cdn.test/old-avatar.jpg'
    setMaster(createMasterProfile({ photo: originalPhoto }))
    const firstUpload = deferred<string>()
    const secondUpload = deferred<string>()
    api.uploadPhoto
      .mockReturnValueOnce(firstUpload.promise)
      .mockReturnValueOnce(secondUpload.promise)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn()
        .mockReturnValueOnce('blob:crop-first')
        .mockReturnValueOnce('blob:preview-first')
        .mockReturnValueOnce('blob:crop-second')
        .mockReturnValueOnce('blob:preview-second'),
    })
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const view = renderAtRoute(<AboutMePage />, { entries: ['/settings', '/about'] })
    const input = screen.getByLabelText('Загрузить фото профиля')

    await view.user.upload(input, new File(['first'], 'first.png', { type: 'image/png' }))
    await view.user.click(screen.getByRole('button', { name: 'Сохранить кадрирование' }))
    await view.user.upload(input, new File(['second'], 'second.png', { type: 'image/png' }))
    await view.user.click(screen.getByRole('button', { name: 'Сохранить кадрирование' }))
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()

    await act(async () => secondUpload.resolve('https://cdn.test/second-avatar.jpg'))
    expect(screen.getByAltText('Текущее фото профиля')).toHaveAttribute('src', 'https://cdn.test/second-avatar.jpg')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()

    await act(async () => firstUpload.resolve('https://cdn.test/stale-first-avatar.jpg'))
    expect(screen.getByAltText('Текущее фото профиля')).toHaveAttribute('src', 'https://cdn.test/second-avatar.jpg')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(api.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ photo: 'https://cdn.test/second-avatar.jpg' }))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-first')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-second')
  })

  it('AddressEditPage показывает реквизиты и сохраняет отдельный note с coordinates', async () => {
    const original = setMaster(createMasterProfile({
      location: 'Москва, Старая улица, 1',
      locationNote: 'Подъезд: 1\nДомофон: 111#\nЭтаж: 2\nКвартира/офис: 20\nКомментарий: Старый комментарий',
    }))
    const updated = createMasterProfile({
      ...original,
      location: 'Москва, Новый адрес, 5',
      locationNote: 'Подъезд: 2\nДомофон: 222#\nЭтаж: 4\nКвартира/офис: 40\nКомментарий: Новый комментарий',
      lat: 55.7,
      lng: 37.6,
    })
    api.updateProfile.mockResolvedValue(updated)
    const view = renderAtRoute(<AddressEditPage />, { entries: ['/', '/address'] })
    expect(screen.getByText(original.location!)).toBeInTheDocument()
    expect(screen.getByLabelText('Подъезд')).toHaveValue('1')
    expect(screen.getByLabelText('Домофон')).toHaveValue('111#')
    expect(screen.getByLabelText('Этаж')).toHaveValue('2')
    expect(screen.getByLabelText('Квартира/офис')).toHaveValue('20')
    expect(screen.getByLabelText('Комментарий')).toHaveValue('Старый комментарий')
    expect(api.updateProfile).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Подъезд'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Домофон'), { target: { value: '222#' } })
    fireEvent.change(screen.getByLabelText('Этаж'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Квартира/офис'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Комментарий'), { target: { value: 'Новый комментарий' } })
    await view.user.click(screen.getByRole('button', { name: /Адрес Москва/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать новый адрес' }))
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.updateProfile).toHaveBeenCalledWith({
      location: 'Москва, Новый адрес, 5',
      locationNote: 'Подъезд: 2\nДомофон: 222#\nЭтаж: 4\nКвартира/офис: 40\nКомментарий: Новый комментарий',
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
