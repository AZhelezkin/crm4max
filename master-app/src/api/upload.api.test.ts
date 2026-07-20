import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'

import { installBrowserFixture } from '@/test/browser-fixture'
import { MASTER_TOKEN } from '@/test/fixtures/auth'
import { server } from '@/test/msw/server'

import { compressImage, uploadPhoto } from './upload.api'

const originalImage = globalThis.Image

interface ImageFixtureOptions {
  width?: number
  height?: number
  fail?: boolean
}

function installImageFixture({ width = 800, height = 600, fail = false }: ImageFixtureOptions = {}) {
  class ImageFixture {
    width = width
    height = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      if (fail) this.onerror?.()
      else this.onload?.()
    }
  }

  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: ImageFixture,
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: originalImage,
  })
})

describe('image compression', () => {
  it('конвертирует изображение в JPEG без увеличения', async () => {
    const browser = installBrowserFixture()
    installImageFixture({ width: 800, height: 600 })
    const source = new File(['source'], 'photo.png', { type: 'image/png' })

    const result = await compressImage(source)

    expect(result.name).toBe('photo.jpg')
    expect(result.type).toBe('image/jpeg')
    expect(browser.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600)
    expect(browser.revokeObjectURL).toHaveBeenCalledWith('blob:test-image')
  })

  it('уменьшает длинную сторону до maxSize', async () => {
    const browser = installBrowserFixture()
    installImageFixture({ width: 2400, height: 1200 })
    const source = new File(['source'], 'wide.png', { type: 'image/png' })

    await compressImage(source, 1200)

    expect(browser.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 600)
  })

  it('отклоняет ошибку загрузки изображения и освобождает object URL', async () => {
    const browser = installBrowserFixture()
    installImageFixture({ fail: true })
    const source = new File(['source'], 'broken.png', { type: 'image/png' })

    await expect(compressImage(source)).rejects.toThrow('Image load failed')
    expect(browser.revokeObjectURL).toHaveBeenCalledWith('blob:test-image')
  })

  it('отклоняет пустой canvas blob', async () => {
    installBrowserFixture()
    installImageFixture()
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null))
    const source = new File(['source'], 'photo.png', { type: 'image/png' })

    await expect(compressImage(source)).rejects.toThrow('canvas toBlob failed')
  })
})

describe('photo upload', () => {
  it('загружает compressed file, folder и master bearer token', async () => {
    installBrowserFixture()
    installImageFixture()
    localStorage.setItem('masterToken', MASTER_TOKEN)
    let folder: string | null = null
    let authorization: string | null = null
    const append = vi.spyOn(FormData.prototype, 'append')
    server.use(
      http.post('*/api/upload', ({ request }) => {
        const url = new URL(request.url)
        folder = url.searchParams.get('folder')
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ url: 'https://cdn.test/photo.jpg' })
      }),
    )

    const result = await uploadPhoto(new File(['source'], 'photo.png', { type: 'image/png' }), 'work')
    const uploadedFile = append.mock.calls[0]?.[1]

    expect(folder).toBe('work')
    expect(authorization).toBe(`Bearer ${MASTER_TOKEN}`)
    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile).toMatchObject({ name: 'photo.jpg', type: 'image/jpeg' })
    expect(result).toBe('https://cdn.test/photo.jpg')
  })

  it('использует original file при ошибке compression', async () => {
    installBrowserFixture()
    installImageFixture({ fail: true })
    const append = vi.spyOn(FormData.prototype, 'append')
    server.use(
      http.post('*/api/upload', () => HttpResponse.json({ url: 'https://cdn.test/original.png' })),
    )

    await uploadPhoto(new File(['source'], 'original.png', { type: 'image/png' }))
    const uploadedFile = append.mock.calls[0]?.[1]

    expect(uploadedFile).toBeInstanceOf(File)
    expect(uploadedFile).toMatchObject({ name: 'original.png', type: 'image/png' })
  })

  it('пробрасывает backend error text', async () => {
    installBrowserFixture()
    installImageFixture()
    server.use(
      http.post('*/api/upload', () => HttpResponse.json({ error: 'Файл слишком большой' }, { status: 413 })),
    )

    await expect(
      uploadPhoto(new File(['source'], 'photo.png', { type: 'image/png' })),
    ).rejects.toThrow('Файл слишком большой')
  })
})
