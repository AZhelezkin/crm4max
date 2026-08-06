import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterClient } from '@/test/fixtures/clients'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setBlocked: vi.fn(),
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
    expect(api.setBlocked).not.toHaveBeenCalled()
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
    expect(screen.queryByRole('button', { name: 'Заблокировать' })).not.toBeInTheDocument()

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

  it('открывает block modal с exact copy и отменяет без mutation', async () => {
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))

    expect(screen.getByRole('button', { name: 'Записать на приём' })).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Заблокировать' }))

    const dialog = screen.getByRole('dialog', { name: 'Заблокировать клиента' })
    expect(within(dialog).getByText('Клиент не сможет записываться на услуги и не будет получать уведомления')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Заблокировать' })).toHaveStyle({
      background: 'var(--color-error-surface-accented)',
    })
    await view.user.click(within(dialog).getByRole('button', { name: 'Отмена' }))

    expect(api.setBlocked).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('блокирует один раз и синхронизирует selected и строку списка только trusted response', async () => {
    const request = deferred<ReturnType<typeof createMasterClient>>()
    const blocked = createMasterClient({
      ...clients[0],
      name: 'Анна из ответа API',
      isBlocked: true,
      blockedAt: '2026-08-06T10:00:00.000Z',
    })
    api.setBlocked.mockReturnValue(request.promise)
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))
    await view.user.click(screen.getByRole('button', { name: 'Заблокировать' }))
    const dialog = screen.getByRole('dialog', { name: 'Заблокировать клиента' })
    const confirm = within(dialog).getByRole('button', { name: 'Заблокировать' })

    await view.user.click(confirm)
    expect(api.setBlocked).toHaveBeenCalledWith('master-client-1', true)
    expect(confirm).toBeDisabled()
    await view.user.click(confirm)
    expect(api.setBlocked).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Записать на приём' })).toBeInTheDocument()
    expect(screen.queryByText('Клиент заблокирован')).not.toBeInTheDocument()

    await act(async () => request.resolve(blocked))

    const blockedTitle = await screen.findByText('Клиент заблокирован')
    expect(screen.getByText('Анна из ответа API')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Записать на приём' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Написать в MAX' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Разблокировать' })).toHaveStyle({
      color: 'var(--color-interactive-element-accented)',
    })
    const icon = blockedTitle.parentElement!.querySelector('svg')!
    expect(icon).toHaveAttribute('width', '32')
    expect(icon).toHaveAttribute('height', '32')
    expect(icon).toHaveStyle({ color: 'var(--color-error-surface-accented)' })
    expect(icon.querySelectorAll('path')[0]).toHaveAttribute('d', 'M19.8641 2.66602H12.1307C11.2241 2.66602 9.94406 3.19936 9.30406 3.83936L3.8374 9.30603C3.1974 9.94603 2.66406 11.226 2.66406 12.1327V19.866C2.66406 20.7727 3.1974 22.0527 3.8374 22.6927L9.30406 28.1593C9.94406 28.7993 11.2241 29.3327 12.1307 29.3327H19.8641C20.7707 29.3327 22.0507 28.7993 22.6907 28.1593L28.1574 22.6927C28.7974 22.0527 29.3307 20.7727 29.3307 19.866V12.1327C29.3307 11.226 28.7974 9.94603 28.1574 9.30603L22.6907 3.83936C22.0507 3.19936 20.7707 2.66602 19.8641 2.66602Z')
    expect(icon.querySelectorAll('path')[1]).toHaveAttribute('d', 'M6.58594 25.4392L25.4393 6.58594')
    for (const path of icon.querySelectorAll('path')) {
      expect(path).toHaveAttribute('stroke', 'currentColor')
      expect(path).toHaveAttribute('stroke-width', '2')
      expect(path).toHaveAttribute('stroke-linecap', 'round')
      expect(path).toHaveAttribute('stroke-linejoin', 'round')
    }

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    await view.user.click(screen.getByRole('button', { name: /Анна из ответа API/ }))
    expect(screen.getByText('Клиент заблокирован')).toBeInTheDocument()
  })

  it('показывает primary unblock modal, поддерживает cancel и возвращает action cards по trusted response', async () => {
    const blocked = createMasterClient({
      ...clients[0],
      isBlocked: true,
      blockedAt: '2026-08-06T10:00:00.000Z',
    })
    const unblocked = createMasterClient({ ...blocked, isBlocked: false, blockedAt: null })
    api.list.mockResolvedValue([blocked, clients[1]])
    api.setBlocked.mockResolvedValue(unblocked)
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Анна Петрова/ }))
    await view.user.click(screen.getByRole('button', { name: 'Разблокировать' }))

    let dialog = screen.getByRole('dialog', { name: 'Разблокировать клиента' })
    expect(within(dialog).getByText('Клиент сможет записываться на услуги и будет получать уведомления')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Разблокировать' })).toHaveStyle({
      background: 'var(--color-primary-surface)',
    })
    await view.user.click(within(dialog).getByRole('button', { name: 'Отмена' }))
    expect(api.setBlocked).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Разблокировать' }))
    dialog = screen.getByRole('dialog', { name: 'Разблокировать клиента' })
    await view.user.click(within(dialog).getByRole('button', { name: 'Разблокировать' }))

    await waitFor(() => expect(api.setBlocked).toHaveBeenCalledWith('master-client-1', false))
    expect(await screen.findByRole('button', { name: 'Записать на приём' })).toBeInTheDocument()
    expect(screen.queryByText('Клиент заблокирован')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Заблокировать' })).toBeInTheDocument()
  })

  it('не показывает block control для ручного клиента', async () => {
    const view = renderAtRoute(<ClientsPage />)
    await view.user.click(await screen.findByRole('button', { name: /Борис Сидоров/ }))

    expect(screen.getByRole('button', { name: 'Записать на приём' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Заблокировать' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Разблокировать' })).not.toBeInTheDocument()
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
