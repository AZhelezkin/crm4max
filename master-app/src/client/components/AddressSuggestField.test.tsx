import { useState } from 'react'
import type { ComponentType } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { server } from '@/test/msw/server'

interface FieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

let AddressSuggestField: ComponentType<FieldProps>

beforeAll(async () => {
  vi.stubEnv('VITE_YANDEX_SUGGEST_KEY', 'suggest-test-key')
  AddressSuggestField = (await import('./AddressSuggestField')).default
})

function FieldHarness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <AddressSuggestField
      value={value}
      onChange={setValue}
      label="Ваш адрес"
      placeholder="Введите адрес"
    />
  )
}

const suggestResponse = (title: string, subtitle = 'Москва') => ({
  results: [{ title: { text: title }, subtitle: { text: subtitle } }],
})

describe('AddressSuggestField', () => {
  it('debounce request и выбирает полный адрес', async () => {
    let search = ''
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(suggestResponse('Тверская улица, 7'))
      }),
    )
    render(<FieldHarness />)
    const input = screen.getByPlaceholderText('Введите адрес')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Тверская 7' } })

    const suggestion = await screen.findByRole('button', { name: 'Тверская улица, 7, Москва' })
    const query = new URLSearchParams(search)
    expect(query.get('text')).toBe('Тверская 7')
    expect(query.get('results')).toBe('5')

    fireEvent.mouseDown(suggestion)
    expect(input).toHaveValue('Тверская улица, 7, Москва')
    expect(screen.queryByRole('button', { name: 'Тверская улица, 7, Москва' })).not.toBeInTheDocument()
  })

  it('очищает значение без blur', () => {
    render(<FieldHarness initial="Тверская улица, 7" />)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Очистить' }))

    expect(screen.getByPlaceholderText('Введите адрес')).toHaveValue('')
  })

  it('закрывает suggestions после blur delay', async () => {
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', () => (
        HttpResponse.json(suggestResponse('Тверская улица, 7'))
      )),
    )
    render(<FieldHarness />)
    const input = screen.getByPlaceholderText('Введите адрес')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Тверская' } })
    expect(await screen.findByText('Тверская улица, 7, Москва')).toBeInTheDocument()

    fireEvent.blur(input)

    await waitFor(() => expect(screen.queryByText('Тверская улица, 7, Москва')).not.toBeInTheDocument())
  })

  it('фиксирует legacy overwrite более старым suggest response', async () => {
    let resolveFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const requests: string[] = []
    server.use(
      http.get('https://suggest-maps.yandex.ru/v1/suggest', async ({ request }) => {
        const text = new URL(request.url).searchParams.get('text') ?? ''
        requests.push(text)
        if (text === 'Первый') await firstGate
        return HttpResponse.json(suggestResponse(`${text} адрес`))
      }),
    )
    render(<FieldHarness />)
    const input = screen.getByPlaceholderText('Введите адрес')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Первый' } })
    await waitFor(() => expect(requests).toContain('Первый'))
    fireEvent.change(input, { target: { value: 'Второй' } })
    expect(await screen.findByText('Второй адрес, Москва')).toBeInTheDocument()

    await act(async () => {
      resolveFirst?.()
      await firstGate
    })

    expect(await screen.findByText('Первый адрес, Москва')).toBeInTheDocument()
  })
})
