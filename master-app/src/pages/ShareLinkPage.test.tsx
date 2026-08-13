import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth.store'
import { installBrowserFixture } from '@/test/browser-fixture'
import { MASTER_ID } from '@/test/fixtures/auth'
import { createMasterProfile } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'

vi.mock('qrcode.react', async () => {
  const { forwardRef } = await vi.importActual<typeof import('react')>('react')
  return {
    QRCodeCanvas: forwardRef<HTMLCanvasElement, { value: string }>(({ value }, ref) => (
      <canvas ref={ref} data-qr-value={value} />
    )),
  }
})

import ShareLinkPage from './ShareLinkPage'

const DEEP_LINK = `https://max.ru/id9706002253_1_bot?start=${MASTER_ID}`

function setMaster(master = createMasterProfile()) {
  useAuthStore.setState({
    token: 'master-test-token',
    master,
    isLoading: false,
  })
}

describe('ShareLinkPage', () => {
  it('формирует текущий MAX deep link и QR value', () => {
    setMaster()
    installBrowserFixture()

    renderAtRoute(<ShareLinkPage />, { route: '/share' })

    expect(screen.getByText(DEEP_LINK)).toBeInTheDocument()
    expect(document.querySelector('canvas')).toHaveAttribute('data-qr-value', DEEP_LINK)
  })

  it('не объявляет QR готовым без master id', () => {
    useAuthStore.setState({ token: null, master: null, isLoading: false })
    installBrowserFixture()

    renderAtRoute(<ShareLinkPage />)

    expect(screen.getByText('QR-код появится после авторизации')).toBeInTheDocument()
    expect(document.querySelector('canvas')).not.toBeInTheDocument()
    expect(screen.getByTitle('Поделиться')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Скопировать ссылку' })).toBeDisabled()
  })

  it('не показывает MAX destination в Telegram', () => {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    setMaster()
    installBrowserFixture()

    renderAtRoute(<ShareLinkPage />)

    expect(screen.queryByText(/https:\/\/max\.ru/)).not.toBeInTheDocument()
    expect(screen.getByTitle('Поделиться')).toBeDisabled()
    expect(document.querySelector('canvas')).not.toBeInTheDocument()
  })

  it('копирует ссылку и сбрасывает feedback через две секунды', async () => {
    vi.useFakeTimers()
    setMaster()
    renderAtRoute(<ShareLinkPage />)
    const browser = installBrowserFixture()

    fireEvent.click(screen.getByRole('button', { name: 'Скопировать ссылку' }))
    await act(async () => {
      await Promise.resolve()
    })

    expect(browser.writeText).toHaveBeenCalledWith(DEEP_LINK)
    expect(screen.getByRole('button', { name: 'Скопировано!' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('button', { name: 'Скопировать ссылку' })).toBeInTheDocument()
  })

  it('передаёт exact content в navigator.share', async () => {
    setMaster()
    const browser = installBrowserFixture()
    const { user } = renderAtRoute(<ShareLinkPage />)

    await user.click(screen.getByTitle('Поделиться'))

    expect(browser.share).toHaveBeenCalledWith({
      title: 'Анна Мастерова',
      text: 'Записывайтесь ко мне через Max: Анна Мастерова',
      url: DEEP_LINK,
    })
    expect(browser.writeText).not.toHaveBeenCalled()
  })

  it('fallback на clipboard без navigator.share', async () => {
    setMaster()
    const { user } = renderAtRoute(<ShareLinkPage />)
    const browser = installBrowserFixture({ share: false })
    browser.writeText.mockImplementation(() => new Promise(() => undefined))

    await user.click(screen.getByTitle('Поделиться'))

    expect(browser.writeText).toHaveBeenCalledWith(DEEP_LINK)
  })

  it('не показывает ошибку и не копирует при отмене share', async () => {
    setMaster()
    const browser = installBrowserFixture()
    browser.share.mockRejectedValue(new Error('user cancelled'))
    const { user } = renderAtRoute(<ShareLinkPage />)

    await user.click(screen.getByTitle('Поделиться'))

    expect(browser.writeText).not.toHaveBeenCalled()
  })

  it('скачивает QR через canvas data URL', async () => {
    setMaster()
    installBrowserFixture()
    const captured: { anchor?: HTMLAnchorElement } = {}
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      captured.anchor = this
    })
    const { user } = renderAtRoute(<ShareLinkPage />)

    await user.click(screen.getByRole('button', { name: 'Скачать QR-код' }))

    expect(click).toHaveBeenCalledOnce()
    expect(captured.anchor?.download).toBe('qr-code.png')
    expect(captured.anchor?.href).toContain('data:image/png;base64,dGVzdA==')
  })

})
