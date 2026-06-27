def test_create_product(client):
    res = client.post("/api/products", json={"name": "Widget", "price": "10.50"})
    assert res.status_code == 201
    data = res.get_json()
    assert data["name"] == "Widget"
    # Money is serialised as a fixed two-decimal string.
    assert data["price"] == "10.50"


def test_product_price_must_be_positive(client):
    res = client.post("/api/products", json={"name": "Bad", "price": "0"})
    assert res.status_code == 422


def test_product_price_is_required(client):
    res = client.post("/api/products", json={"name": "NoPrice"})
    assert res.status_code == 422


def test_duplicate_sku_returns_conflict(client):
    client.post("/api/products", json={"name": "A", "price": "10.00", "sku": "DUP-1"})
    res = client.post("/api/products", json={"name": "B", "price": "20.00", "sku": "DUP-1"})
    assert res.status_code == 409
    assert res.get_json()["error"]["code"] == "conflict"
