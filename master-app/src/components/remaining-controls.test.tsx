import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ClientButton from '@client/components/Button'
import ClientCard from '@client/components/Card'
import ClientPageHeader from '@client/components/PageHeader'
import SegmentControl from '@client/components/SegmentControl'
import { renderAtRoute } from '@/test/render'

import AppHeader from './AppHeader'
import { ExportToast } from './ExportToast'

describe('remaining shared controls', () => {
  it('client Button/Card сохраняют interaction и visual contract', async () => {
    const onButton = vi.fn()
    const onCard = vi.fn()
    const view = renderAtRoute(
      <>
        <ClientButton onClick={onButton} variant="danger" fullWidth style={{ height: 50 }}>
          Удалить
        </ClientButton>
        <ClientButton onClick={onButton} disabled>Недоступно</ClientButton>
        <ClientCard onClick={onCard} style={{ padding: 20 }}>Карточка</ClientCard>
      </>,
    )

    const action = screen.getByRole('button', { name: 'Удалить' })
    expect(action).toHaveStyle({ width: '100%', height: '50px' })
    await view.user.click(action)
    await view.user.click(screen.getByText('Карточка'))
    await view.user.click(screen.getByRole('button', { name: 'Недоступно' }))

    expect(onButton).toHaveBeenCalledOnce()
    expect(onCard).toHaveBeenCalledOnce()
  })

  it('SegmentControl вызывает exact option и отражает active style', async () => {
    const onChange = vi.fn()
    const view = renderAtRoute(
      <SegmentControl
        value="first"
        onChange={onChange}
        options={[
          { value: 'first', label: 'Первый' },
          { value: 'second', label: 'Второй' },
        ]}
      />,
    )

    expect(screen.getByRole('button', { name: 'Первый' })).toHaveStyle({
      background: 'var(--color-secondary-surface)',
    })
    await view.user.click(screen.getByRole('button', { name: 'Второй' }))
    expect(onChange).toHaveBeenCalledWith('second')
  })

  it('client PageHeader возвращается по history и поддерживает right slot', async () => {
    const view = renderAtRoute(
      <ClientPageHeader title="Детали" right={<button>Меню</button>} />,
      { entries: ['/previous', '/current'] },
    )

    expect(screen.getByRole('heading', { name: 'Детали' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Меню' })).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: '←' }))
    expect(view.getLocation().pathname).toBe('/previous')
  })

  it('AppHeader поддерживает back/no-back и right slot', async () => {
    const onBack = vi.fn()
    const view = renderAtRoute(
      <AppHeader title="Профиль" onBack={onBack} right={<button>Готово</button>} />,
    )

    await view.user.click(screen.getByRole('button', { name: 'Назад' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument()

    view.rerender(<AppHeader title="Без возврата" />)
    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument()
  })

  it('ExportToast рендерит success/error portal и закрывается action', async () => {
    const onClose = vi.fn()
    const view = renderAtRoute(
      <ExportToast toast={{ kind: 'success', text: 'Экспорт готов' }} onClose={onClose} />,
    )

    await view.user.click(screen.getByText('Экспорт готов'))
    expect(onClose).toHaveBeenCalledOnce()
    view.rerender(<ExportToast toast={{ kind: 'error', text: 'Ошибка экспорта' }} onClose={onClose} />)
    expect(screen.getByText('Ошибка экспорта')).toBeInTheDocument()
    view.rerender(<ExportToast toast={null} onClose={onClose} />)
    expect(screen.queryByText('Ошибка экспорта')).not.toBeInTheDocument()
  })
})
