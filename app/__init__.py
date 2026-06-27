import os

from flask import Flask, jsonify, send_from_directory

from app.config import Config
from app.errors import register_error_handlers
from app.extensions import db

_FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"
)


def create_app(config_object=None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_object or Config)
    app.json.ensure_ascii = False  # readable Cyrillic in JSON responses

    db.init_app(app)

    from app import models  # noqa: F401  (register models before create_all)
    from app.routes import api_bp

    app.register_blueprint(api_bp)
    register_error_handlers(app)

    with app.app_context():
        db.create_all()

    _register_spa(app)
    return app


def _register_spa(app: Flask) -> None:
    from werkzeug.exceptions import NotFound

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path: str):
        if path.startswith("api/"):
            return jsonify({"error": {"code": "not_found", "message": "Not found"}}), 404

        # send_from_directory uses safe_join, which rejects path traversal.
        if path:
            try:
                return send_from_directory(_FRONTEND_DIST, path)
            except NotFound:
                pass

        index = os.path.join(_FRONTEND_DIST, "index.html")
        if os.path.exists(index):
            return send_from_directory(_FRONTEND_DIST, "index.html")

        return (
            jsonify(
                {
                    "service": "k2-erp-orders",
                    "message": "API is running. Frontend not built — see README.",
                    "api_health": "/api/health",
                }
            ),
            200,
        )
