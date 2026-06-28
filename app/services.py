"""Service layer — business logic and transactions.

Routes stay thin; all domain rules live here so they are easy to test in
isolation and reuse from anywhere (CLI, jobs, other endpoints).
"""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.errors import BusinessRuleError, NotFoundError
from app.extensions import db
from app.models import Client, Order, OrderItem, Product
from app.schemas import ClientCreate, OrderCreate, ProductCreate

# Largest value representable in Money = Numeric(12, 2) (10 integer digits).
MAX_MONEY = Decimal("9999999999.99")


# --- Clients ----------------------------------------------------------------
def create_client(data: ClientCreate) -> Client:
    client = Client(name=data.name, email=data.email, phone=data.phone)
    db.session.add(client)
    db.session.commit()
    return client


def list_clients() -> list[Client]:
    return list(db.session.scalars(select(Client).order_by(Client.id.desc())))


def get_client(client_id: int) -> Client:
    client = db.session.get(Client, client_id)
    if client is None:
        raise NotFoundError(f"Client {client_id} not found")
    return client


# --- Products ---------------------------------------------------------------
def create_product(data: ProductCreate) -> Product:
    product = Product(
        name=data.name,
        sku=data.sku,
        category=data.category,
        price=data.price,
        stock=data.stock,
        reorder_threshold=data.reorder_threshold,
    )
    db.session.add(product)
    db.session.commit()
    return product


def adjust_product_stock(product_id: int, stock: int) -> Product:
    product = db.session.get(Product, product_id)
    if product is None:
        raise NotFoundError(f"Product {product_id} not found")
    product.stock = max(0, stock)
    db.session.commit()
    return product


def list_products() -> list[Product]:
    return list(db.session.scalars(select(Product).order_by(Product.id.desc())))


# --- Orders -----------------------------------------------------------------
def create_order(data: OrderCreate) -> Order:
    """Create an order, enforcing the mandatory business rules atomically.

    Rules:
      * the client must exist (no order without a client);
      * at least one item is required;
      * every referenced product must exist;
      * ``unit_price`` is snapshotted and the total is computed server-side.
    """
    client = db.session.get(Client, data.client_id)
    if client is None:
        raise NotFoundError(f"Client {data.client_id} not found")

    # Re-check (Pydantic already enforces min_length=1) for defence in depth.
    if not data.items:
        raise BusinessRuleError("Order must contain at least one item")

    order = Order(client_id=client.id, status="created", total_amount=Decimal("0.00"))
    total = Decimal("0.00")

    for line in data.items:
        product = db.session.get(Product, line.product_id)
        if product is None:
            # Nothing has been committed yet; the error handler will roll back.
            raise NotFoundError(f"Product {line.product_id} not found")

        unit_price = Decimal(product.price)  # snapshot
        line_total = unit_price * line.quantity
        order.items.append(
            OrderItem(
                product_id=product.id,
                quantity=line.quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )
        total += line_total

    # Guard the declared Numeric(12,2) precision so we never silently overflow
    # on SQLite (or hard-fail on PostgreSQL) for pathological inputs.
    if total > MAX_MONEY:
        raise BusinessRuleError("Order amount exceeds the supported limit")

    order.total_amount = total
    db.session.add(order)
    db.session.commit()
    return order


def get_order(order_id: int) -> Order:
    order = db.session.get(Order, order_id)
    if order is None:
        raise NotFoundError(f"Order {order_id} not found")
    return order


def list_orders(client_id: int | None = None) -> list[Order]:
    # Eager-load items + their products to avoid N+1 queries on serialisation.
    stmt = (
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.id.desc())
    )
    if client_id is not None:
        stmt = stmt.where(Order.client_id == client_id)
    return list(db.session.scalars(stmt))


def list_client_orders(client_id: int) -> list[Order]:
    # Validates the client exists, then returns their orders.
    get_client(client_id)
    return list_orders(client_id=client_id)


# --- Dashboard --------------------------------------------------------------
def get_stats() -> dict:
    return {
        "clients": db.session.scalar(select(func.count(Client.id))) or 0,
        "products": db.session.scalar(select(func.count(Product.id))) or 0,
        "orders": db.session.scalar(select(func.count(Order.id))) or 0,
        "revenue": db.session.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0))
        )
        or Decimal("0.00"),
    }


def _recent_month_buckets(months: int) -> list[str]:
    """Keys ('YYYY-MM') for the last `months` calendar months, oldest first."""
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month
    keys: list[str] = []
    for offset in range(months - 1, -1, -1):
        m = month - offset
        y = year
        while m <= 0:
            m += 12
            y -= 1
        keys.append(f"{y:04d}-{m:02d}")
    return keys


