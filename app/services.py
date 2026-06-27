"""Service layer — business logic and transactions.

Routes stay thin; all domain rules live here so they are easy to test in
isolation and reuse from anywhere (CLI, jobs, other endpoints).
"""

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
    product = Product(name=data.name, sku=data.sku, price=data.price)
    db.session.add(product)
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
