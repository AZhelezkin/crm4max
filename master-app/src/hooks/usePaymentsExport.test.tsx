import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FIXED_NOW, useFixedTime } from '@/test/time'
import { installWebApp } from '@/test/web-app-fixture'

const paymentsApiMock = vi.hoisted(() => ({
  exportXlsx: vi.fn(),
}))

vi.mock('@/api/payments.api', () => ({
  paymentsApi: paymentsApiMock,
}))

import { usePaymentsExport } from './usePaymentsExport'

const exportFile = {
  url: 'https://cdn.test/payments.xlsx',
  filename: 'payments.xlsx',
}

describe('usePaymentsExport', () => {
  beforeEach(() => {
    paymentsApiMock.exportXlsx.mockResolvedValue(exportFile)
  })

  it('prefetch URL при mount и передаёт date', async () => {
    renderHook(() => usePaymentsExport('2026-07-21'))

    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledWith('2026-07-21'))
  })

  it('синхронно вызывает downloadFile для fresh URL и обновляет URL', async () => {
    const webApp = installWebApp()
    const { result } = renderHook(() => usePaymentsExport())
    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce())

    act(() => {
      result.current.handleExport()
      expect(webApp.downloadFile).toHaveBeenCalledWith(exportFile.url, exportFile.filename)
    })

    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledTimes(2))
  })

  it('показывает success только для native downloading status', async () => {
    const webApp = installWebApp({
      downloadFile: vi.fn().mockResolvedValue({ status: 'downloading' }),
    })
    const { result } = renderHook(() => usePaymentsExport())
    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce())

    act(() => result.current.handleExport())

    await waitFor(() => expect(result.current.toast).toEqual({
      kind: 'success',
      text: 'Файл сохранён в папку Max',
    }))
    expect(webApp.downloadFile).toHaveBeenCalledOnce()
  })

  it('молчит при native cancelled status', async () => {
    installWebApp({
      downloadFile: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    })
    const { result } = renderHook(() => usePaymentsExport())
    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce())

    act(() => result.current.handleExport())
    await Promise.resolve()

    expect(result.current.toast).toBeNull()
  })

  it('показывает error для rejected и thrown download', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    installWebApp({
      downloadFile: vi.fn().mockRejectedValue(new Error('native rejected')),
    })
    const rejected = renderHook(() => usePaymentsExport())
    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce())

    act(() => rejected.result.current.handleExport())
    await waitFor(() => expect(rejected.result.current.toast?.kind).toBe('error'))
    rejected.unmount()

    paymentsApiMock.exportXlsx.mockClear()
    installWebApp({
      downloadFile: vi.fn(() => {
        throw new Error('native threw')
      }),
    })
    const thrown = renderHook(() => usePaymentsExport())
    await waitFor(() => expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce())

    act(() => thrown.result.current.handleExport())

    expect(thrown.result.current.toast).toEqual({
      kind: 'error',
      text: 'Не удалось скачать файл.',
    })
    expect(error).toHaveBeenCalled()
  })

  it('не скачивает stale URL и просит повторить нажатие', async () => {
    useFixedTime(FIXED_NOW)
    const webApp = installWebApp()
    const { result } = renderHook(() => usePaymentsExport())
    await act(async () => {
      await Promise.resolve()
    })
    expect(paymentsApiMock.exportXlsx).toHaveBeenCalledOnce()
    vi.setSystemTime(new Date(Date.parse(FIXED_NOW) + 4 * 60 * 1000 + 1))

    await act(async () => {
      result.current.handleExport()
      await Promise.resolve()
    })

    expect(webApp.downloadFile).not.toHaveBeenCalled()
    expect(result.current.toast).toEqual({
      kind: 'success',
      text: 'Файл готов — нажмите «Скачать» ещё раз',
    })
  })

  it('защищает refresh от повторного клика пока exporting=true', async () => {
    useFixedTime()
    let resolveRefresh: ((value: typeof exportFile) => void) | undefined
    paymentsApiMock.exportXlsx
      .mockResolvedValueOnce(exportFile)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveRefresh = resolve
      }))
    const webApp = installWebApp()
    const { result } = renderHook(() => usePaymentsExport())
    await act(async () => {
      await Promise.resolve()
    })
    vi.setSystemTime(new Date(Date.parse(FIXED_NOW) + 5 * 60 * 1000))

    act(() => result.current.handleExport())
    act(() => result.current.handleExport())

    expect(result.current.exporting).toBe(true)
    expect(paymentsApiMock.exportXlsx).toHaveBeenCalledTimes(2)
    expect(webApp.downloadFile).not.toHaveBeenCalled()

    await act(async () => {
      resolveRefresh?.(exportFile)
      await Promise.resolve()
    })
    expect(result.current.exporting).toBe(false)
  })

  it('очищает toast timer при unmount', async () => {
    useFixedTime()
    installWebApp({
      downloadFile: vi.fn().mockResolvedValue({ status: 'downloading' }),
    })
    const { result, unmount } = renderHook(() => usePaymentsExport())
    await act(async () => {
      await Promise.resolve()
    })

    act(() => result.current.handleExport())
    await act(async () => {
      await Promise.resolve()
    })
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
