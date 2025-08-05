# backend/app/routes/wizard_data_routes.py

from flask import Blueprint, jsonify
from app.models import Class
from app.utils.decorators import token_required

# Membuat blueprint baru khusus untuk rute-rute data wizard
wizard_data_bp = Blueprint('wizard_data_bp', __name__)

@wizard_data_bp.route('/my-classes', methods=['GET']) # Rute sudah disederhanakan
@token_required
def get_my_classes(current_user):
    """
    Endpoint khusus untuk mengambil daftar kelas.
    - Untuk Guru: Hanya kelas yang diajar.
    - Untuk Developer: Semua kelas yang ada di sistem.
    """
    try:
        classes_to_process = []
        if current_user.role == 'Developer':
            classes_to_process = Class.query.all()
        elif current_user.role == 'Teacher':
            classes_to_process = Class.query.filter_by(teacher_id=current_user.id).all()
        
        results = []
        for cls in classes_to_process:
            class_data = {
                'id': cls.id,
                'grade_level': cls.grade_level,
                'parallel_class': cls.parallel_class,
                'class_name': f"{cls.grade_level}{cls.parallel_class}",
                'subject': {
                    'id': cls.subject.id,
                    'name': cls.subject.name
                } if cls.subject else None
            }
            results.append(class_data)

        return jsonify(results)

    except Exception as e:
        return jsonify({"msg": "Gagal mengambil data kelas", "error": str(e)}), 500