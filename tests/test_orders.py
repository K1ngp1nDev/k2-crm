"""Tests for the mandatory order business rules."""

from decimal import Decimal


def _make_client(client, name="Acme"):
    return client.post("/api/clients", json={"name": name}).get_json()


def _make_product(client, name, price):
    return client.post("/api/products", json={"name": name, "price": price}).get_json()


def test_order_total_is_computed_automatically(client):
    c = _make_client(client)
    p1 = _make_product(client, "A", "10.00")
    p2 = _make_product(client, "B", "2.50")

    res = client.post(
        "/api/orders",
        json={
            "client_id": c["id"],
            "items": [
                {"product_id": p1["id"], "quantity": 2},
                {"product_id": p2["id"], "quantity": 4},
            ],
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    # 2 * 10.00 + 4 * 2.50 = 30.00
    assert data["total_amount"] == "30.00"
    assert len(data["items"]) == 2
    assert data["items"][0]["line_total"] == "20.00"


def test_order_requires_existing_client(client):
    p = _make_product(client, "A", "10.00")
    res = client.post(
        "/api/orders",
        json={"client_id": 9999, "items": [{"product_id": p["id"], "quantity": 1}]},
    )
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "not_found"


def test_order_requires_client_id(client):
    p = _make_product(client, "A", "10.00")
    res = client.post(
        "/api/orders", json={"items": [{"product_id": p["id"], "quantity": 1}]}
    )
    assert res.status_code == 422


def test_order_requires_at_least_one_item(client):
    c = _make_client(client)
    res = client.post("/api/orders", json={"client_id": c["id"], "items": []})
    assert res.status_code == 422


def test_order_requires_existing_product(client):
    c = _make_client(client)
    res = client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": 9999, "quantity": 1}]},
    )
    assert res.status_code == 404


def test_quantity_must_be_positive(client):
    c = _make_client(client)
    p = _make_product(client, "A", "10.00")
    res = client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": p["id"], "quantity": 0}]},
    )
    assert res.status_code == 422


def test_price_snapshot_is_frozen(client, app):
    """Changing a product price must not rewrite the totals of past orders."""
    from app.extensions import db
    from app.models import Product

    c = _make_client(client)
    p = _make_product(client, "A", "10.00")

    order = client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": p["id"], "quantity": 1}]},
    ).get_json()
    assert order["total_amount"] == "10.00"

    with app.app_context():
        product = db.session.get(Product, p["id"])
        product.price = Decimal("999.00")
        db.session.commit()

    refetched = client.get(f"/api/orders/{order['id']}").get_json()
    assert refetched["total_amount"] == "10.00"
    assert refetched["items"][0]["unit_price"] == "10.00"


def test_order_amount_limit(client):
    c = _make_client(client)
    p = _make_product(client, "Expensive", "9999999999.99")
    res = client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": p["id"], "quantity": 1000}]},
    )
    assert res.status_code == 422
    assert res.get_json()["error"]["code"] == "business_rule"


def test_quantity_upper_bound(client):
    c = _make_client(client)
    p = _make_product(client, "A", "1.00")
    res = client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": p["id"], "quantity": 2_000_000}]},
    )
    assert res.status_code == 422


def test_list_client_orders(client):
    c = _make_client(client)
    p = _make_product(client, "A", "5.00")
    client.post(
        "/api/orders",
        json={"client_id": c["id"], "items": [{"product_id": p["id"], "quantity": 1}]},
    )
    res = client.get(f"/api/clients/{c['id']}/orders")
    assert res.status_code == 200
    assert len(res.get_json()) == 1


def test_list_client_orders_unknown_client(client):
    res = client.get("/api/clients/9999/orders")
    assert res.status_code == 404
