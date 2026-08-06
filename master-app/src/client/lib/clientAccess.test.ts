import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MASTER_ID } from '@/test/fixtures/auth'

const mockCheckClientAccess = vi.hoisted(() => vi.fn())

vi.mock('@client/api/masters.api', () => ({
  mastersApi: { checkClientAccess: mockCheckClientAccess },
}))

import {
  checkClientAccess,
  isClientBlockedByMasterError,
} from './clientAccess'

describe('client access delivery flow', () => {
  beforeEach(() => {
    mockCheckClientAccess.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('разрешает профиль без provider effect', async () => {
    mockCheckClientAccess.mockResolvedValue({ access: 'allowed' })

    await expect(checkClientAccess(MASTER_ID)).resolves.toBe('allowed')
    expect(mockCheckClientAccess).toHaveBeenCalledWith(MASTER_ID)
  })

  it.each(['sent', 'already_sent'] as const)('подтверждает блокировку после delivery=%s', async (delivery) => {
    mockCheckClientAccess.mockResolvedValue({ access: 'blocked', delivery })

    await expect(checkClientAccess(MASTER_ID)).resolves.toBe('blocked')
  })

  it('не подтверждает blocked без статуса доставки', async () => {
    mockCheckClientAccess.mockResolvedValue({ access: 'blocked' })

    await expect(checkClientAccess(MASTER_ID)).resolves.toBe('unavailable')
  })

  it('повторяет explicit pending до подтверждённой доставки', async () => {
    vi.useFakeTimers()
    mockCheckClientAccess
      .mockResolvedValueOnce({ access: 'blocked', delivery: 'pending' })
      .mockResolvedValueOnce({ access: 'blocked', delivery: 'sent' })

    const result = checkClientAccess(MASTER_ID)
    await vi.advanceTimersByTimeAsync(250)

    await expect(result).resolves.toBe('blocked')
    expect(mockCheckClientAccess).toHaveBeenCalledTimes(2)
  })

  it('возвращает unavailable, если доставка остаётся pending весь интервал ожидания', async () => {
    vi.useFakeTimers()
    mockCheckClientAccess.mockResolvedValue({ access: 'blocked', delivery: 'pending' })

    const result = checkClientAccess(MASTER_ID)
    await vi.runAllTimersAsync()

    await expect(result).resolves.toBe('unavailable')
    expect(mockCheckClientAccess).toHaveBeenCalledTimes(24)
  })

  it.each([
    [{ response: { status: 503, data: { error: 'CLIENT_BLOCKED_NOTICE_DELIVERY_FAILED' } } }],
    [new Error('access unavailable')],
  ])('fail-closed без закрытия при access/delivery failure', async (error) => {
    mockCheckClientAccess.mockRejectedValue(error)

    await expect(checkClientAccess(MASTER_ID)).resolves.toBe('unavailable')
  })

  it('распознаёт только стабильный blocked 403', () => {
    expect(isClientBlockedByMasterError({
      response: { status: 403, data: { error: 'CLIENT_BLOCKED_BY_MASTER' } },
    })).toBe(true)
    expect(isClientBlockedByMasterError({
      response: { status: 500, data: { error: 'CLIENT_BLOCKED_BY_MASTER' } },
    })).toBe(false)
    expect(isClientBlockedByMasterError(new Error('CLIENT_BLOCKED_BY_MASTER'))).toBe(false)
  })
})
