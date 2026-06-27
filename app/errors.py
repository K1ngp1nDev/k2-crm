from flask import Flask, jsonify
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException

from app.extensions import db


class APIError(Exception):
    status_code = 400
    code = "error"

    def __init__(self, message, status_code=None, code=None, details=None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details

    def to_dict(self):
        payload = {"code": self.code, "message": self.message}
        if self.details is not None:
            payload["details"] = self.details
        return {"error": payload}


class NotFoundError(APIError):
    status_code = 404
    code = "not_found"


class BusinessRuleError(APIError):
    status_code = 422
    code = "business_rule"


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(APIError)
    def _handle_api_error(err: APIError):
        db.session.rollback()
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(ValidationError)
    def _handle_validation(err: ValidationError):
        db.session.rollback()
        details = [
            {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]}
            for e in err.errors()
        ]
        return (
            jsonify(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "Invalid request payload",
                        "details": details,
                    }
                }
            ),
            422,
        )

    @app.errorhandler(404)
    def _handle_404(_err):
        return (
            jsonify({"error": {"code": "not_found", "message": "Resource not found"}}),
            404,
        )

    @app.errorhandler(405)
    def _handle_405(_err):
        return (
            jsonify(
                {"error": {"code": "method_not_allowed", "message": "Method not allowed"}}
            ),
            405,
        )

    @app.errorhandler(IntegrityError)
    def _handle_integrity(_err: IntegrityError):
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": {
                        "code": "conflict",
                        "message": "Resource conflicts with an existing record",
                    }
                }
            ),
            409,
        )

    @app.errorhandler(HTTPException)
    def _handle_http(err: HTTPException):
        return (
            jsonify(
                {
                    "error": {
                        "code": (err.name or "error").lower().replace(" ", "_"),
                        "message": err.description,
                    }
                }
            ),
            err.code or 500,
        )

    @app.errorhandler(Exception)
    def _handle_unexpected(_err: Exception):
        db.session.rollback()
        return (
            jsonify({"error": {"code": "internal_error", "message": "Internal server error"}}),
            500,
        )
