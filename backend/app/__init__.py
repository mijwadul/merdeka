# backend/app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .extensions import db, migrate
from app.routes.retriever import retriever_bp
from .routes.layout_routes import layout_bp
from .routes.book_routes import book_bp
from .routes.wizard_data_routes import wizard_data_bp

def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__, instance_relative_config=True)

    # CORS untuk akses frontend dari localhost:3000
    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3000"}},
        expose_headers=["Content-Disposition"],
        supports_credentials=True
    )

    # Konfigurasi utama
    app.config.from_mapping(
        SECRET_KEY='a-very-secret-key-that-should-be-changed',
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, '..', 'gatra_sinau.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY='a-very-secret-key-that-should-be-changed',
        JWT_TOKEN_LOCATION=['headers'],
        JWT_HEADER_NAME='Authorization',
        JWT_HEADER_TYPE='Bearer',
    )

    # Inisialisasi JWT
    jwt = JWTManager(app)

    # Folder upload layout
    upload_folder = os.path.join(app.instance_path, '..', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder

    # Inisialisasi database & migrasi
    db.init_app(app)
    migrate.init_app(app, db)

    # Import semua model sebelum digunakan
    from . import models

    # Register semua blueprint
    from .routes import (
        upload_routes, status_routes, generate_routes, auth_routes,
        user_management_routes, class_routes, school_routes, subject_routes
    )
    app.register_blueprint(upload_routes.upload_bp)
    app.register_blueprint(status_routes.status_bp)
    app.register_blueprint(generate_routes.generator_bp)
    app.register_blueprint(wizard_data_bp, url_prefix='/api')
    app.register_blueprint(auth_routes.auth_bp)
    app.register_blueprint(user_management_routes.user_mgmt_bp)
    app.register_blueprint(class_routes.class_bp)
    app.register_blueprint(school_routes.school_bp)
    app.register_blueprint(subject_routes.subject_bp)
    app.register_blueprint(retriever_bp)
    app.register_blueprint(layout_bp, url_prefix='/api/layouts')
    app.register_blueprint(book_bp, url_prefix='/api/books')

    # Daftarkan command CLI kustom
    from . import commands
    commands.init_app(app)

    # Route testing
    @app.route('/hello')
    def hello():
        return "Hello, World! The Gatra Sinau backend is running."

    return app