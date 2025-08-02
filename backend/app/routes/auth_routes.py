from flask import request, jsonify, Blueprint, current_app
from ..models import User
from ..extensions import db, bcrypt
from ..utils.decorators import token_required
import jwt
import datetime

auth_bp = Blueprint('auth_bp', __name__)


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('login') or not data.get('password'):
        return jsonify({"error": "Login identifier and password are required."}), 400

    # Allow login with either email or username
    user = User.query.filter((User.email == data['login']) | (User.username == data['login'])).first()

    if not user:
        return jsonify({"error": "User not found."}), 404

    if bcrypt.check_password_hash(user.password_hash, data['password']):
        # Create the JWT token
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({"token": token}), 200
    else:
        return jsonify({"error": "Invalid credentials."}), 401

@auth_bp.route('/api/auth/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "school_id": current_user.school_id  # ⬅️ Tambahkan baris ini
    }), 200