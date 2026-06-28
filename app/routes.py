from flask import Blueprint, jsonify, request

from app import schemas, services
from app.errors import APIError

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _json_body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise APIError(
            "Request body must be a JSON object",
            status_code=400,
            code="invalid_json",
        )
    return data


def _dump(model) -> dict:
    return model.model_dump(mode="json")


@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


@api_bp.post("/clients")
def create_client():
    data = schemas.ClientCreate.model_validate(_json_body())
    client = services.create_client(data)
    return jsonify(_dump(schemas.ClientOut.model_validate(client))), 201


@api_bp.get("/clients")
def list_clients():
    clients = services.list_clients()
    return jsonify([_dump(schemas.ClientOut.model_validate(c)) for c in clients])


@api_bp.get("/clients/<int:client_id>/orders")
def list_client_orders(client_id: int):
    orders = services.list_client_orders(client_id)
    return jsonify([_dump(schemas.OrderOut.model_validate(o)) for o in orders])


@api_bp.post("/products")
def create_product():
    data = schemas.ProductCreate.model_validate(_json_body())
    product = services.create_product(data)
    return jsonify(_dump(schemas.ProductOut.model_validate(product))), 201


@api_bp.get("/products")
def list_products():
    products = services.list_products()
    return jsonify([_dump(schemas.ProductOut.model_validate(p)) for p in products])


@api_bp.post("/orders")
def create_order():
    data = schemas.OrderCreate.model_validate(_json_body())
    order = services.create_order(data)
    return jsonify(_dump(schemas.OrderOut.model_validate(order))), 201


@api_bp.get("/orders")
def list_orders():
    client_id = request.args.get("client_id", type=int)
    orders = services.list_orders(client_id=client_id)
    return jsonify([_dump(schemas.OrderOut.model_validate(o)) for o in orders])


@api_bp.get("/orders/<int:order_id>")
def get_order(order_id: int):
    order = services.get_order(order_id)
    return jsonify(_dump(schemas.OrderOut.model_validate(order)))


@api_bp.get("/stats")
def stats():
    return jsonify(_dump(schemas.StatsOut.model_validate(services.get_stats())))


@api_bp.get("/analytics")
def analytics():
    return jsonify(_dump(schemas.AnalyticsOut.model_validate(services.get_analytics())))


@api_bp.get("/reports")
def reports():
    return jsonify(_dump(schemas.ReportsOut.model_validate(services.get_reports())))


@api_bp.get("/activity")
def activity():
    events = services.list_activity()
    return jsonify([_dump(schemas.ActivityEventOut.model_validate(e)) for e in events])


@api_bp.patch("/products/<int:product_id>/stock")
def adjust_stock(product_id: int):
    data = schemas.StockAdjust.model_validate(_json_body())
    product = services.adjust_product_stock(product_id, data.stock)
    return jsonify(_dump(schemas.ProductOut.model_validate(product)))


@api_bp.post("/reset")
def reset_demo():
    import seed

    seed.run()
    return jsonify({"status": "ok"})
