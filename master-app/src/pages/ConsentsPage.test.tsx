import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OFFER_URL, PERSONAL_DATA_URL } from '@/lib/legalDocuments'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'
import ConsentsPage from './ConsentsPage'

describe('ConsentsPage', () => {
  it('показывает оба документа и открывает их через Max WebApp', async () => {
    const webApp = installWebApp()
    const { user } = renderAtRoute(<ConsentsPage />, { route: '/consents' })

    expect(screen.getByText('Согласия')).toBeInTheDocument()
    expect(screen.getByText('Оферта')).toBeInTheDocument()
    expect(screen.getByText('Персональные данные')).toBeInTheDocument()

    const readButtons = screen.getAllByRole('button', { name: 'Прочитать' })
    await user.click(readButtons[0])
    await user.click(readButtons[1])

    expect(webApp.openLink).toHaveBeenNthCalledWith(1, OFFER_URL)
    expect(webApp.openLink).toHaveBeenNthCalledWith(2, PERSONAL_DATA_URL)
  })

  it('возвращается на предыдущий экран', async () => {
    const { user, getLocation } = renderAtRoute(<ConsentsPage />, {
      entries: ['/other', '/consents'],
    })

    await user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(getLocation().pathname).toBe('/other')
  })
})
