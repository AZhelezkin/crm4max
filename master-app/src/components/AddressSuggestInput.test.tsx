import { useState } from 'react'
import type { ComponentType } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { server } from '@/test/msw/server'

interface InputProps {
  value: string
  onChange: (value: string) => void
  onGeocode?: (lat: number, lng: number) => void
  confirmedAddress?: string
  onBack?: () => void
}

let AddressSuggestInput: ComponentType<InputProps>

beforeAll(async () => {
  vi.stubEnv('VITE_YANDEX_SUGGEST_KEY', 'suggest-test-key')
  vi.stubEnv('VITE_YANDEX_GEOCODE_KEY', 'geocode-test-key')
  AddressSuggestInput = (await import('./AddressSuggestInput')).default
})

function InputHarness({
  initial = '',
  onValue = () => undefined,
  onGeocode,
  onBack,
}: {
  initial?: string
  onValue?: (value: string) => void
  onGeocode?: (lat: number, lng: number) => void
  onBack?: () => void
}) {
  const [value, setValue] = useState(initial)
  const handleChange = (next: string) => {
    setValue(next)
    onValue(next)
  }
  return (
    <AddressSuggestInput
      value={value}
      onChange={handleChange}
      onGeocode={onGeocode}
      onBack={onBack}
    />
  )
}

describe('AddressSuggestInput', () => {
  it('показывает короткую часть полного адреса и static map fallback', () => {
    render(<InputHarness initial="Россия, Москва, Тверская улица, 7" />)

    expect(screen.getByPlaceholderText('Найти адрес')).toHaveValue('Тверская улица, 7')
    expect(screen.getByRole('img', { name: 'Карта' })).toBeInTheDocument()
  })

  it('передаёт ручной ввод, clear и back actions', () => {
    const onValue = vi.fn()
    const onBack = vi.fn()
    render(<InputHarness initial="Старый адрес" onValue={onValue} onBack={onBack} />)
    const input = screen.getByPlaceholderText('Найти адрес')

    fireEvent.change(input, { target: { value: 'Новый адрес' } })
    expect(onValue).toHaveBeenLastCalledWith('Новый адрес')

    fireEvent.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(onValue).toHaveBeenLastCalledWith('')
    expect(input).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('выбирает suggestion, сохраняет полный адрес и отдаёт координаты', async () => {
    const onValue = vi.fn()
    const onGeocode = vi.fn()
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', () => HttpResponse.json({
        results: [{
          title: { text: 'Тверская улица, 7' },
          subtitle: { text: 'Москва' },
        }],
      })),
      http.get('https://geocode-maps.yandex.ru/1.x/', () => HttpResponse.json({
        response: {
          GeoObjectCollection: {
            featureMember: [{ GeoObject: { Point: { pos: '37.6100 55.7600' } } }],
          },
        },
      })),
    )
    render(<InputHarness onValue={onValue} onGeocode={onGeocode} />)
    const input = screen.getByPlaceholderText('Найти адрес')

    fireEvent.change(input, { target: { value: 'Тверская 7' } })
    const suggestion = await screen.findByRole('button', { name: /Тверская улица, 7/ })
    fireEvent.mouseDown(suggestion)

    expect(input).toHaveValue('Тверская улица, 7')
    expect(onValue).toHaveBeenLastCalledWith('Тверская улица, 7, Москва')
    await waitFor(() => expect(onGeocode).toHaveBeenCalledWith(55.76, 37.61))
  })

  it('показывает empty result после успешного пустого suggest response', async () => {
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', () => HttpResponse.json({ results: [] })),
    )
    render(<InputHarness />)

    fireEvent.change(screen.getByPlaceholderText('Найти адрес'), { target: { value: 'Неизвестный адрес' } })

    expect(await screen.findByText('Адрес не найден')).toBeInTheDocument()
  })

  it('фиксирует legacy debounce request после unmount', async () => {
    const request = vi.fn()
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', () => {
        request()
        return HttpResponse.json({ results: [] })
      }),
    )
    const view = render(<InputHarness />)
    fireEvent.change(screen.getByPlaceholderText('Найти адрес'), { target: { value: 'Тверская' } })

    view.unmount()

    await waitFor(() => expect(request).toHaveBeenCalledOnce())
  })
})
