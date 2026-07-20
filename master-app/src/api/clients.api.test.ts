import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { MASTER_CLIENT_ID } from '@/test/fixtures/auth'
import { createMasterClient } from '@/test/fixtures/clients'
import { server } from '@/test/msw/server'

import { clientsApi } from './clients.api'

describe('master clients API', () => {
  it('получает список клиентов', async () => {
    const client = createMasterClient()
    server.use(http.get('*/api/clients', () => HttpResponse.json([client])))

    await expect(clientsApi.list()).resolves.toEqual([client])
  })

  it.each([
    ['create', 'post', '/api/clients', { name: 'Новый клиент', phone: null }],
    ['update', 'patch', `/api/clients/${MASTER_CLIENT_ID}`, { name: 'Новое имя', phone: '+79990000003' }],
  ] as const)('%s передаёт exact payload', async (operation, method, path, payload) => {
    const client = createMasterClient(payload)
    let body: object | null = null
    const resolver = async ({ request }: { request: Request }) => {
      body = await request.json() as object
      return HttpResponse.json(client)
    }
    server.use(method === 'post' ? http.post(`*${path}`, resolver) : http.patch(`*${path}`, resolver))

    const result = operation === 'create'
      ? await clientsApi.create(payload)
      : await clientsApi.update(MASTER_CLIENT_ID, payload)

    expect(body).toEqual(payload)
    expect(result).toEqual(client)
  })

  it('удаляет клиента по id', async () => {
    server.use(
      http.delete(`*/api/clients/${MASTER_CLIENT_ID}`, () => HttpResponse.json({ ok: true })),
    )

    await expect(clientsApi.remove(MASTER_CLIENT_ID)).resolves.toEqual({ ok: true })
  })
})
