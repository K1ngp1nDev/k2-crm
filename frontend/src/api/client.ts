import type {
  ActivityEvent,
  Analytics,
  ApiErrorBody,
  Client,
  ClientCreate,
  Order,
  OrderCreate,
  Product,
  ProductCreate,
  Reports,
  Stats,
} from './types'

const BASE = '/api'

export class ApiRequestError extends Error {
  status: number
  code: string
  details?: ApiErrorBody['error']['details']

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    const message = body?.error?.message ?? fallback
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = body?.error?.code ?? 'unknown'
    this.details = body?.error?.details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiRequestError(res.status, data as ApiErrorBody, res.statusText)
  }
  return data as T
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  stats: () => request<Stats>('/stats'),
  analytics: () => request<Analytics>('/analytics'),

  listClients: () => request<Client[]>('/clients'),
  createClient: (body: ClientCreate) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(body) }),

  listProducts: () => request<Product[]>('/products'),
  createProduct: (body: ProductCreate) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),

  listOrders: () => request<Order[]>('/orders'),
  createOrder: (body: OrderCreate) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrder: (id: number) => request<Order>(`/orders/${id}`),
  listClientOrders: (clientId: number) =>
    request<Order[]>(`/clients/${clientId}/orders`),

  reports: () => request<Reports>('/reports'),
  activity: () => request<ActivityEvent[]>('/activity'),
  adjustStock: (id: number, stock: number) =>
    request<Product>(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ stock }) }),
  resetDemo: () => request<{ status: string }>('/reset', { method: 'POST' }),
}
