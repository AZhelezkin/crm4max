import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { installBrowserFixture } from '@/test/browser-fixture'

import AvatarCropPortal from './AvatarCropPortal'

function dispatchPointer(target: Element, type: string, pointerId: number, clientX: number, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  })
  target.dispatchEvent(event)
}

function renderReadyCrop(overrides: Partial<Parameters<typeof AvatarCropPortal>[0]> = {}) {
  const props = {
    open: true,
    src: 'blob:avatar-source',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  }
  const view = render(<AvatarCropPortal {...props} />)
  const image = document.body.querySelector('img')!
  const cropWindow = image.parentElement as HTMLDivElement
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1000 })
  Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 800 })
  vi.spyOn(cropWindow, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 358, 460))
  fireEvent.load(image)
  return { ...view, props, image, cropWindow }
}

describe('AvatarCropPortal', () => {
  it('ничего не рендерит когда закрыт', () => {
    const { container } = render(
      <AvatarCropPortal open={false} src="blob:avatar" onCancel={() => {}} onConfirm={() => {}} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('инициализирует изображение и делегирует back action', async () => {
    const user = userEvent.setup()
    const { props, image } = renderReadyCrop()

    expect(image).toHaveStyle({ visibility: 'visible' })
    expect(image.style.transform).toContain('scale(0.575)')

    await user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it('обрабатывает drag и wheel zoom', () => {
    const { image, cropWindow } = renderReadyCrop()
    const initialTransform = image.style.transform

    act(() => {
      dispatchPointer(cropWindow, 'pointerdown', 1, 100, 100)
      dispatchPointer(cropWindow, 'pointermove', 1, 130, 120)
      dispatchPointer(cropWindow, 'pointerup', 1, 130, 120)
    })

    expect(image.style.transform).not.toBe(initialTransform)
    expect(image.style.transform).not.toContain('NaN')
    const afterDrag = image.style.transform

    const wheel = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 179,
      clientY: 230,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      cropWindow.dispatchEvent(wheel)
    })

    expect(wheel.defaultPrevented).toBe(true)
    expect(image.style.transform).not.toBe(afterDrag)
  })

  it('экспортирует cropped JPEG с заданным output size', async () => {
    const user = userEvent.setup()
    const browser = installBrowserFixture()
    const onConfirm = vi.fn()
    renderReadyCrop({ onConfirm, outputSize: 256 })

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(browser.drawImage).toHaveBeenCalledOnce()
    expect(browser.drawImage.mock.calls[0]?.slice(-4)).toEqual([0, 0, 256, 256])
    expect(onConfirm).toHaveBeenCalledOnce()
    const file = onConfirm.mock.calls[0]?.[0] as File
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('avatar.jpg')
    expect(file.type).toBe('image/jpeg')
  })

  it('регистрирует non-passive wheel и очищает wheel/resize listeners', () => {
    const addElementListener = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
    const removeElementListener = vi.spyOn(HTMLDivElement.prototype, 'removeEventListener')
    const addWindowListener = vi.spyOn(window, 'addEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')

    const view = renderReadyCrop()

    expect(addElementListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })
    expect(addWindowListener).toHaveBeenCalledWith('resize', expect.any(Function))

    view.unmount()

    expect(removeElementListener).toHaveBeenCalledWith('wheel', expect.any(Function))
    expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
