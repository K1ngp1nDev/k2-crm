// Money fields arrive from the API as strings (e.g. "30.00").

export interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface Product {
  id: number
  name: string
  sku: string | null
  price: string
  created_at: string
}

export interface OrderItem {
  id: number
  product_id: number
  product_name: string | null
  quantity: number
  unit_price: string
  line_total: string
}

export interface Order {
  id: number
  client_id: number
  status: string
  total_amount: string
  created_at: string
  items: OrderItem[]
}

export interface Stats {
  clients: number
  products: number
  orders: number
  revenue: string
}

export interface ClientCreate {
  name: string
  email?: string | null
  phone?: string | null
}

export interface ProductCreate {
  name: string
  sku?: string | null
  price: string
}

export interface OrderItemCreate {
  product_id: number
  quantity: number
}

export interface OrderCreate {
  client_id: number
  items: OrderItemCreate[]
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

// --- Analytics ---

export interface Kpis {
  clients: number
  products: number
  orders: number
  revenue: string
  avg_order_value: string
}

export interface RevenuePoint {
  month: string // "YYYY-MM"
  revenue: string
  orders: number
}

export interface StatusBreakdown {
  status: string
  count: number
  revenue: string
}

export interface TopProduct {
  product_id: number
  name: string
  quantity: number
  revenue: string
}

export interface Analytics {
  kpis: Kpis
  revenue_by_month: RevenuePoint[]
  orders_by_status: StatusBreakdown[]
  top_products: TopProduct[]
}
