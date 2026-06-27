import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiRequestError } from './client'

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'mock',
    text: async () => JSON.stringify(body),
  }))
}

afterEach(() => vi.unstubAllGlobals())

describe('api client', () => {
  it('returns the parsed list on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, [{ id: 1, name: 'Acme' }]))
    const clients = await api.listClients()
    expect(clients).toHaveLength(1)
    expect(clients[0].name).toBe('Acme')
  })

  it('throws ApiRequestError carrying status and code', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(404, { error: { code: 'not_found', message: 'Order 1 not found' } }),
    )
    await expect(api.getOrder(1)).rejects.toBeInstanceOf(ApiRequestError)
    await expect(api.getOrder(1)).rejects.toMatchObject({ status: 404, code: 'not_found' })
  })

  it('sends a POST with a JSON body when creating', async () => {
    const fetchMock = mockFetch(201, { id: 5, name: 'New' })
    vi.stubGlobal('fetch', fetchMock)
    await api.createClient({ name: 'New' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/clients',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'New' }) }),
    )
  })
})
