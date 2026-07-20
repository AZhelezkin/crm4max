import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useNavigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAtRoute } from './render'
import { server } from './msw/server'
import { installWebApp } from './web-app-fixture'

function NavigationProbe() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/next', { state: { source: 'probe' } })}>Дальше</button>
}

describe('test harness', () => {
  it('наблюдает route и navigation state через настоящий router', async () => {
    const { getLocation, user } = renderAtRoute(<NavigationProbe />, { route: '/start' })

    expect(getLocation().pathname).toBe('/start')
    await user.click(screen.getByRole('button', { name: 'Дальше' }))

    expect(getLocation()).toMatchObject({
      pathname: '/next',
      state: { source: 'probe' },
    })
  })

  it('перехватывает явно описанный network request', async () => {
    server.use(
      http.get('*/api/harness', () => HttpResponse.json({ ok: true })),
    )

    const response = await fetch('/api/harness')

    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('отклоняет неописанный network request', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(fetch('/api/unhandled-harness-request')).rejects.toThrow()
    expect(error).toHaveBeenCalled()
  })
})

describe.sequential('test harness isolation', () => {
  it('изменяет изолируемые globals', () => {
    localStorage.setItem('leaked', 'value')
    sessionStorage.setItem('leaked', 'value')
    installWebApp()
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/changed')

    expect(window.WebApp).toBeDefined()
  })

  it('не переносит globals из предыдущего теста', () => {
    expect(localStorage.getItem('leaked')).toBeNull()
    expect(sessionStorage.getItem('leaked')).toBeNull()
    expect(window.WebApp).toBeUndefined()
    expect(vi.isFakeTimers()).toBe(false)
    expect(window.location.pathname).toBe('/')
  })
})
