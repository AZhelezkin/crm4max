import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LocalWorkPhoto } from '@/lib/workPhotos'
import { installBrowserFixture } from '@/test/browser-fixture'

const uploadPhoto = vi.hoisted(() => vi.fn())
vi.mock('@/api/upload.api', () => ({ uploadPhoto }))

import ServiceFormPortal from './ServiceFormPortal'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((next, fail) => {
    resolve = next
    reject = fail
  })
  return { promise, resolve, reject }
}

function FormHarness() {
  const [name, setName] = useState('Тестовая услуга')
  const [desc, setDesc] = useState('')
  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('2500')
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(10)
  const [isPackage, setIsPackage] = useState(false)
  const [sessionsCount, setSessionsCount] = useState(2)
  const [workPhotos, setWorkPhotos] = useState<LocalWorkPhoto[]>([])

  return (
    <>
      <output data-testid="work-photos-state">{JSON.stringify(workPhotos)}</output>
      <ServiceFormPortal
        visible
        isEdit={false}
        name={name}
        onNameChange={setName}
        desc={desc}
        onDescChange={setDesc}
        duration={duration}
        onDurationChange={setDuration}
        price={price}
        onPriceChange={setPrice}
        discountEnabled={discountEnabled}
        onDiscountEnabledChange={setDiscountEnabled}
        discountPercent={discountPercent}
        onDiscountPercentChange={setDiscountPercent}
        isPackage={isPackage}
        onIsPackageChange={setIsPackage}
        sessionsCount={sessionsCount}
        onSessionsCountChange={setSessionsCount}
        workPhotos={workPhotos}
        onWorkPhotosChange={setWorkPhotos}
        onClose={() => {}}
        onSave={() => {}}
      />
    </>
  )
}

function currentPhotos() {
  return JSON.parse(screen.getByTestId('work-photos-state').textContent ?? '[]') as LocalWorkPhoto[]
}

describe('ServiceFormPortal work photo upload fallback', () => {
  beforeEach(() => {
    uploadPhoto.mockReset()
    installBrowserFixture()
  })

  it('блокирует save во время upload и сохраняет только успешно загруженные фото', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    uploadPhoto.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const view = render(<FormHarness />)
    const fileInput = view.container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    const files = [
      new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
    ]

    fireEvent.change(fileInput, { target: { files } })

    expect(uploadPhoto).toHaveBeenNthCalledWith(1, files[0], 'work')
    expect(uploadPhoto).toHaveBeenNthCalledWith(2, files[1], 'work')
    expect(currentPhotos()).toHaveLength(2)
    expect(currentPhotos().every((photo) => photo.uploading)).toBe(true)
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()

    await act(async () => {
      first.resolve('https://cdn.test/first.jpg')
      second.reject(new Error('second upload failed'))
      await Promise.allSettled([first.promise, second.promise])
    })

    await waitFor(() => expect(currentPhotos()).toHaveLength(1))
    expect(currentPhotos()[0]).toMatchObject({
      url: 'https://cdn.test/first.jpg',
      previewUrl: 'https://cdn.test/first.jpg',
      uploading: false,
    })
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
  })

  it('не оставляет ложное successful photo если все uploads отклонены', async () => {
    uploadPhoto.mockRejectedValue(new Error('upload unavailable'))
    const view = render(<FormHarness />)
    const fileInput = view.container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!

    fireEvent.change(fileInput, {
      target: { files: [new File(['failed'], 'failed.jpg', { type: 'image/jpeg' })] },
    })

    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledOnce())
    await waitFor(() => expect(currentPhotos()).toEqual([]))
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Удалить фото' })).not.toBeInTheDocument()
  })
})
