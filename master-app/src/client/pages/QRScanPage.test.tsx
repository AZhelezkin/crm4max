import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useBookingStore } from '@client/store/booking.store'
import { MASTER_ID } from '@/test/fixtures/auth'
import { renderAtRoute } from '@/test/render'
import { installWebApp } from '@/test/web-app-fixture'
import type { CodeReaderResult } from '@/test/web-app-fixture'

import QRScanPage from './QRScanPage'

async function scan(result: CodeReaderResult) {
  const webApp = installWebApp({
    openCodeReader: vi.fn().mockResolvedValue(result),
  })
  const view = renderAtRoute(<QRScanPage />)

  await view.user.click(screen.getByRole('button', { name: 'Сканировать' }))
  await waitFor(() => expect(useBookingStore.getState().masterId).toBe(MASTER_ID))

  return { webApp, ...view }
}

describe('QRScanPage', () => {
  beforeEach(() => {
    useBookingStore.setState({ masterId: '' })
  })

  it.each([
    ['raw UUID', MASTER_ID],
    ['MAX URL', `https://max.ru/test-bot?startapp=${MASTER_ID}`],
    ['embedded UUID', `Мастер: ${MASTER_ID}`],
    ['data field', { data: MASTER_ID }],
    ['result field', { result: MASTER_ID }],
    ['text field', { text: MASTER_ID }],
  ] as const)('извлекает master id из %s', async (_label, result) => {
    const { webApp, getLocation } = await scan(result)

    expect(webApp.openCodeReader).toHaveBeenCalledWith(true)
    expect(getLocation()).toMatchObject({
      pathname: '/',
      search: `?masterId=${MASTER_ID}`,
    })
  })

  it('восстанавливает scanning state для invalid result', async () => {
    const webApp = installWebApp({
      openCodeReader: vi.fn().mockResolvedValue('not-a-master-code'),
    })
    const { user, getLocation } = renderAtRoute(<QRScanPage />)

    await user.click(screen.getByRole('button', { name: 'Сканировать' }))

    expect(await screen.findByRole('button', { name: 'Сканировать' })).toBeEnabled()
    expect(useBookingStore.getState().masterId).toBe('')
    expect(getLocation().search).toBe('')
  })

  it('восстанавливает scanning state после rejection', async () => {
    installWebApp({
      openCodeReader: vi.fn().mockRejectedValue(new Error('scanner cancelled')),
    })
    const { user } = renderAtRoute(<QRScanPage />)

    await user.click(screen.getByRole('button', { name: 'Сканировать' }))

    expect(await screen.findByRole('button', { name: 'Сканировать' })).toBeEnabled()
    expect(useBookingStore.getState().masterId).toBe('')
  })

  it('не открывает второй scanner пока первый pending', async () => {
    let resolveReader: ((value: string) => void) | undefined
    const openCodeReader = vi.fn().mockImplementation(() => new Promise<string>((resolve) => {
      resolveReader = resolve
    }))
    installWebApp({ openCodeReader })
    const { user } = renderAtRoute(<QRScanPage />)

    await user.click(screen.getByRole('button', { name: 'Сканировать' }))
    const pendingButton = screen.getByRole('button', { name: 'Открываю камеру…' })
    await user.click(pendingButton)

    expect(openCodeReader).toHaveBeenCalledOnce()

    resolveReader?.('invalid')
    expect(await screen.findByRole('button', { name: 'Сканировать' })).toBeEnabled()
  })

  it('ничего не делает без scanner capability', async () => {
    installWebApp({ openCodeReader: undefined })
    const { user } = renderAtRoute(<QRScanPage />)

    await user.click(screen.getByRole('button', { name: 'Сканировать' }))

    expect(useBookingStore.getState().masterId).toBe('')
  })
})
