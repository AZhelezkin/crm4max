import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderAtRoute } from '@/test/render'

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
    onConfirm: (address: string) => void
  }) => open ? (
    <div role="dialog" aria-label="Debug address picker">
      <span>Текущее значение: {value || 'пусто'}</span>
      <button type="button" onClick={() => {
        onConfirm('Москва, Тестовая улица, 1')
        onClose()
      }}>
        Выбрать тестовый адрес
      </button>
      <button type="button" onClick={onClose}>Закрыть</button>
    </div>
  ) : null,
}))

import MapTestPage from './MapTestPage'

describe('MapTestPage debug smoke', () => {
  it('открывает picker сразу, отображает выбор и разрешает открыть повторно', async () => {
    const view = renderAtRoute(<MapTestPage />, { route: '/map-test' })

    expect(screen.getByText('Map test page')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Debug address picker' })).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Выбрать тестовый адрес' }))

    expect(screen.getByText('Москва, Тестовая улица, 1')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await view.user.click(screen.getByRole('button', { name: 'Открыть выбор адреса' }))
    expect(screen.getByText('Текущее значение: Москва, Тестовая улица, 1')).toBeInTheDocument()
  })
})
