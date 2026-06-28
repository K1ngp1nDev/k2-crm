"""Populate the database with realistic demo data for screenshots / portfolio.

Idempotent and deterministic: it drops and recreates the schema, then inserts
a fixed data set (seeded RNG) so screenshots are reproducible run-to-run.

    python seed.py            # uses DATABASE_URL or the default SQLite file
"""

import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app import create_app
from app.extensions import db
from app.models import Client, Order, OrderItem, Product

# (name, email, phone)
CLIENTS = [
    ("Northwind Trading Co.", "ops@northwind.example", "+1 415 555 0142"),
    ("Globex Industries", "purchasing@globex.example", "+1 212 555 0177"),
    ("Initech Solutions", "ap@initech.example", "+1 408 555 0193"),
    ("Umbrella Logistics", "supply@umbrella.example", "+44 20 7946 0123"),
    ("Soylent Foods Ltd.", "orders@soylent.example", "+1 312 555 0156"),
    ("Stark Manufacturing", "procurement@stark.example", "+1 213 555 0168"),
    ("Wayne Enterprises", "vendors@wayne.example", "+1 201 555 0119"),
    ("Hooli Retail Group", "buy@hooli.example", "+1 650 555 0184"),
    ("Vandelay Imports", "info@vandelay.example", "+1 305 555 0132"),
]

# (name, sku, price)
PRODUCTS = [
    ("ProBook 14\" Laptop", "NB-PRO-14", "1299.00"),
    ("UltraWide 34\" Monitor", "MON-UW-34", "749.50"),
    ("Mechanical Keyboard K2", "ACC-KB-K2", "119.99"),
    ("Wireless Mouse Pro", "ACC-MS-PRO", "59.90"),
    ("USB-C Docking Station", "ACC-DCK-01", "189.00"),
    ("4K Webcam Studio", "ACC-CAM-4K", "149.00"),
    ("Noise-Cancelling Headset", "ACC-HS-NC", "229.00"),
    ("27\" IPS Monitor", "MON-IPS-27", "329.00"),
    ("Standing Desk Frame", "FUR-DSK-ST", "459.00"),
    ("Ergo Office Chair", "FUR-CHR-ER", "389.00"),
    ("Network Switch 24-port", "NET-SW-24", "279.00"),
    ("External SSD 2TB", "STO-SSD-2T", "199.00"),
    ("Conference Speakerphone", "ACC-SPK-CF", "169.00"),
    ("Label Printer Compact", "PRN-LBL-CP", "139.00"),
]

# (status, weight) — a believable distribution for a B2B order book.
STATUS_WEIGHTS = [
    ("completed", 38),
    ("shipped", 20),
    ("paid", 18),
    ("created", 16),
    ("cancelled", 8),
]

N_ORDERS = 96
HISTORY_DAYS = 178


def run() -> None:
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        rng = random.Random(42)
        now = datetime.now(timezone.utc)

        clients = [Client(name=n, email=e, phone=p) for n, e, p in CLIENTS]
        db.session.add_all(clients)

        products = [Product(name=n, sku=s, price=Decimal(p)) for n, s, p in PRODUCTS]
        db.session.add_all(products)
        db.session.flush()  # assign ids

        statuses = [s for s, _ in STATUS_WEIGHTS]
        weights = [w for _, w in STATUS_WEIGHTS]

        for _ in range(N_ORDERS):
            client = rng.choice(clients)
            created = now - timedelta(
                days=rng.randint(0, HISTORY_DAYS),
                hours=rng.randint(0, 23),
                minutes=rng.randint(0, 59),
            )
            status = rng.choices(statuses, weights=weights, k=1)[0]
            order = Order(
                client_id=client.id,
                status=status,
                total_amount=Decimal("0.00"),
                created_at=created,
            )

            chosen = rng.sample(products, k=rng.randint(1, 4))
            total = Decimal("0.00")
            for product in chosen:
                qty = rng.randint(1, 6)
                unit_price = Decimal(product.price)
                line_total = unit_price * qty
                order.items.append(
                    OrderItem(
                        product_id=product.id,
                        quantity=qty,
                        unit_price=unit_price,
                        line_total=line_total,
                    )
                )
                total += line_total

            order.total_amount = total
            db.session.add(order)

        db.session.commit()
        print(
            f"Seeded {len(clients)} clients, {len(products)} products, "
            f"{N_ORDERS} orders over the last {HISTORY_DAYS} days."
        )


if __name__ == "__main__":
    run()
