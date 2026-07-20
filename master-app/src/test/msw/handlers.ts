import { HttpResponse, http } from 'msw'
import type { JsonBodyType } from 'msw'

export const apiUrl = (path: string) => `*/api${path}`

export function jsonGet<T extends JsonBodyType>(path: string, body: T, status = 200) {
  return http.get(apiUrl(path), () => HttpResponse.json(body, { status }))
}

export function jsonPost<T extends JsonBodyType>(path: string, body: T, status = 200) {
  return http.post(apiUrl(path), () => HttpResponse.json(body, { status }))
}

export function jsonPut<T extends JsonBodyType>(path: string, body: T, status = 200) {
  return http.put(apiUrl(path), () => HttpResponse.json(body, { status }))
}
