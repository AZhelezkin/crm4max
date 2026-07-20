import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterClient } from '@/test/fixtures/clients'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
const scrollPageTop = vi.hoisted(() => vi.fn())

vi.mock('@/api/clients.api', () => ({ clientsApi: api }))
vi.mock('@/lib/scroll', () => ({ scrollPageTop }))

import ClientsPage from './ClientsPage'

const clients = [
  createMasterClient({
    id: 'master-client-1',
    clientId: 'client-1',
    name: 'Анна Петрова',
    phone: '+79991112233',
  }),
  createMasterClient({
    id: 'master-client-2',
    clientId: null,
    name: 'Борис Сидоров',
    phone: '+78885556677',
    isMaxUser: false,
  }),
]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('ClientsPage', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    scrollPageTop.mockReset()
    api.list.mockResolvedValue(clients)
  })

  it('не показывает stale clients пока list pending', () => {
    api.list.mockReturnValue(new Promise(() => {}))
    renderAtRoute(<ClientsPage />)

    expect(screen.getByText('Клиенты')).toBeInTheDocument()
    expect(screen.queryByText('Анна Петрова')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Поиск' })).not.toBeInTheDocument()
  })

  it('показывает список и форматированные телефоны без mutation', async () => {
    renderAtRoute(<ClientsPage />)

    expect(await screen.findByText('Анна Петрова')).toBeInTheDocument()
    expect(screen.getByText('+7 (999) 111-22-33')).toBeInTheDocument()
    expect(screen.getByText('Борис Сидоров')).toBeInTheDocument()
    expect(screen.getByText('+7 (888) 555-66-77')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Поиск' })).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()
    expect(api.update).not.toHaveBeenCalled()
    expect(api.remove).not.toHaveBeenCalled()
  })

  it('ищет отдельно по имени и цифрам телефона', async () => {
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: 'Поиск' }))
    const input = screen.getByPlaceholderText('Поиск')

    await view.user.type(input, 'анна')
    expect(screen.getByRole('button', { name: /Анна Петрова/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Борис Сидоров/ })).not.toBeInTheDocument()

    await view.user.clear(input)
    await view.user.type(input, '5556677')
    expect(screen.queryByRole('button', { name: /Анна Петрова/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Борис Сидоров/ })).toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(screen.getByRole('button', { name: /Анна Петрова/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Борис Сидоров/ })).toBeInTheDocument()
  })

  it('показывает detail и передаёт exact selected client в booking route state', async () => {
    const selected = clients[1]
    const view = renderAtRoute(<ClientsPage />)

    await view.user.click(await screen.findByRole('button', { name: /Борис Сидоров/ }))
    expect(screen.getByRole('button', { name: 'Править' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Написать в MAX' })).toBeDisabled()

    await view.user.click(screen.getByRole('button', { name: 'Записать на приём' }))

    expect(view.getLocation().pathname).toBe('/bookings/new')
    expect(view.getLocation().state).toEqual({ client: selected })
  })

  it('возвращается из detail к тому же загруженному списку', async () => {
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(screen.getByText('Анна Петрова')).toBeInTheDocument()
    expect(api.list).toHaveBeenCalledOnce()
  })

  it('создаёт клиента только после valid submit и блокирует duplicate write', async () => {
    const created = createMasterClient({
      id: 'master-client-created',
      clientId: null,
      name: 'Новый Клиент',
      phone: '+7 (999) 000-00-11',
      isMaxUser: false,
    })
    const create = deferred<typeof created>()
    api.list.mockResolvedValueOnce(clients).mockResolvedValue([...clients, created])
    api.create.mockReturnValue(create.promise)
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: 'Добавить клиента' }))
    const [name, phone] = screen.getAllByRole('textbox')
    await view.user.type(name, '  Новый Клиент  ')
    await view.user.type(phone, '89990000011')
    expect(api.create).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(api.create).toHaveBeenCalledWith({
      name: 'Новый Клиент',
      phone: '+7 (999) 000-00-11',
    })
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(api.create).toHaveBeenCalledOnce()

    await act(async () => create.resolve(created))
    expect(await screen.findByText('Новый Клиент')).toBeInTheDocument()
  })

  it('отклоняет неполный phone и разрешает исправить форму', async () => {
    const created = createMasterClient({ id: 'fixed-client', name: 'Исправленный клиент' })
    api.create.mockResolvedValue(created)
    api.list.mockResolvedValueOnce(clients).mockResolvedValue([...clients, created])
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: 'Добавить клиента' }))
    const [name, phone] = screen.getAllByRole('textbox')
    await view.user.type(name, 'Исправленный клиент')
    await view.user.type(phone, '123')

    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(screen.getByText('Введите номер полностью: +7 (XXX) XXX-XX-XX')).toBeInTheDocument()
    expect(api.create).not.toHaveBeenCalled()

    await view.user.clear(phone)
    await view.user.type(phone, '89991112233')
    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))
    await waitFor(() => expect(api.create).toHaveBeenCalledOnce())
  })

  it('обновляет выбранного клиента exact payload и trusted API response', async () => {
    const updated = { ...clients[0], name: 'Анна Обновлённая' }
    api.update.mockResolvedValue(updated)
    api.list.mockResolvedValueOnce(clients).mockResolvedValue([updated, clients[1]])
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))
    await view.user.click(screen.getByRole('button', { name: 'Править' }))
    const [name] = screen.getAllByRole('textbox')
    await view.user.clear(name)
    await view.user.type(name, '  Анна Обновлённая  ')
    expect(api.update).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Сохранить изменения' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('master-client-1', {
      name: 'Анна Обновлённая',
      phone: '+7 (999) 111-22-33',
    }))
    expect(await screen.findByText('Анна Обновлённая')).toBeInTheDocument()
  })

  it('удаляет клиента только после explicit confirmation и ровно один раз', async () => {
    api.remove.mockResolvedValue(undefined)
    api.list.mockResolvedValueOnce(clients).mockResolvedValue([clients[1]])
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))
    await view.user.click(screen.getByRole('button', { name: 'Удалить' }))
    const firstDialog = screen.getByText('Удалить клиента').parentElement!
    expect(api.remove).not.toHaveBeenCalled()
    await view.user.click(within(firstDialog).getByRole('button', { name: 'Отмена' }))
    expect(api.remove).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Удалить' }))
    const confirmDialog = screen.getByText('Удалить клиента').parentElement!
    await view.user.click(within(confirmDialog).getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('master-client-1'))
    expect(api.remove).toHaveBeenCalledOnce()
    expect(await screen.findByText('Борис Сидоров')).toBeInTheDocument()
    expect(screen.queryByText('Анна Петрова')).not.toBeInTheDocument()
  })

  it('возвращается в usable list если reload после create завершился ошибкой', async () => {
    const created = createMasterClient({ id: 'created-before-reload-failure', name: 'Созданный клиент' })
    api.list.mockResolvedValueOnce(clients).mockRejectedValueOnce(new Error('reload unavailable'))
    api.create.mockResolvedValue(created)
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: 'Добавить клиента' }))
    const [name] = screen.getAllByRole('textbox')
    await view.user.type(name, 'Созданный клиент')

    await view.user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Клиенты')).toBeInTheDocument()
    expect(screen.getByText('Анна Петрова')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Добавить клиента' })).toBeInTheDocument()
  })

  it('фиксирует пустой list state', async () => {
    api.list.mockResolvedValue([])
    renderAtRoute(<ClientsPage />)
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce())

    expect(screen.getByRole('button', { name: 'Добавить клиента' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Поиск' })).not.toBeInTheDocument()
    expect(screen.queryByText('Анна Петрова')).not.toBeInTheDocument()
  })

  it('остаётся failure-safe после list error', async () => {
    api.list.mockRejectedValue(new Error('clients unavailable'))
    renderAtRoute(<ClientsPage />)
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce())

    expect(screen.getByText('Клиенты')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Добавить клиента' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Поиск' })).not.toBeInTheDocument()
  })
})