def get_analytics(months: int = 6, top_n: int = 5) -> dict:
    """Aggregate dashboard analytics.

    Status and product roll-ups are computed in SQL; the month time-series is
    assembled in Python so it behaves identically on SQLite and PostgreSQL
    without any dialect-specific date functions.
    """
    clients = db.session.scalar(select(func.count(Client.id))) or 0
    products = db.session.scalar(select(func.count(Product.id))) or 0
    orders_count = db.session.scalar(select(func.count(Order.id))) or 0
    revenue = db.session.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0))
    ) or Decimal("0.00")
    avg_order_value = (
        (Decimal(revenue) / orders_count).quantize(Decimal("0.01"))
        if orders_count
        else Decimal("0.00")
    )

    # Orders grouped by status (count + revenue), busiest first.
    status_rows = db.session.execute(
        select(
            Order.status,
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        ).group_by(Order.status)
    ).all()
    orders_by_status = [
        {"status": status, "count": int(count), "revenue": Decimal(total)}
        for status, count, total in sorted(
            status_rows, key=lambda r: r[1], reverse=True
        )
    ]

    # Top products by revenue (sum of line totals) with units sold.
    product_rows = db.session.execute(
        select(
            Product.id,
            Product.name,
            func.coalesce(func.sum(OrderItem.quantity), 0),
            func.coalesce(func.sum(OrderItem.line_total), 0),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id, Product.name)
        .order_by(func.coalesce(func.sum(OrderItem.line_total), 0).desc())
        .limit(top_n)
    ).all()
    top_products = [
        {"product_id": pid, "name": name, "quantity": int(qty), "revenue": Decimal(rev)}
        for pid, name, qty, rev in product_rows
    ]

    # Revenue time-series for the last `months` months, zero-filled.
    keys = _recent_month_buckets(months)
    index = {key: i for i, key in enumerate(keys)}
    series = [{"month": key, "revenue": Decimal("0.00"), "orders": 0} for key in keys]
    for created_at, total in db.session.execute(
        select(Order.created_at, Order.total_amount)
    ).all():
        i = index.get(created_at.strftime("%Y-%m"))
        if i is not None:
            series[i]["revenue"] += Decimal(total)
            series[i]["orders"] += 1

    return {
        "kpis": {
            "clients": clients,
            "products": products,
            "orders": orders_count,
            "revenue": Decimal(revenue),
            "avg_order_value": avg_order_value,
        },
        "revenue_by_month": series,
        "orders_by_status": orders_by_status,
        "top_products": top_products,
    }


def _iso(dt: datetime) -> str:
    return (dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)).isoformat()


def get_reports(months: int = 6, top_clients: int = 8, top_categories: int = 8) -> dict:
    """Server-side aggregations for the Reports page."""
    keys = _recent_month_buckets(months)
    index = {key: i for i, key in enumerate(keys)}
    sales = [{"month": key, "revenue": Decimal("0.00"), "orders": 0} for key in keys]
    statuses = ["created", "paid", "shipped", "completed", "cancelled"]
    trend = [{"month": key, **{s: 0 for s in statuses}} for key in keys]

    for created_at, status, total in db.session.execute(
        select(Order.created_at, Order.status, Order.total_amount)
    ).all():
        i = index.get(created_at.strftime("%Y-%m"))
        if i is None:
            continue
        if status in trend[i]:
            trend[i][status] += 1
        if status != "cancelled":
            sales[i]["revenue"] += Decimal(total)
            sales[i]["orders"] += 1

    client_rows = db.session.execute(
        select(
            Client.id,
            Client.name,
            func.count(Order.id),
            func.coalesce(func.sum(Order.total_amount), 0),
        )
        .join(Order, Order.client_id == Client.id)
        .where(Order.status != "cancelled")
        .group_by(Client.id, Client.name)
        .order_by(func.coalesce(func.sum(Order.total_amount), 0).desc())
        .limit(top_clients)
    ).all()
    revenue_by_client = [
        {"client_id": cid, "name": name, "orders": int(cnt), "revenue": Decimal(rev)}
        for cid, name, cnt, rev in client_rows
    ]

    category_rows = db.session.execute(
        select(
            Product.category,
            func.coalesce(func.sum(OrderItem.line_total), 0),
            func.coalesce(func.sum(OrderItem.quantity), 0),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.status != "cancelled")
        .group_by(Product.category)
        .order_by(func.coalesce(func.sum(OrderItem.line_total), 0).desc())
        .limit(top_categories)
    ).all()
    revenue_by_category = [
        {"category": cat, "revenue": Decimal(rev), "units": int(units)}
        for cat, rev, units in category_rows
    ]

    return {
        "sales_by_month": sales,
        "revenue_by_client": revenue_by_client,
        "revenue_by_category": revenue_by_category,
        "status_trend": trend,
    }


def list_activity(limit: int = 30) -> list[dict]:
    """Synthetic operational activity feed derived from existing records."""
    events: list[dict] = []
    clients = {c.id: c.name for c in db.session.scalars(select(Client)).all()}

    for o in db.session.scalars(select(Order).order_by(Order.created_at.desc()).limit(40)):
        severity = (
            "warning"
            if o.status == "cancelled"
            else "success"
            if o.status in ("completed", "shipped")
            else "info"
        )
        events.append(
            {
                "id": f"order-{o.id}",
                "type": "order",
                "title": f"Order #{o.id} — {o.status}",
                "detail": f"{clients.get(o.client_id, 'Client')} · {Decimal(o.total_amount):.2f}",
                "severity": severity,
                "at": _iso(o.created_at),
            }
        )

    for c in db.session.scalars(select(Client).order_by(Client.created_at.desc()).limit(6)):
        events.append(
            {
                "id": f"client-{c.id}",
                "type": "client",
                "title": "Client added",
                "detail": c.name,
                "severity": "info",
                "at": _iso(c.created_at),
            }
        )

    now_iso = _iso(datetime.now(timezone.utc))
    low = db.session.scalars(
        select(Product).where(Product.stock <= Product.reorder_threshold).limit(8)
    ).all()
    for p in low:
        events.append(
            {
                "id": f"lowstock-{p.id}",
                "type": "system",
                "title": "Low stock alert",
                "detail": f"{p.name} — {p.stock} left (threshold {p.reorder_threshold})",
                "severity": "warning",
                "at": now_iso,
            }
        )

    events.sort(key=lambda e: e["at"], reverse=True)
    return events[:limit]
