export type UploadFolder = 'masters' | 'categories' | 'services' | 'work'

/**
 * Загружает файл на сервер → S3 и возвращает публичный URL.
 *
 * Использует fetch напрямую (не axios), чтобы браузер сам установил
 * Content-Type: multipart/form-data с правильным boundary.
 */
export async function uploadPhoto(file: File, folder: UploadFolder = 'masters'): Promise<string> {
  const token = localStorage.getItem('token')

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`/api/upload?folder=${folder}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Upload failed: ${res.status}`)
  }

  const { url } = await res.json() as { url: string }
  return url
}
