# backend/app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate
from app.routes.retriever import retriever_bp
from .routes.layout_routes import layout_bp

def create_app():
    """Create and configure an instance of the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    
    CORS(
        app, 
        resources={r"/api/*": {"origins": "http://localhost:3000"}}, 
        expose_headers=["Content-Disposition"],
        supports_credentials=True
    )

    app.config.from_mapping(
        SECRET_KEY='a-very-secret-key-that-should-be-changed',
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, '..', 'gatra_sinau.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    
    upload_folder = os.path.join(app.instance_path, '..', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder

    db.init_app(app)
    migrate.init_app(app, db)
    
    from . import models

    from .routes import (
        upload_routes, status_routes, generate_routes, auth_routes, 
        user_management_routes, class_routes, school_routes, subject_routes
    )
    app.register_blueprint(upload_routes.upload_bp)
    app.register_blueprint(status_routes.status_bp)
    
    # --- PERBAIKAN DI SINI ---
    # Ganti 'generate_bp' menjadi 'generator_bp' dan pastikan hanya satu yang didaftarkan
    app.register_blueprint(generate_routes.generator_bp)
    # --- AKHIR PERBAIKAN ---

    app.register_blueprint(auth_routes.auth_bp)
    app.register_blueprint(user_management_routes.user_mgmt_bp)
    app.register_blueprint(class_routes.class_bp)
    app.register_blueprint(school_routes.school_bp)
    app.register_blueprint(subject_routes.subject_bp)
    app.register_blueprint(retriever_bp)
    app.register_blueprint(layout_bp, url_prefix='/api/layouts')
    
    from . import commands
    commands.init_app(app)

    @app.route('/hello')
    def hello():
        return "Hello, World! The Gatra Sinau backend is running."

    return app