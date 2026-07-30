import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPayment } from '@/test/fixtures/payments'
import { renderAtRoute } from '@/test/render'
import type { Payment } from '@/types'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  usePaymentsExport: vi.fn(),
  exportAction: vi.fn(),
  dismissToast: vi.fn(),
}))

vi.mock('@/api/payments.api', () => ({ paymentsApi: { list: mocks.list } }))
vi.mock('@/hooks/usePaymentsExport', () => ({ usePaymentsExport: mocks.usePaymentsExport }))

import PaymentsDayPage from './PaymentsDayPage'
import PaymentsPage from './PaymentsPage'

function payment({
  id,
  date,
  time,
  amount,
  status = 'PAID',
  serviceName,
  clientName,
}: {
  id: string
  date: string
  time: string
  amount: number
  status?: Payment['status']
  serviceName: string
  clientName: string
}) {
  const base = createPayment()
  return createPayment({
    id,
    bookingId: `booking-${id}`,
    amount,
    status,
    booking: {
      ...base.booking!,
      id: `booking-${id}`,
      date,
      time,
      paymentStatus: status,
      client: { ...base.booking!.client, name: clientName },
      service: { ...base.booking!.service, name: serviceName, price: amount },
    },
  })
}

const payments = [
  payment({
    id: 'july-late', date: '2026-07-21', time: '15:00', amount: 250_000,
    serviceName: 'Поздняя услуга', clientName: 'Поздний клиент',
  }),
  payment({
    id: 'july-early-unpaid', date: '2026-07-21', time: '09:00', amount: 100_000,
    status: 'UNPAID', serviceName: 'Ранняя услуга', clientName: 'Ранний клиент',
  }),
  payment({
    id: 'july-next-day', date: '2026-07-22', time: '11:00', amount: 50_000,
    serviceName: 'Услуга следующего дня', clientName: 'Другой клиент',
  }),
  payment({
    id: 'june', date: '2026-06-05', time: '12:00', amount: 100_000,
    serviceName: 'Июньская услуга', clientName: 'Июньский клиент',
  }),
]

function renderDay(date = '2026-07-21', entries?: string[]) {
  return renderAtRoute(
    <Routes>
      <Route path="/income" element={<div>Income</div>} />
      <Route path="/income/:date" element={<PaymentsDayPage />} />
      <Route path="/bookings/:id" element={<div>Booking detail</div>} />
    </Routes>,
    entries ? { entries } : { route: `/income/${date}` },
  )
}

describe('master payments pages', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.list.mockResolvedValue(payments)
    mocks.usePaymentsExport.mockImplementation((date?: string) => ({
      exporting: false,
      handleExport: () => mocks.exportAction(date),
      toast: null,
      dismissToast: mocks.dismissToast,
    }))
  })

  it('группирует суммы по booking month/day и отмечает неоплаты', async () => {
    renderAtRoute(<PaymentsPage />)

    expect(await screen.findByText('Июль ’26')).toBeInTheDocument()
    expect(screen.getByText('Июнь ’26')).toBeInTheDocument()
    expect(screen.getByText(/4.?000,00 ₽/)).toBeInTheDocument()
    expect(await screen.findByText(/3.?500 ₽/)).toBeInTheDocument()
    expect(screen.getByText('2 записи')).toBeInTheDocument()
    expect(screen.getByText('Есть неоплаты')).toBeInTheDocument()
    expect(screen.getByText('22 июл')).toBeInTheDocument()
  })

  it('переключает month summary и показывает соответствующие дни', async () => {
    const view = renderAtRoute(<PaymentsPage />)
    await screen.findByText('Июнь ’26')

    await view.user.click(screen.getByText('Июнь ’26'))

    expect(screen.getByText('5 июн')).toBeInTheDocument()
    expect(screen.getByText(/1.?000 ₽/)).toBeInTheDocument()
    expect(screen.queryByText('22 июл')).not.toBeInTheDocument()
  })

  it('открывает exact day route из income list', async () => {
    const view = renderAtRoute(<PaymentsPage />)

    await view.user.click(await screen.findByText('21 июл'))

    expect(view.getLocation().pathname).toBe('/income/2026-07-21')
  })

  it('PaymentsDayPage фильтрует дату, сортирует время и показывает status/amount', async () => {
    renderDay()

    const early = await screen.findByText('Ранняя услуга')
    const late = screen.getByText('Поздняя услуга')
    expect(early.compareDocumentPosition(late) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Ранний клиент')).toBeInTheDocument()
    expect(screen.getByText('Не оплачено')).toBeInTheDocument()
    expect(screen.getByText('Оплачено')).toBeInTheDocument()
    expect(screen.getByText(/1.?000 ₽/)).toBeInTheDocument()
    expect(screen.queryByText('Услуга следующего дня')).not.toBeInTheDocument()
    expect(screen.getByText('21 июля 2026')).toBeInTheDocument()
  })

  it('передаёт all-payments и day export affordances в hook', async () => {
    const all = renderAtRoute(<PaymentsPage />)
    await all.user.click(screen.getByRole('button', { name: 'Экспорт' }))
    expect(mocks.exportAction).toHaveBeenCalledWith(undefined)
    all.unmount()

    const day = renderDay('2026-07-21')
    await day.user.click(screen.getByRole('button', { name: 'Экспорт' }))
    expect(mocks.exportAction).toHaveBeenCalledWith('2026-07-21')
  })

  it('открывает запись из карточки оплаты за день', async () => {
    const view = renderDay()

    await view.user.click(await screen.findByRole('button', { name: /Ранняя услуга/ }))

    expect(view.getLocation().pathname).toBe('/bookings/booking-july-early-unpaid')
  })

  it('показывает empty states', async () => {
    mocks.list.mockResolvedValue([])
    const all = renderAtRoute(<PaymentsPage />)
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce())
    expect(screen.getByText('Пока нет поступлений')).toBeInTheDocument()
    all.unmount()

    mocks.list.mockClear()
    const day = renderDay('2026-07-21')
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce())
    expect(screen.getByText('Нет оплат за этот день')).toBeInTheDocument()
  })

  it('остаётся failure-safe после list errors', async () => {
    mocks.list.mockRejectedValue(new Error('payments unavailable'))
    const all = renderAtRoute(<PaymentsPage />)
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce())
    expect(screen.getByText('Пока нет поступлений')).toBeInTheDocument()
    all.unmount()

    mocks.list.mockClear()
    const day = renderDay('2026-07-21')
    await waitFor(() => expect(mocks.list).toHaveBeenCalledOnce())
    expect(screen.getByText('Нет оплат за этот день')).toBeInTheDocument()
  })

  it('возвращается из day detail назад', async () => {
    const view = renderDay('2026-07-21', ['/income', '/income/2026-07-21'])

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(view.getLocation().pathname).toBe('/income')
  })
})
