from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, PlainSerializer

# Money as a fixed two-decimal string to preserve precision in JSON.
Money = Annotated[
    Decimal, PlainSerializer(lambda v: f"{Decimal(v):.2f}", return_type=str)
]


def _as_utc_iso(value: datetime) -> str:
    # SQLite returns naive datetimes; they are UTC, so attach the offset.
    aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return aware.isoformat()


UtcDateTime = Annotated[datetime, PlainSerializer(_as_utc_iso, return_type=str)]


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=64)
    note: str | None = Field(default=None, max_length=500)


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None
    note: str | None
    created_at: UtcDateTime


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str | None = Field(default=None, max_length=64)
    category: str = Field(default="General", max_length=64)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    reorder_threshold: int = Field(default=10, ge=0)


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str | None
    category: str
    price: Money
    stock: int
    reorder_threshold: int
    stock_status: str
    created_at: UtcDateTime


class StockAdjust(BaseModel):
    stock: int = Field(ge=0)


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=1_000_000)


class OrderCreate(BaseModel):
    client_id: int
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str | None
    quantity: int
    unit_price: Money
    line_total: Money


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    status: str
    total_amount: Money
    created_at: UtcDateTime
    items: list[OrderItemOut]


class StatsOut(BaseModel):
    clients: int
    products: int
    orders: int
    revenue: Money


# --- Analytics --------------------------------------------------------------
class KpisOut(BaseModel):
    clients: int
    products: int
    orders: int
    revenue: Money
    avg_order_value: Money


class RevenuePointOut(BaseModel):
    month: str  # "YYYY-MM"
    revenue: Money
    orders: int


class StatusBreakdownOut(BaseModel):
    status: str
    count: int
    revenue: Money


class TopProductOut(BaseModel):
    product_id: int
    name: str
    quantity: int
    revenue: Money


class AnalyticsOut(BaseModel):
    kpis: KpisOut
    revenue_by_month: list[RevenuePointOut]
    orders_by_status: list[StatusBreakdownOut]
    top_products: list[TopProductOut]


# --- Reports ---
class RevenueByClientOut(BaseModel):
    client_id: int
    name: str
    orders: int
    revenue: Money


class RevenueByCategoryOut(BaseModel):
    category: str
    revenue: Money
    units: int


class StatusTrendPointOut(BaseModel):
    month: str
    created: int
    paid: int
    shipped: int
    completed: int
    cancelled: int


class ReportsOut(BaseModel):
    sales_by_month: list[RevenuePointOut]
    revenue_by_client: list[RevenueByClientOut]
    revenue_by_category: list[RevenueByCategoryOut]
    status_trend: list[StatusTrendPointOut]


# --- Activity / audit log ---
class ActivityEventOut(BaseModel):
    id: str
    type: str  # order | client | product | system
    title: str
    detail: str
    severity: str  # info | success | warning
    at: str
