export interface LocalWorkPhoto {
  id: string
  url: string | null
  previewUrl: string
  uploading: boolean
}

export function getFirstUploadedWorkPhotoUrl(workPhotos: LocalWorkPhoto[]): string | null {
  return workPhotos.find((p) => !p.uploading && p.url)?.url ?? null
}
