import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDestinationContext, DESTINATION_TOKEN } from '@/test/fixtures/destination-selector'
import { installWebApp } from '@/test/web-app-fixture'

const apiMock = vi.hoisted(() => ({
  getContext: vi.fn(),
  saveAddress: vi.fn(),
  saveMasterLocation: vi.fn(),
}))

vi.mock('./api', () => ({
  getDestinationSelectorContext: apiMock.getContext,
  saveDestinationSelectorAddress: apiMock.saveAddress,
  saveDestinationSelectorMasterLocation: apiMock.saveMasterLocation,
}))

import { useDestinationSelector } from './useDestinationSelector'

describe('useDestinationSelector', () => {
  beforeEach(() => {
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: createDestinationContext() })
    apiMock.saveAddress.mockResolvedValue({ status: 'ok' })
    apiMock.saveMasterLocation.mockResolvedValue({ status: 'ok' })
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

  it('разбирает server context на адрес, реквизиты и комментарий', async () => {
    const context = createDestinationContext({ clientAddress: 'Сохранённый адрес\nэтаж 7, кв./офис 104, домофон 123#\nСлева от входа' })
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: context })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))

    expect(apiMock.getContext).toHaveBeenCalledWith(DESTINATION_TOKEN)
    expect(result.current.context).toEqual(context)
    expect(result.current.address).toBe('Сохранённый адрес')
    expect(result.current.details).toEqual({ floor: '7', apartment: '104', intercom: '123#' })
    expect(result.current.comment).toBe('Слева от входа')
    expect(result.current.error).toBeNull()
  })

  it('загружает адрес и координаты профиля в master-location режиме', async () => {
    const context = createDestinationContext({
      addressPurpose: 'master_location',
      clientAddress: null,
      masterLocation: 'Москва, Тверская улица, 7',
      masterLat: 55.76,
      masterLng: 37.61,
    })
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: context })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))

    expect(result.current.context).toEqual(context)
    expect(result.current.address).toBe('Москва, Тверская улица, 7')
    expect(result.current.coords).toEqual({ lat: 55.76, lng: 37.61 })
    expect(result.current.details).toEqual({ floor: '', apartment: '', intercom: '' })
    expect(result.current.comment).toBe('')
  })

  it('не обрезает и сохраняет без изменений длинный legacy-комментарий', async () => {
    const clientAddress = `Адрес клиента\n${'а'.repeat(301)}`
    apiMock.saveAddress.mockResolvedValue({ status: 'invalid_address' })
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ clientAddress }),
    })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    expect(result.current.comment).toHaveLength(301)

    await act(async () => {
      await result.current.save()
    })

    expect(apiMock.saveAddress).toHaveBeenCalledWith(DESTINATION_TOKEN, clientAddress)
  })

  it('не переносит длинный legacy-комментарий в новый structured payload после изменения реквизитов', async () => {
    const clientAddress = `Адрес клиента\n${'а'.repeat(301)}`
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: createDestinationContext({ clientAddress }) })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setFloor('7'))
    expect(result.current.isCommentTooLong).toBe(true)

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.error).toBe('Сократите комментарий до 300 символов')
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })

  it('не расширяет неизменённый legacy payload при сохранении', async () => {
    const clientAddress = `Адрес клиента\nэтаж 7, кв./офис 12, корпус 2, домофон 123#\n${'а'.repeat(400)}`
    apiMock.saveAddress.mockResolvedValue({ status: 'invalid_address' })
    apiMock.getContext.mockResolvedValue({ status: 'ok', data: createDestinationContext({ clientAddress }) })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))

    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    await act(async () => {
      await result.current.save()
    })

    expect(apiMock.saveAddress).toHaveBeenCalledWith(DESTINATION_TOKEN, clientAddress)
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

  it('не отправляет итоговый адрес длиннее 500 символов', async () => {
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('а'.repeat(501)))

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.isAddressTooLong).toBe(true)
    expect(result.current.error).toBe('Сократите адрес или комментарий до 500 символов')
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
  })

  it('форматирует полный адрес и закрывает WebApp через 500 ms после success', async () => {
    const webApp = installWebApp()
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.setAddress('  Москва, Тестовая улица, 2  '))
    act(() => result.current.setFloor(' 4 '))
    act(() => result.current.setApartment(' 402 '))
    act(() => result.current.setIntercom(' #402* '))
    act(() => result.current.setComment('  Вход со двора  '))
    vi.useFakeTimers()

    await act(async () => {
      await result.current.save()
    })

    expect(apiMock.saveAddress).toHaveBeenCalledWith(
      DESTINATION_TOKEN,
      'Москва, Тестовая улица, 2\nДополнительно [CRM4MAX/1]:\nЭтаж: 4\nКвартира/офис: 402\nДомофон: #402*\nКомментарий: Вход со двора',
    )
    expect(result.current.saveState).toBe('saved')
    expect(webApp.close).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(499))
    expect(webApp.close).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(webApp.close).toHaveBeenCalledOnce()
  })

  it('сохраняет выбранный адрес мастера и координаты отдельным payload', async () => {
    apiMock.getContext.mockResolvedValue({
      status: 'ok',
      data: createDestinationContext({ addressPurpose: 'master_location', clientAddress: null, masterLocation: null }),
    })
    const { result } = renderHook(() => useDestinationSelector(DESTINATION_TOKEN))
    await waitFor(() => expect(result.current.loadState).toBe('ready'))
    act(() => result.current.selectAddress('  Москва, Тестовая улица, 2  ', { lat: 55.76, lng: 37.61 }))
    vi.useFakeTimers()

    await act(async () => {
      await result.current.save()
    })

    expect(apiMock.saveMasterLocation).toHaveBeenCalledWith(DESTINATION_TOKEN, {
      location: 'Москва, Тестовая улица, 2',
      lat: 55.76,
      lng: 37.61,
    })
    expect(apiMock.saveAddress).not.toHaveBeenCalled()
    vi.clearAllTimers()
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
