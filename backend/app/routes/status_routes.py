from flask import Blueprint, jsonify
from app.models import PDFReference

status_bp = Blueprint('status_bp', __name__)

@status_bp.route('/api/uploads/status', methods=['GET'])
def get_uploads_status():
    try:
        references = PDFReference.query.order_by(PDFReference.uploaded_at.desc()).all()
        status_list = [
            {
                "id": ref.id,
                "filename": ref.filename,
                "status": ref.processing_status,
                "uploaded_at": ref.uploaded_at.isoformat(),
                "progress": ref.processing_progress # Add progress to the response
            }
            for ref in references
        ]
        return jsonify(status_list), 200
    except Exception as e:
        return jsonify({"error": "Could not retrieve upload statuses", "details": str(e)}), 500