import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'

vi.mock('@/components/AddressSuggestInput', () => ({
  default: ({
    value,
    onChange,
    onGeocode,
    onBack,
  }: {
    value: string
    onChange: (value: string) => void
    onGeocode: (lat: number, lng: number) => void
    onBack: () => void
  }) => (
    <div>
      <span data-testid="address-value">{value}</span>
      <button onClick={() => {
        onChange('  Москва, Тестовая улица, 2  ')
        onGeocode(55.76, 37.61)
      }}>
        Выбрать адрес
      </button>
      <button onClick={onBack}>Назад с карты</button>
    </div>
  ),
}))

import AddressPickerPortal from './AddressPickerPortal'

describe('AddressPickerPortal', () => {
  it('ничего не рендерит когда закрыт', () => {
    const { container } = render(
      <AddressPickerPortal open={false} value="Адрес" onClose={() => {}} onConfirm={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Готово' })).not.toBeInTheDocument()
  })

  it('следует visual viewport и очищает listeners', () => {
    const browser = installBrowserFixture()
    const view = render(
      <AddressPickerPortal open value="Адрес" onClose={() => {}} onConfirm={() => {}} />,
    )
    const overlay = screen.getByRole('button', { name: 'Готово' }).parentElement!.parentElement!

    expect(overlay).toHaveStyle({ top: '0px', height: '844px' })
    expect(browser.addViewportListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(browser.addViewportListener).toHaveBeenCalledWith('scroll', expect.any(Function))

    const resizeListener = browser.addViewportListener.mock.calls.find(([event]) => event === 'resize')?.[1]
    Object.assign(window.visualViewport!, { offsetTop: 120, height: 500 })
    act(() => resizeListener?.(new Event('resize')))

    expect(overlay).toHaveStyle({ top: '120px', height: '500px' })

    view.unmount()
    expect(browser.removeViewportListener).toHaveBeenCalledWith('resize', resizeListener)
    expect(browser.removeViewportListener).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('сохраняет trimmed address и выбранные координаты', async () => {
    installBrowserFixture()
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <AddressPickerPortal
        open
        value="Исходный адрес"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Выбрать адрес' }))
    await user.click(screen.getByRole('button', { name: 'Готово' }))

    expect(onConfirm).toHaveBeenCalledWith('Москва, Тестовая улица, 2', {
      lat: 55.76,
      lng: 37.61,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('сбрасывает draft и coordinates при повторном открытии', async () => {
    installBrowserFixture()
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const props = { onClose: vi.fn(), onConfirm }
    const view = render(<AddressPickerPortal open value="Первый адрес" {...props} />)
    await user.click(screen.getByRole('button', { name: 'Выбрать адрес' }))

    view.rerender(<AddressPickerPortal open={false} value="Второй адрес" {...props} />)
    view.rerender(<AddressPickerPortal open value="Второй адрес" {...props} />)
    expect(screen.getByTestId('address-value')).toHaveTextContent('Второй адрес')

    await user.click(screen.getByRole('button', { name: 'Готово' }))
    expect(onConfirm).toHaveBeenCalledWith('Второй адрес', null)
  })

  it('делегирует back action из карты', async () => {
    installBrowserFixture()
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AddressPickerPortal open value="Адрес" onClose={onClose} onConfirm={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Назад с карты' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
