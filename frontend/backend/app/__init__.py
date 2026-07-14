from flask import Flask
from flask_cors import CORS

from .routes import api


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "http://127.0.0.1:5173"}})
    app.register_blueprint(api, url_prefix="/api")
    return app
