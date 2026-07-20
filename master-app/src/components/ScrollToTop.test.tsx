import { screen, waitFor } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderAtRoute } from '@/test/render'

import ScrollToTop from './ScrollToTop'

const originalBodyScrollTo = Object.getOwnPropertyDescriptor(document.body, 'scrollTo')

function RouteButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/next')}>Следующая страница</button>
}

afterEach(() => {
  if (originalBodyScrollTo) Object.defineProperty(document.body, 'scrollTo', originalBodyScrollTo)
  else Reflect.deleteProperty(document.body, 'scrollTo')
})

describe('ScrollToTop', () => {
  it('сбрасывает body и window scroll при mount и смене pathname', async () => {
    const bodyScrollTo = vi.fn()
    Object.defineProperty(document.body, 'scrollTo', { configurable: true, value: bodyScrollTo })
    const windowScrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    const { user } = renderAtRoute(
      <>
        <ScrollToTop />
        <RouteButton />
      </>,
      { route: '/start' },
    )

    expect(bodyScrollTo).toHaveBeenCalledWith(0, 0)
    expect(windowScrollTo).toHaveBeenCalledWith(0, 0)

    await user.click(screen.getByRole('button', { name: 'Следующая страница' }))

    await waitFor(() => expect(bodyScrollTo).toHaveBeenCalledTimes(2))
    expect(windowScrollTo).toHaveBeenCalledTimes(2)
  })
})
