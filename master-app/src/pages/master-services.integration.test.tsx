import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { createMasterService } from '@/test/fixtures/services'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  addWorkPhoto: vi.fn(),
  removeWorkPhoto: vi.fn(),
  getPopular: vi.fn(),
  getMaster: vi.fn(),
}))

vi.mock('@/api/services.api', () => ({
  servicesApi: {
    list: api.list,
    create: api.create,
    update: api.update,
    remove: api.remove,
    addWorkPhoto: api.addWorkPhoto,
    removeWorkPhoto: api.removeWorkPhoto,
    getPopular: api.getPopular,
  },
}))
vi.mock('@/api/masters.api', () => ({ mastersApi: { getMe: api.getMaster } }))

vi.mock('@/components/ServiceFormPortal', () => ({
  default: ({
    visible,
    isEdit,
    name,
    onNameChange,
    onClose,
    workPhotos,
    onWorkPhotosChange,
    onSave,
    onDelete,
    onPickPopular,
  }: {
    visible: boolean
    isEdit: boolean
    name: string
    onNameChange: (value: string) => void
    workPhotos: Array<{ id: string; url: string | null; previewUrl: string; uploading: boolean }>
    onWorkPhotosChange: (photos: Array<{ id: string; url: string | null; previewUrl: string; uploading: boolean }>) => void
    onClose: () => void
    onSave: () => void
    onDelete?: () => void
    onPickPopular: () => void
  }) => visible ? (
    <div role="dialog" aria-label={isEdit ? 'Редактор услуги' : 'Новая услуга'}>
      <label>Название услуги<input value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
      <output aria-label="Фото услуги">{workPhotos.map((photo) => photo.id).join(',')}</output>
      {workPhotos.length > 0 && (
        <button type="button" onClick={() => onWorkPhotosChange(workPhotos.slice(1))}>Удалить первое фото</button>
      )}
      <button type="button" onClick={() => onWorkPhotosChange([
        ...workPhotos,
        { id: 'new-photo-1', url: 'https://cdn.test/new-1.jpg', previewUrl: 'https://cdn.test/new-1.jpg', uploading: false },
        { id: 'new-photo-2', url: 'https://cdn.test/new-2.jpg', previewUrl: 'https://cdn.test/new-2.jpg', uploading: false },
      ])}>
        Добавить тестовые фото
      </button>
      <button type="button" onClick={onPickPopular}>Выбрать популярную</button>
      <button type="button" onClick={onSave}>Сохранить услугу</button>
      {onDelete && <button type="button" onClick={onDelete}>Удалить услугу</button>}
      <button type="button" onClick={onClose}>Закрыть редактор</button>
    </div>
  ) : null,
}))

import { useAuthStore } from '@/store/auth.store'

import ServicesPage from './ServicesPage'

const baseService = createMasterService({ id: 'service-base', name: 'Стрижка' })

function setMaster(services = [baseService]) {
  const master = createMasterProfile({ services })
  useAuthStore.setState({ token: 'master-token', master, isLoading: false })
  return master
}

