# backend/app/routes/layout_routes.py

import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Layout
import docx
import fitz  # PyMuPDF

layout_bp = Blueprint('layout_bp', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}

def parse_docx_to_json(file_path):
    doc = docx.Document(file_path)
    structure = {
        'type': 'docx',
        'paragraphs': [p.text for p in doc.paragraphs if p.text],
        'tables': []
    }
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_data = [cell.text for cell in row.cells]
            table_data.append(row_data)
        structure['tables'].append(table_data)
    return structure

def parse_pdf_to_json(file_path):
    doc = fitz.open(file_path)
    structure = {
        'type': 'pdf',
        'pages': []
    }
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        structure['pages'].append({
            'page': page_num + 1,
            'text': page.get_text("text")
        })
    return structure

@layout_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_layout():
    upload_folder = current_app.config['LAYOUT_UPLOAD_FOLDER']
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    jenjang = request.form.get('jenjang')
    mapel = request.form.get('mapel')
    tipe_dokumen = request.form.get('tipe_dokumen')

    if not all([file, file.filename, jenjang, mapel, tipe_dokumen]):
        return jsonify({"msg": "Missing required form data"}), 400

    if allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        try:
            layout_json = parse_docx_to_json(file_path) if filename.endswith('.docx') else parse_pdf_to_json(file_path)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"msg": f"Error parsing file: {str(e)}"}), 500

        current_user_id = get_jwt_identity()
        new_layout = Layout(
            jenjang=jenjang, mapel=mapel, tipe_dokumen=tipe_dokumen,
            layout_json=layout_json, uploaded_by=current_user_id
        )
        db.session.add(new_layout)
        db.session.commit()

        return jsonify({"msg": "Layout uploaded successfully", "layout_id": new_layout.id}), 201

    return jsonify({"msg": "File type not allowed"}), 400