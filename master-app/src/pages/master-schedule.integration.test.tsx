import type { ReactNode } from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterSchedule } from '@/test/fixtures/schedule'
import { renderAtRoute } from '@/test/render'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('@/api/schedule.api', () => ({ scheduleApi: api }))
vi.mock('@/pages/OnboardingPage', () => ({
  Step1Form: ({
    workingDays,
    toggleDay,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    buffer,
    setBuffer,
    hasBreak,
    setHasBreak,
    breakStart,
    setBreakStart,
    breakEnd,
    setBreakEnd,
    onBack,
    footer,
  }: {
    workingDays: number[]
    toggleDay: (day: number) => void
    startTime: string
    setStartTime: (value: string) => void
    endTime: string
    setEndTime: (value: string) => void
    buffer: number
    setBuffer: (value: number) => void
    hasBreak: boolean
    setHasBreak: (value: boolean) => void
    breakStart: string
    setBreakStart: (value: string) => void
    breakEnd: string
    setBreakEnd: (value: string) => void
    onBack: () => void
    footer: ReactNode
  }) => (
    <div>
      <output aria-label="Рабочие дни">{workingDays.join(',')}</output>
      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
        <button type="button" key={day} onClick={() => toggleDay(day)}>День {day}</button>
      ))}
      <label>Начало<input value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
      <label>Конец<input value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
      <label>Буфер<input value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} /></label>
      <label>
        Перерыв
        <input type="checkbox" checked={hasBreak} onChange={(event) => setHasBreak(event.target.checked)} />
      </label>
      <label>Начало обеда<input value={breakStart} onChange={(event) => setBreakStart(event.target.value)} /></label>
      <label>Конец обеда<input value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} /></label>
      <button type="button" onClick={onBack}>Назад из графика</button>
      {footer}
    </div>
  ),
}))

