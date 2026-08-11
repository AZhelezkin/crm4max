import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'
import { createMasterService } from '@/test/fixtures/services'

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  addWorkPhoto: vi.fn(),
  removeWorkPhoto: vi.fn(),
  getPopular: vi.fn(),
}))

vi.mock('@/api/services.api', () => ({ servicesApi: api }))
vi.mock('@/lib/guide', () => ({ markGuideStep: vi.fn() }))

import ServiceEditorPortal, { type ServiceEditorTarget } from './ServiceEditorPortal'

function renderEditor(target: ServiceEditorTarget) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const view = render(<ServiceEditorPortal target={target} onClose={onClose} onSaved={onSaved} />)

  return { ...view, user: userEvent.setup(), onClose, onSaved }
}

function getNameInput() {
  return screen.getAllByRole('textbox')[0] as HTMLInputElement
}

describe('ServiceFormPortal package restriction', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset())
    api.create.mockResolvedValue(createMasterService({ id: 'created-service' }))
    api.update.mockResolvedValue(createMasterService())
    api.remove.mockResolvedValue(undefined)
    api.addWorkPhoto.mockResolvedValue(undefined)
    api.removeWorkPhoto.mockResolvedValue(undefined)
    api.getPopular.mockResolvedValue([])
    installBrowserFixture()
  })

  it('отключает абонемент при создании и создаёт обычную услугу', async () => {
    const view = renderEditor({ mode: 'create' })
    const packageTab = screen.getByRole('button', {
      name: 'Абонемент. Создание абонементов временно недоступно',
    })
    const unavailableHint = screen.getByText('Временно недоступен')

    expect(packageTab).toBeDisabled()
    expect(packageTab.style.background).toBe('var(--color-secondary-surface-muted)')
    expect(packageTab.style.color).toBe('var(--color-interactive-element-muted)')
    expect(unavailableHint.style.fontSize).toBe('12px')
    expect(unavailableHint.style.lineHeight).toBe('16px')
    expect(unavailableHint.style.color).toBe('var(--color-interactive-element-muted)')
    expect(screen.queryByText('Количество приёмов')).not.toBeInTheDocument()

    await view.user.type(getNameInput(), 'Новая обычная услуга')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.create).toHaveBeenCalledWith({
      name: 'Новая обычная услуга',
      description: null,
      price: 0,
      duration: 30,
      discountPercent: null,
      sessionsCount: 1,
      photo: null,
    }))
  })

  it('не преобразует существующую обычную услугу в абонемент', async () => {
    const service = createMasterService({ id: 'ordinary-service', sessionsCount: 1 })
    const view = renderEditor({ mode: 'edit', service })
    const packageTab = screen.getByRole('button', {
      name: 'Абонемент. Создание абонементов временно недоступно',
    })

    expect(packageTab).toBeDisabled()
    await view.user.click(packageTab)
    expect(screen.queryByText('Количество приёмов')).not.toBeInTheDocument()

    const nameInput = getNameInput()
    await view.user.clear(nameInput)
    await view.user.type(nameInput, 'Обычная услуга обновлена')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('ordinary-service', {
      name: 'Обычная услуга обновлена',
      description: 'Тестовая услуга',
      price: 250_000,
      duration: 60,
      discountPercent: null,
      sessionsCount: 1,
      photo: null,
    }))
  })

  it('оставляет существующий абонемент редактируемым и сохраняет sessionsCount 7', async () => {
    const service = createMasterService({
      id: 'package-service',
      name: 'Курс массажа',
      sessionsCount: 7,
    })
    const view = renderEditor({ mode: 'edit', service })

    expect(screen.getByRole('button', { name: 'Абонемент' })).toBeEnabled()
    expect(screen.getByRole('button', {
      name: 'Одиночная. Тип существующего абонемента нельзя изменить',
    })).toBeDisabled()
    const sessionsPicker = screen.getByText('Количество приёмов').closest('button')
    expect(sessionsPicker).toBeEnabled()
    expect(sessionsPicker).toHaveTextContent('7')

    const nameInput = getNameInput()
    await view.user.clear(nameInput)
    await view.user.type(nameInput, 'Курс массажа обновлён')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.update).toHaveBeenCalledWith('package-service', {
      name: 'Курс массажа обновлён',
      description: 'Тестовая услуга',
      price: 250_000,
      duration: 60,
      discountPercent: null,
      sessionsCount: 7,
      photo: null,
    }))
  })
})
