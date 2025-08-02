from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Subject
from app.utils.decorators import token_required

subject_bp = Blueprint('subject_bp', __name__)

@subject_bp.route('/api/subjects', methods=['GET'])
@token_required
def get_subjects(current_user):
    """Get all subjects (built-in + custom)."""
    subjects = Subject.query.order_by(Subject.name).all()
    return jsonify([s.to_dict() for s in subjects])

@subject_bp.route('/api/subjects', methods=['POST'])
@token_required
def create_subject(current_user):
    """Create a new subject (custom)."""
    data = request.get_json()
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Subject name is required."}), 400

    existing = Subject.query.filter_by(name=name).first()
    if existing:
        return jsonify(existing.to_dict())

    new_subject = Subject(name=name, is_custom=True)
    db.session.add(new_subject)
    db.session.commit()

    return jsonify(new_subject.to_dict()), 201