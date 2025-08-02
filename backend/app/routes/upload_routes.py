import os
import threading
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import PDFReference
from app.services.ocr_service import ocr_process_pdf_with_context

upload_bp = Blueprint('upload_bp', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ['pdf']

@upload_bp.route('/api/upload/pdf', methods=['POST'])
def upload_pdf_file():
    uploaded_files = request.files.getlist('files')
    
    if not uploaded_files or all(f.filename == '' for f in uploaded_files):
        return jsonify({"error": "No selected files"}), 400

    queued_files = []
    errors = {}

    for file in uploaded_files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            file_path = os.path.join(upload_folder, filename)
            
            # Save the file, overwriting if it exists
            file.save(file_path)

            # Check if a record for this file path already exists
            pdf_ref = PDFReference.query.filter_by(file_path=file_path).first()

            if pdf_ref:
                # If it exists, just reset its status
                pdf_ref.processing_status = 'pending'
                pdf_ref.extracted_text = None # Clear old text
            else:
                # If it doesn't exist, create a new record
                pdf_ref = PDFReference(filename=filename, file_path=file_path, processing_status='pending')
                db.session.add(pdf_ref)
            
            db.session.commit()

            # Start OCR in a background thread
            app_context = current_app.app_context()
            thread = threading.Thread(target=ocr_process_pdf_with_context, args=(app_context, file_path, pdf_ref.id))
            thread.start()
            
            queued_files.append(filename)
        elif file:
            errors[file.filename] = "Invalid file type. Only PDF is allowed."

    return jsonify({
        "message": f"Queued {len(queued_files)} file(s) for processing.",
        "queued_files": queued_files,
        "errors": errors
    }), 202