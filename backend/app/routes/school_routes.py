from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models import School
from app.utils.decorators import token_required

school_bp = Blueprint('school_bp', __name__)

@school_bp.route('/api/schools', methods=['GET'])
@token_required
def get_schools(current_user):
    """Get a list of schools based on user role."""
    if current_user.role == 'Developer':
        schools = School.query.all()
    elif current_user.role == 'School Admin':
        schools = School.query.filter_by(id=current_user.school_id).all()
    else:
        return jsonify({"error": "Access denied"}), 403

    school_list = [{"id": s.id, "name": s.name, "address": s.address} for s in schools]
    return jsonify(school_list)

@school_bp.route('/api/schools', methods=['POST'])
@token_required
def create_school(current_user):
    """Creates a new school."""
    if current_user.role not in ['Developer', 'School Admin']:
        return jsonify({"message": "Access denied"}), 403

    data = request.get_json()

    # --- FIX STARTS HERE ---
    # Validate that required data (name and level) is present
    if not data or 'name' not in data or 'level' not in data:
        return jsonify({'message': 'School name and level are required.'}), 400
    
    # Check for empty strings
    if not data['name'] or not data['level']:
        return jsonify({'message': 'School name and level cannot be empty.'}), 400

    new_school = School(
        name=data['name'],
        address=data.get('address'), # address is optional
        level=data['level']         # Get level from request data
    )
    # --- FIX ENDS HERE ---
    
    db.session.add(new_school)
    db.session.commit()
    
    return jsonify(new_school.to_dict()), 201

@school_bp.route('/api/schools/<int:school_id>', methods=['PUT'])
@token_required
def update_school(current_user, school_id):
    """Update a school's name and address (Developer only)."""
    if current_user.role != 'Developer':
        return jsonify({"error": "Permission denied."}), 403
        
    school = School.query.get_or_404(school_id)
    data = request.get_json()
    school.name = data.get('name', school.name)
    school.address = data.get('address', school.address) # Update the address
    db.session.commit()
    return jsonify({"message": "School updated successfully."})

@school_bp.route('/api/schools/<int:school_id>', methods=['DELETE'])
@token_required
def delete_school(current_user, school_id):
    """Delete a school (Developer only)."""
    if current_user.role != 'Developer':
        return jsonify({"error": "Permission denied."}), 403

    school = School.query.get_or_404(school_id)
    db.session.delete(school)
    db.session.commit()
    return jsonify({"message": "School deleted successfully."})