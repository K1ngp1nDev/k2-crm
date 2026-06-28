"""Tests for the /api/analytics aggregation endpoint."""


def _create(client, path, payload):
    res = client.post(path, json=payload)
    assert res.status_code == 201, res.get_json()
    return res.get_json()


def test_analytics_empty(client):
    data = client.get("/api/analytics").get_json()

    assert data["kpis"] == {
        "clients": 0,
        "products": 0,
        "orders": 0,
        "revenue": "0.00",
        "avg_order_value": "0.00",
    }
    assert data["orders_by_status"] == []
    assert data["top_products"] == []
    # Time-series is always zero-filled to the last 6 months.
    assert len(data["revenue_by_month"]) == 6
    assert all(
        p["revenue"] == "0.00" and p["orders"] == 0 for p in data["revenue_by_month"]
    )


def test_analytics_aggregates(client):
    c = _create(client, "/api/clients", {"name": "Acme"})
    widget = _create(client, "/api/products", {"name": "Widget", "price": "100.00"})
    gadget = _create(client, "/api/products", {"name": "Gadget", "price": "50.00"})

    # Order 1: 2 × Widget = 200.00
    _create(
        client,
        "/api/orders",
        {"client_id": c["id"], "items": [{"product_id": widget["id"], "quantity": 2}]},
    )
    # Order 2: 1 × Gadget + 1 × Widget = 150.00
    _create(
        client,
        "/api/orders",
        {
            "client_id": c["id"],
            "items": [
                {"product_id": gadget["id"], "quantity": 1},
                {"product_id": widget["id"], "quantity": 1},
            ],
        },
    )

    data = client.get("/api/analytics").get_json()
    kpis = data["kpis"]
    assert kpis["clients"] == 1
    assert kpis["products"] == 2
    assert kpis["orders"] == 2
    assert kpis["revenue"] == "350.00"
    assert kpis["avg_order_value"] == "175.00"

    # Both orders default to the "created" status.
    by_status = {s["status"]: s for s in data["orders_by_status"]}
    assert by_status["created"]["count"] == 2
    assert by_status["created"]["revenue"] == "350.00"

    # Widget sold 3 units for 300.00 and outranks Gadget.
    top = data["top_products"]
    assert top[0]["name"] == "Widget"
    assert top[0]["quantity"] == 3
    assert top[0]["revenue"] == "300.00"
    assert top[1]["name"] == "Gadget"
    assert top[1]["revenue"] == "50.00"

    # Freshly created orders land in the current (last) month bucket.
    current = data["revenue_by_month"][-1]
    assert current["orders"] == 2
    assert current["revenue"] == "350.00"
