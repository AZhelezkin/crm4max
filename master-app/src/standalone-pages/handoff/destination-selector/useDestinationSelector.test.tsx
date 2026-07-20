import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDestinationContext, DESTINATION_TOKEN } from '@/test/fixtures/destination-selector'
import { installWebApp } from '@/test/web-app-fixture'

const apiMock = vi.hoisted(() => ({
  getContext: vi.fn(),
  saveAddress: vi.fn(),
}))

vi.mock('./api', () => ({
  getDestinationSelectorContext: apiMock.getContext,
  saveDestinationSelectorAddress: apiMock.saveAddress,
}))

import { useDestinationSelector } from './useDestinationSelector'

describe('useDestinationSelector', () => {
  beforeEach(() => {
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: createDestinationContext() })
    apiMock.saveAddress.mockResolvedValue({ status: 'ok' })
  })

  it('не загружает context когда hook disabled', () => {
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN, false))

    expect(apiMock.getContext).not.toHaveBeenCalled()
    expect(result.current.loadState).toBe('loading')
  })

  it('fail closed без token', async () => {
    const { result } = renderHook(() => useDestinationSelector(null))

    await waitFor(() => expect(result.current.loadState).toBe('error'))
    expect(result.current.error).toBe('Форма недоступна')
    expect(apiMock.getContext).not.toHaveBeenCalled()
  })

  it('загружает server context и initial address', async () => {
    const context = createDestinationContext({ clientAddress: 'Сохранённый адрес' })
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: context })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))

    expect(apiMock.getContext).toHaveBeenCalledWith(DESTINATION_TOKEN)
    expect(result.current.context).toEqual(context)
    expect(result.current.address).toBe('Сохранённый адрес')
    expect(result.current.error).toBeNull()
  })

  it.each([
    ['forbidden', 'Форма открыта не для вашего аккаунта'],
    ['expired', 'Форма устарела'],
    ['used', 'Форма устарела'],
    ['stale', 'Форма устарела'],
    ['not_found', 'Форма недоступна'],
  ])('отображает безопасный load status %s', async (status, expectedError) => {
    apiMock.getContext.mockResolvedValue({ status })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('error'))

    expect(result.current.error).toBe(expectedError)
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })

  it('отображает network load error', async () => {
    apiMock.getContext.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('error'))
    expect(result.current.error).toBe('Не удалось открыть форму')
  })

  it('не позволяет сохранить пустой адрес', async () => {
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))

    await act(async () => {
      result.current.setAddress('   ')
    })
    await act(async () => {
      await result.current.save()
    })

    expect(result.current.error).toBe('Укажите адрес')
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })

  it('trim адрес и закрывает WebApp через 500 ms после success', async () => {
    const webApp = installWebApp()
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('  Москва, Тестовая улица, 2  '))
    vi.useFakeTimers()

    await act(async () => {
      await result.current.save()
    })

    expect(apiMock.saveAddress).toHaveBeenCalledWith(
      DESTINATION_TOKEN,
      'Москва, Тестовая улица, 2',
    )
    expect(result.current.saveState).toBe('saved')
    expect(webApp.close).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(499))
    expect(webApp.close).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(webApp.close).toHaveBeenCalledOnce()
  })

  it('не отправляет второй save пока первый pending', async () => {
    let resolveSave: ((value: { status: 'ok' }) => void) | undefined
    apiMock.saveAddress.mockImplementation(() => new Promise((resolve) => {
      resolveSave = resolve
    }))
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('Адрес клиента'))

    act(() => {
      void result.current.save()
    })
    await waitFor(() => expect(result.current.saveState).toBe('saving'))
    act(() => {
      void result.current.save()
    })

    expect(apiMock.saveAddress).toHaveBeenCalledOnce()
    vi.useFakeTimers()

    await act(async () => {
      resolveSave?.({ status: 'ok' })
      await Promise.resolve()
    })
    vi.clearAllTimers()
  })

  it.each([
    ['invalid_address', 'Проверьте адрес'],
    ['confirmation_send_failed', 'Не удалось отправить подтверждение в чат'],
    ['forbidden', 'Форма открыта не для вашего аккаунта'],
    ['expired', 'Форма устарела'],
  ])('возвращает retryable state для save status %s', async (status, expectedError) => {
    apiMock.saveAddress.mockResolvedValue({ status })
    const webApp = installWebApp()
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('Адрес клиента'))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.saveState).toBe('idle')
    expect(result.current.error).toBe(expectedError)
    expect(webApp.close).not.toHaveBeenCalled()
  })

  it('возвращает retryable state после network save error', async () => {
    apiMock.saveAddress.mockRejectedValue(new Error('network'))
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('Адрес клиента'))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.saveState).toBe('idle')
    expect(result.current.error).toBe('Не удалось сохранить адрес')
  })
})
