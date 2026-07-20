import { describe, expect, it } from 'vitest'

import { getFirstUploadedWorkPhotoUrl } from './workPhotos'

describe('getFirstUploadedWorkPhotoUrl', () => {
  it('возвращает null для пустого списка', () => {
    expect(getFirstUploadedWorkPhotoUrl([])).toBeNull()
  })

  it('пропускает uploading и null фотографии', () => {
    expect(getFirstUploadedWorkPhotoUrl([
      { id: '1', url: 'https://cdn.test/uploading.jpg', previewUrl: 'blob:1', uploading: true },
      { id: '2', url: null, previewUrl: 'blob:2', uploading: false },
      { id: '3', url: 'https://cdn.test/ready.jpg', previewUrl: 'blob:3', uploading: false },
    ])).toBe('https://cdn.test/ready.jpg')
  })

  it('возвращает первую готовую фотографию', () => {
    expect(getFirstUploadedWorkPhotoUrl([
      { id: '1', url: 'https://cdn.test/first.jpg', previewUrl: 'blob:1', uploading: false },
      { id: '2', url: 'https://cdn.test/second.jpg', previewUrl: 'blob:2', uploading: false },
    ])).toBe('https://cdn.test/first.jpg')
  })
})
