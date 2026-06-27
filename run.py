import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Dev server only; production runs under gunicorn.
    debug = os.environ.get("FLASK_DEBUG") == "1"
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=5000, debug=debug)