import SchedulePage from './SchedulePage'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('SchedulePage', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.upsert.mockReset()
    api.get.mockResolvedValue(createMasterSchedule())
    api.upsert.mockResolvedValue(createMasterSchedule())
  })

  it('показывает safe defaults пока schedule pending и не пишет до submit', () => {
    api.get.mockReturnValue(new Promise(() => {}))
    renderAtRoute(<SchedulePage />)

    expect(screen.getByLabelText('Рабочие дни')).toHaveTextContent('1,2,3,4,5')
    expect(screen.getByLabelText('Начало')).toHaveValue('09:00')
    expect(screen.getByLabelText('Конец')).toHaveValue('17:00')
    expect(screen.getByLabelText('Буфер')).toHaveValue('0')
    expect(screen.getByLabelText('Перерыв')).not.toBeChecked()
    expect(api.upsert).not.toHaveBeenCalled()
  })

  it('загружает authoritative days, intervals, break и buffer', async () => {
    api.get.mockResolvedValue(createMasterSchedule({
      workingDays: [2, 4, 6],
      startTime: '10:00',
      endTime: '20:00',
      breakStart: '15:00',
      breakEnd: '15:30',
      bufferMinutes: 25,
    }))
    renderAtRoute(<SchedulePage />)

    await waitFor(() => expect(screen.getByLabelText('Рабочие дни')).toHaveTextContent('2,4,6'))
    expect(screen.getByLabelText('Начало')).toHaveValue('10:00')
    expect(screen.getByLabelText('Конец')).toHaveValue('20:00')
    expect(screen.getByLabelText('Буфер')).toHaveValue('25')
    expect(screen.getByLabelText('Перерыв')).toBeChecked()
    expect(screen.getByLabelText('Начало обеда')).toHaveValue('15:00')
    expect(screen.getByLabelText('Конец обеда')).toHaveValue('15:30')
  })

  it('редактирует day-off/intervals и отправляет exact schedule payload', async () => {
    api.get.mockResolvedValue(createMasterSchedule({
      workingDays: [1, 2, 3],
      breakStart: null,
      breakEnd: null,
    }))
    const view = renderAtRoute(<SchedulePage />, { entries: ['/settings', '/schedule'] })
    await waitFor(() => expect(screen.getByLabelText('Рабочие дни')).toHaveTextContent('1,2,3'))

    await view.user.click(screen.getByRole('button', { name: 'День 2' }))
    await view.user.click(screen.getByRole('button', { name: 'День 5' }))
    await view.user.clear(screen.getByLabelText('Начало'))
    await view.user.type(screen.getByLabelText('Начало'), '08:30')
    await view.user.clear(screen.getByLabelText('Конец'))
    await view.user.type(screen.getByLabelText('Конец'), '19:15')
    await view.user.clear(screen.getByLabelText('Буфер'))
    await view.user.type(screen.getByLabelText('Буфер'), '20')

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(api.upsert).toHaveBeenCalledWith({
      workingDays: [1, 3, 5],
      startTime: '08:30',
      endTime: '19:15',
      bufferMinutes: 20,
      breakStart: null,
      breakEnd: null,
    }))
    expect(view.getLocation().pathname).toBe('/settings')
  })

  it('останавливает submit если конец обеда не позже начала', async () => {
    const view = renderAtRoute(<SchedulePage />)
    await waitFor(() => expect(screen.getByLabelText('Перерыв')).toBeChecked())
    await view.user.clear(screen.getByLabelText('Начало обеда'))
    await view.user.type(screen.getByLabelText('Начало обеда'), '15:00')
    await view.user.clear(screen.getByLabelText('Конец обеда'))
    await view.user.type(screen.getByLabelText('Конец обеда'), '14:00')

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(screen.getByText('Конец обеда должен быть позже его начала')).toBeInTheDocument()
    expect(api.upsert).not.toHaveBeenCalled()

    await view.user.clear(screen.getByLabelText('Конец обеда'))
    await view.user.type(screen.getByLabelText('Конец обеда'), '16:00')
    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(api.upsert).toHaveBeenCalledOnce())
  })

  it('держит busy state и не допускает duplicate upsert', async () => {
    const save = deferred<ReturnType<typeof createMasterSchedule>>()
    api.upsert.mockReturnValue(save.promise)
    const view = renderAtRoute(<SchedulePage />, { entries: ['/settings', '/schedule'] })
    await waitFor(() => expect(api.get).toHaveBeenCalledOnce())

    await view.user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(screen.getByRole('button', { name: 'Сохраняем...' })).toBeDisabled()
    await view.user.click(screen.getByRole('button', { name: 'Сохраняем...' }))
    expect(api.upsert).toHaveBeenCalledOnce()

    await act(async () => save.resolve(createMasterSchedule()))
    await waitFor(() => expect(view.getLocation().pathname).toBe('/settings'))
  })

  it('блокирует submit без единого рабочего дня', async () => {
    api.get.mockResolvedValue(createMasterSchedule({ workingDays: [1] }))
    const view = renderAtRoute(<SchedulePage />)
    await waitFor(() => expect(screen.getByLabelText('Рабочие дни')).toHaveTextContent('1'))

    await view.user.click(screen.getByRole('button', { name: 'День 1' }))

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    expect(api.upsert).not.toHaveBeenCalled()
  })

  it('остаётся usable с defaults после load failure', async () => {
    api.get.mockRejectedValue(new Error('schedule unavailable'))
    renderAtRoute(<SchedulePage />)
    await waitFor(() => expect(api.get).toHaveBeenCalledOnce())

    expect(screen.getByLabelText('Рабочие дни')).toHaveTextContent('1,2,3,4,5')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
    expect(api.upsert).not.toHaveBeenCalled()
  })

  it('возвращается назад без submit', async () => {
    const view = renderAtRoute(<SchedulePage />, { entries: ['/settings', '/schedule'] })

    await view.user.click(screen.getByRole('button', { name: 'Назад из графика' }))

    expect(view.getLocation().pathname).toBe('/settings')
    expect(api.upsert).not.toHaveBeenCalled()
  })
})
