def test_create_client(client):
    res = client.post("/api/clients", json={"name": "Acme", "email": "a@b.co"})
    assert res.status_code == 201
    data = res.get_json()
    assert data["id"] > 0
    assert data["name"] == "Acme"
    assert data["email"] == "a@b.co"


def test_create_client_requires_name(client):
    res = client.post("/api/clients", json={"email": "x@y.z"})
    assert res.status_code == 422
    assert res.get_json()["error"]["code"] == "validation_error"


def test_invalid_email_rejected(client):
    res = client.post("/api/clients", json={"name": "X", "email": "not-an-email"})
    assert res.status_code == 422


def test_list_clients(client):
    client.post("/api/clients", json={"name": "One"})
    client.post("/api/clients", json={"name": "Two"})
    res = client.get("/api/clients")
    assert res.status_code == 200
    assert len(res.get_json()) == 2
