import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { installWebApp } from '@/test/web-app-fixture'

const TOKEN = 'pl_0123456789abcdefghijklmnopqrstuv'
const preview = vi.hoisted(() => vi.fn())
const confirm = vi.hoisted(() => vi.fn())
const authDetect = vi.hoisted(() => vi.fn())

vi.mock('@/api/messenger-profile-links.api', () => ({
  previewMessengerProfileLink: preview,
  confirmMessengerProfileLink: confirm,
  messengerProfileLinkErrorMessage: (error: Error) => error.message,
}))
vi.mock('@/api/auth.api', () => ({ authApi: { detect: authDetect } }))
vi.mock('@client/ClientApp', () => ({ default: () => <div>ordinary client auth</div> }))

async function loadApp(provider: 'MAX' | 'TELEGRAM' = 'MAX') {
  vi.resetModules()
  window.history.replaceState(null, '', '/#/')
  if (provider === 'MAX') {
    delete window.__MINI_APP_PROVIDER__
    delete window.Telegram
    installWebApp({ initData: 'signed-max-data', initDataUnsafe: { start_param: TOKEN } })
  } else {
    window.__MINI_APP_PROVIDER__ = 'telegram'
    window.Telegram = {
      WebApp: { initData: 'signed-telegram-data', initDataUnsafe: { start_param: TOKEN }, close: vi.fn() },
    }
  }
  return (await import('./App')).default
}

describe.sequential('destination profile-link confirmation gate', () => {
  beforeEach(() => {
    sessionStorage.removeItem('profileLink.confirmedToken')
    preview.mockReset().mockResolvedValue({ sourceProvider: 'MAX', destinationProvider: 'TELEGRAM', expiresIn: 60 })
    confirm.mockReset().mockResolvedValue(undefined)
    authDetect.mockReset()
  })

  it.each(['MAX', 'TELEGRAM'] as const)('делает preview до auth для %s', async (provider) => {
    const App = await loadApp(provider)
    render(<App />)

    expect(await screen.findByRole('dialog', { name: 'Связать профили?' })).toBeInTheDocument()
    expect(preview).toHaveBeenCalledWith({ provider, init_data: provider === 'MAX' ? 'signed-max-data' : 'signed-telegram-data' })
    expect(authDetect).not.toHaveBeenCalled()
    expect(screen.getByText(/текущий профиль будет связан/i)).toBeInTheDocument()
  })

  it('подтверждает один раз и отмечает token перед reload', async () => {
    let release: (() => void) | undefined
    confirm.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))
    const App = await loadApp()
    render(<App />)
    const user = userEvent.setup()
    const button = await screen.findByRole('button', { name: 'Связать' })

    await user.dblClick(button)
    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm).toHaveBeenCalledWith({ provider: 'MAX', init_data: 'signed-max-data' })
    release?.()

    await waitFor(() => expect(sessionStorage.getItem('profileLink.confirmedToken')).toBe(TOKEN))
    expect(authDetect).not.toHaveBeenCalled()
  })

  it('отмена закрывает Mini App без binding', async () => {
    const App = await loadApp()
    const close = window.WebApp!.close
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Отмена' }))

    expect(close).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
    expect(authDetect).not.toHaveBeenCalled()
  })

  it.each(['Ссылка истекла.', 'Профили конфликтуют.'])('оставляет ошибку терминальным gate: %s', async (message) => {
    preview.mockRejectedValue(new Error(message))
    const App = await loadApp()
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('dialog', { name: 'Не удалось связать профили' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeEnabled()
    expect(authDetect).not.toHaveBeenCalled()
  })

  it('не уходит в auth при ошибке confirm', async () => {
    confirm.mockRejectedValue(new Error('Ссылка истекла.'))
    const App = await loadApp()
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: 'Связать' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ссылка истекла.')
    expect(authDetect).not.toHaveBeenCalled()
  })
})
