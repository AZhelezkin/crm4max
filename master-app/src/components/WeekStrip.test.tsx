import dayjs from 'dayjs'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import WeekStrip from './WeekStrip'

// Фиксированные даты, чтобы номера дней были детерминированы.
const MONDAY = dayjs('2026-07-20') // понедельник текущей недели
const TODAY = '2026-07-22'         // среда

function setup(props: Partial<Parameters<typeof WeekStrip>[0]> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <WeekStrip baseMonday={MONDAY} today={TODAY} activeDate={TODAY} onSelect={onSelect} resetToken={0} {...props} />,
  )
  const strip = screen.getByTestId('week-strip')
  const track = strip.firstElementChild as HTMLElement
  return { onSelect, strip, track, view }
}

/** Свайп по полоске: dx<0 — влево (след. неделя), dx>0 — вправо (пред.). */
function swipe(strip: HTMLElement, track: HTMLElement, dx: number) {
  fireEvent.touchStart(strip, { touches: [{ clientX: 200, clientY: 100 }] })
  fireEvent.touchMove(strip, { touches: [{ clientX: 200 + dx, clientY: 104 }] })
  fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 200 + dx, clientY: 104 }] })
  fireEvent.transitionEnd(track, { propertyName: 'transform' })
}

describe('WeekStrip', () => {
  it('показывает текущую неделю и подсвечивает активный день', () => {
    const { strip } = setup()
    expect(strip).toHaveAttribute('data-visible-week', '2026-07-20')
    // Активный день (среда 22) — жирный номер.
    const activeCell = screen.getAllByText('22')[0]
    expect(activeCell).toHaveStyle({ fontWeight: '700' })
  })

  it('свайп влево показывает следующую неделю', () => {
    const { strip, track } = setup()
    swipe(strip, track, -120)
    expect(strip).toHaveAttribute('data-visible-week', '2026-07-27')
  })

  it('свайп вправо показывает предыдущую неделю', () => {
    const { strip, track } = setup()
    swipe(strip, track, 120)
    expect(strip).toHaveAttribute('data-visible-week', '2026-07-13')
  })

  it('короткий свайп ниже порога остаётся на текущей неделе', () => {
    const { strip, track } = setup()
    swipe(strip, track, -20)
    expect(strip).toHaveAttribute('data-visible-week', '2026-07-20')
  })

  it('тап по дню вызывает onSelect с датой этого дня', () => {
    const { strip, onSelect } = setup()
    const middle = within(strip).getAllByRole('button')
    // Кликаем понедельник текущей (средней) недели — «20».
    fireEvent.click(screen.getAllByText('20')[0])
    expect(onSelect).toHaveBeenCalledWith('2026-07-20')
    expect(middle.length).toBeGreaterThan(0)
  })

  it('свайп по дню не выбирает день', () => {
    const { strip, track, onSelect } = setup()
    fireEvent.touchStart(strip, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchMove(strip, { touches: [{ clientX: 80, clientY: 104 }] })
    fireEvent.touchEnd(strip, { changedTouches: [{ clientX: 80, clientY: 104 }] })
    // Клик, который браузер шлёт после свайпа, должен быть проглочен.
    fireEvent.click(screen.getAllByText('22')[0])
    fireEvent.transitionEnd(track, { propertyName: 'transform' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('resetToken возвращает на текущую неделю', () => {
    const { strip, track, view } = setup()
    swipe(strip, track, -120)
    swipe(strip, track, -120)
    expect(strip).toHaveAttribute('data-visible-week', '2026-08-03')

    view.rerender(<WeekStrip baseMonday={MONDAY} today={TODAY} activeDate={TODAY} onSelect={() => {}} resetToken={1} />)
    expect(strip).toHaveAttribute('data-visible-week', '2026-07-20')
  })
})