describe('ServicesPage and ServicesCatalog', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.list.mockResolvedValue([baseService])
    api.getPopular.mockResolvedValue([])
    api.getMaster.mockResolvedValue(createMasterProfile({ services: [baseService] }))
    api.create.mockResolvedValue(baseService)
    api.update.mockResolvedValue(baseService)
    api.remove.mockResolvedValue(undefined)
    api.addWorkPhoto.mockResolvedValue({ id: 'photo-1', url: 'https://cdn.test/photo.jpg', order: 0 })
    api.removeWorkPhoto.mockResolvedValue(undefined)
    setMaster()
  })

  it('показывает catalog, скрывает системную услугу и не мутирует на render', async () => {
    api.list.mockResolvedValue([
      baseService,
      createMasterService({ id: 'service-discount', name: 'Окрашивание', discountPercent: 20 }),
      createMasterService({ id: 'service-misc', name: 'Прочее', isMisc: true }),
    ])
    renderAtRoute(<ServicesPage />)

    expect(await screen.findByText('Стрижка')).toBeInTheDocument()
    expect(screen.getByText('Окрашивание')).toBeInTheDocument()
    expect(screen.getByText('-20%')).toBeInTheDocument()
    expect(screen.queryByText('Прочее')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Добавить услугу/ })).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
    expect(api.update).not.toHaveBeenCalled()
    expect(api.remove).not.toHaveBeenCalled()
  })

  it('открывает edit и create editor с корректными initial values', async () => {
    const edit = renderAtRoute(<ServicesPage />)
    await edit.user.click(await screen.findByText('Стрижка'))

    expect(screen.getByRole('dialog', { name: 'Редактор услуги' })).toBeInTheDocument()
    expect(screen.getByLabelText('Название услуги')).toHaveValue('Стрижка')
    expect(screen.getByRole('button', { name: 'Удалить услугу' })).toBeInTheDocument()
    edit.unmount()

    const create = renderAtRoute(<ServicesPage />)
    await create.user.click(await screen.findByRole('button', { name: /Добавить услугу/ }))
    expect(screen.getByRole('dialog', { name: 'Новая услуга' })).toBeInTheDocument()
    expect(screen.getByLabelText('Название услуги')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Удалить услугу' })).not.toBeInTheDocument()
  })

  it('выбирает название из popular-service справочника', async () => {
    api.getPopular.mockResolvedValue([
      {
        section: 'ВОЛОСЫ',
        services: [{ id: 'popular-1', name: 'Женская стрижка' }],
      },
    ])
    const view = renderAtRoute(<ServicesPage />)
    await view.user.click(await screen.findByRole('button', { name: /Добавить услугу/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать популярную' }))

    expect(await screen.findByText('ВОЛОСЫ')).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Женская стрижка' }))

    expect(screen.getByLabelText('Название услуги')).toHaveValue('Женская стрижка')
    expect(screen.queryByText('Популярные услуги')).not.toBeInTheDocument()
  })

  it('показывает empty popular state после external dictionary error', async () => {
    api.getPopular.mockRejectedValue(new Error('popular unavailable'))
    const view = renderAtRoute(<ServicesPage />)
    await view.user.click(await screen.findByRole('button', { name: /Добавить услугу/ }))
    await view.user.click(screen.getByRole('button', { name: 'Выбрать популярную' }))

    expect(await screen.findByText('Справочник пока пуст')).toBeInTheDocument()
  })

  it('после save перезагружает catalog и делает profile refresh видимым в store', async () => {
    const created = createMasterService({ id: 'service-created', name: 'Новая услуга', duration: 30, price: 0 })
    const refreshedMaster = createMasterProfile({ services: [baseService, created] })
    api.list.mockResolvedValueOnce([baseService]).mockResolvedValue([baseService, created])
    api.create.mockResolvedValue(created)
    api.getMaster.mockResolvedValue(refreshedMaster)
    const view = renderAtRoute(<ServicesPage />)
    await view.user.click(await screen.findByRole('button', { name: /Добавить услугу/ }))
    await view.user.type(screen.getByLabelText('Название услуги'), 'Новая услуга')

    await view.user.click(screen.getByRole('button', { name: 'Сохранить услугу' }))

    await waitFor(() => expect(api.create).toHaveBeenCalledWith({
      name: 'Новая услуга',
      description: null,
      price: 0,
      duration: 30,
      discountPercent: null,
      sessionsCount: 1,
      photo: null,
    }))
    expect(await screen.findByText('Новая услуга')).toBeInTheDocument()
    await waitFor(() => expect(api.getMaster).toHaveBeenCalledOnce())
    expect(useAuthStore.getState().master).toEqual(refreshedMaster)
  })

  it('обновляет услугу и применяет remove/add work-photo в точном порядке', async () => {
    const editable = createMasterService({
      id: 'service-edit',
      name: 'Услуга с фото',
      description: 'Описание',
      duration: 60,
      price: 250_000,
      discountPercent: 10,
      sessionsCount: 2,
      photo: 'https://cdn.test/original-1.jpg',
      workPhotos: [
        { id: 'original-photo-1', url: 'https://cdn.test/original-1.jpg', order: 0 },
        { id: 'original-photo-2', url: 'https://cdn.test/original-2.jpg', order: 1 },
      ],
    })
    api.list.mockResolvedValue([editable])
    api.update.mockResolvedValue(editable)
    const view = renderAtRoute(<ServicesPage />)
    await view.user.click(await screen.findByText('Услуга с фото'))
    expect(screen.getByLabelText('Фото услуги')).toHaveTextContent('original-photo-1,original-photo-2')

    await view.user.click(screen.getByRole('button', { name: 'Удалить первое фото' }))
    await view.user.click(screen.getByRole('button', { name: 'Добавить тестовые фото' }))
    expect(api.update).not.toHaveBeenCalled()
    expect(api.removeWorkPhoto).not.toHaveBeenCalled()
    expect(api.addWorkPhoto).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Сохранить услугу' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('service-edit', {
      name: 'Услуга с фото',
      description: 'Описание',
      price: 250_000,
      duration: 60,
      discountPercent: 10,
      sessionsCount: 2,
      photo: 'https://cdn.test/original-2.jpg',
    }))
    expect(api.removeWorkPhoto).toHaveBeenCalledWith('original-photo-1')
    expect(api.removeWorkPhoto).not.toHaveBeenCalledWith('original-photo-2')
    expect(api.addWorkPhoto).toHaveBeenNthCalledWith(1, 'service-edit', 'https://cdn.test/new-1.jpg', 0)
    expect(api.addWorkPhoto).toHaveBeenNthCalledWith(2, 'service-edit', 'https://cdn.test/new-2.jpg', 1)
    expect(api.update.mock.invocationCallOrder[0]).toBeLessThan(api.removeWorkPhoto.mock.invocationCallOrder[0])
    expect(api.removeWorkPhoto.mock.invocationCallOrder[0]).toBeLessThan(api.addWorkPhoto.mock.invocationCallOrder[0])
    expect(api.addWorkPhoto.mock.invocationCallOrder[0]).toBeLessThan(api.addWorkPhoto.mock.invocationCallOrder[1])
  })

  it('удаляет услугу только через editor delete action и перезагружает профиль', async () => {
    api.list.mockResolvedValueOnce([baseService]).mockResolvedValue([])
    const refreshed = createMasterProfile({ services: [] })
    api.getMaster.mockResolvedValue(refreshed)
    const view = renderAtRoute(<ServicesPage />)
    await view.user.click(await screen.findByText('Стрижка'))
    expect(api.remove).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Удалить услугу' }))

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('service-base'))
    expect(api.remove).toHaveBeenCalledOnce()
    await waitFor(() => expect(api.getMaster).toHaveBeenCalledOnce())
    expect(useAuthStore.getState().master).toEqual(refreshed)
    expect(screen.queryByRole('dialog', { name: 'Редактор услуги' })).not.toBeInTheDocument()
  })

  it('сохраняет usable empty catalog state', async () => {
    api.list.mockResolvedValue([])
    renderAtRoute(<ServicesPage />)
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce())

    expect(screen.getByRole('button', { name: /Добавить услугу/ })).toBeInTheDocument()
    expect(screen.queryByText('Стрижка')).not.toBeInTheDocument()
  })

  it('остаётся usable после catalog error', async () => {
    api.list.mockRejectedValue(new Error('services unavailable'))
    renderAtRoute(<ServicesPage />)
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce())

    expect(screen.getByText('Услуги')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Добавить услугу/ })).toBeInTheDocument()
  })

  it('возвращается на предыдущий route из плоского каталога', async () => {
    const view = renderAtRoute(<ServicesPage />, { entries: ['/settings', '/services'] })

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(view.getLocation().pathname).toBe('/settings')
  })
})
