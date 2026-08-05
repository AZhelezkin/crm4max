import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMasterProfile } from '@/test/fixtures/masters'
import { renderAtRoute } from '@/test/render'
import helloImg from '@/assets/guide-hello.png'
import confettiImg from '@/assets/guide-confetti.png'

const api = vi.hoisted(() => ({ markGuideStep: vi.fn() }))
vi.mock('@/api/masters.api', () => ({ mastersApi: { markGuideStep: api.markGuideStep } }))

import { useAuthStore } from '@/store/auth.store'

import GuideCard from './GuideCard'

function setMaster(guideProgress: ReturnType<typeof createMasterProfile>['guideProgress']) {
  useAuthStore.setState({
    token: 'master-token',
    master: createMasterProfile({ guideProgress }),
    isLoading: false,
  })
}

describe('GuideCard', () => {
  beforeEach(() => {
    api.markGuideStep.mockReset()
    api.markGuideStep.mockResolvedValue({ guideProgress: { dismissed: true } })
  })

  it('новый мастер: чек-лист, шаг «бот» выполнен всегда', () => {
    setMaster(null)
    const view = renderAtRoute(<GuideCard firstBookingId="booking-1" />)

    expect(view.container.querySelector('img')).toHaveAttribute('src', helloImg)
    expect(screen.getByText('Добро пожаловать!')).toBeInTheDocument()
    expect(screen.getByText(/Осталось всего 3 шага/)).toBeInTheDocument()
    // Первый шаг зачёркнут (выполнен), остальные — нет.
    expect(screen.getByText('Познакомиться с умным ассистентом — ботом в чате')).toHaveStyle({ textDecoration: 'line-through' })
    expect(screen.getByText(/Попробуй открыть запись Синьёры Капибары/)).not.toHaveStyle({ textDecoration: 'line-through' })
  })

  it('выполненные шаги отмечаются, все три → «Отлично!» без списка', () => {
    setMaster({ edited: true, shared: true, openedBooking: true })
    const view = renderAtRoute(<GuideCard />)

    expect(view.container.querySelector('img')).toHaveAttribute('src', confettiImg)
    expect(screen.getByText('Отлично!')).toBeInTheDocument()
    expect(screen.getByText(/Кабинет готов к работе/)).toBeInTheDocument()
    expect(screen.queryByText(/Синьёры Капибары/)).not.toBeInTheDocument()
  })

  it('уменьшает счётчик после выполнения шагов', () => {
    setMaster({ edited: true, shared: true })
    renderAtRoute(<GuideCard />)

    expect(screen.getByText(/Осталось всего 1 шаг/)).toBeInTheDocument()
  })

  it('крестик скрывает карточку и шлёт dismissed', async () => {
    setMaster(null)
    const view = renderAtRoute(<GuideCard />)

    await view.user.click(screen.getByRole('button', { name: 'Скрыть подсказки' }))

    expect(screen.queryByText('Добро пожаловать!')).not.toBeInTheDocument()
    await waitFor(() => expect(api.markGuideStep).toHaveBeenCalledWith('dismissed'))
  })

  it('dismissed в прогрессе — карточка не рендерится', () => {
    setMaster({ dismissed: true })
    renderAtRoute(<GuideCard />)

    expect(screen.queryByText('Добро пожаловать!')).not.toBeInTheDocument()
  })

  it('задача «открыть запись» ведёт в пример-запись', async () => {
    setMaster(null)
    const view = renderAtRoute(<GuideCard firstBookingId="booking-capybara" />)

    await view.user.click(screen.getByRole('button', { name: /Синьёры Капибары/ }))

    expect(view.getLocation().pathname).toBe('/bookings/booking-capybara')
  })
})
