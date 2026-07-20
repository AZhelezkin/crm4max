import { useEffect } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Location, MemoryRouterProps } from 'react-router-dom'

type RouterEntries = NonNullable<MemoryRouterProps['initialEntries']>

interface RenderAtRouteOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  entries?: RouterEntries
}

function LocationObserver({ onChange }: { onChange: (location: Location) => void }) {
  const location = useLocation()

  useEffect(() => {
    onChange(location)
  }, [location, onChange])

  return null
}

function RouterHarness({
  children,
  entries,
  onLocation,
}: {
  children: ReactNode
  entries: RouterEntries
  onLocation: (location: Location) => void
}) {
  return (
    <MemoryRouter
      initialEntries={entries}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <LocationObserver onChange={onLocation} />
      {children}
    </MemoryRouter>
  )
}

export function renderAtRoute(ui: ReactElement, options: RenderAtRouteOptions = {}) {
  const { route = '/', entries = [route], ...renderOptions } = options
  let currentLocation: Location | null = null
  const onLocation = (location: Location) => {
    currentLocation = location
  }

  const result = render(
    <RouterHarness entries={entries} onLocation={onLocation}>
      {ui}
    </RouterHarness>,
    renderOptions,
  )

  return {
    ...result,
    user: userEvent.setup(),
    getLocation: () => {
      if (!currentLocation) throw new Error('Router location is not ready')
      return currentLocation
    },
  }
}
