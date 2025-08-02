# backend/app/routes/layout_routes.py

import os
from flask import Blueprint, request, jsonify, current_app
from app.utils.decorators import token_required 
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Layout
import docx
import fitz  # PyMuPDF
# --- TAMBAHKAN IMPORT INI ---
from app.services.rag_service import add_to_collection

layout_bp = Blueprint('layout_bp', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}

# --- MODIFIKASI FUNGSI PARSING ---
def parse_docx_to_json_and_text(file_path):
    doc = docx.Document(file_path)
    # Ekstrak semua teks dari paragraf
    text_content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    
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
    # Kembalikan struktur JSON dan teks mentah
    return structure, text_content

def parse_pdf_to_json_and_text(file_path):
    doc = fitz.open(file_path)
    full_text = ""
    structure = {
        'type': 'pdf',
        'pages': []
    }
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_text = page.get_text("text")
        full_text += page_text + "\n"
        structure['pages'].append({
            'page': page_num + 1,
            'text': page_text
        })
    # Kembalikan struktur JSON dan teks mentah
    return structure, full_text
# --- AKHIR MODIFIKASI FUNGSI PARSING ---

@layout_bp.route('/upload', methods=['POST'])
@token_required
def upload_layout(current_user):
    upload_folder = current_app.config['UPLOAD_FOLDER'] 
    
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
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'layouts')
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        try:
            # --- TANGKAP KEDUA NILAI (JSON DAN TEKS) ---
            if filename.endswith('.docx'):
                layout_json, text_content = parse_docx_to_json_and_text(file_path)
            else:
                layout_json, text_content = parse_pdf_to_json_and_text(file_path)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"msg": f"Error parsing file: {str(e)}"}), 500

        new_layout = Layout(
            jenjang=jenjang, mapel=mapel, tipe_dokumen=tipe_dokumen,
            layout_json=layout_json, uploaded_by=current_user.id
        )
        db.session.add(new_layout)
        db.session.commit()

        # --- TAMBAHKAN LOGIKA INDEXING DI SINI ---
        try:
            document_id = f"layout_{new_layout.id}_{new_layout.tipe_dokumen}"
            text_chunks = [chunk for chunk in text_content.split('\n') if len(chunk.strip()) > 30]
            if text_chunks:
                add_to_collection(text_chunks, document_id)
                print(f"✅ Layout content for {document_id} successfully indexed.")
        except Exception as e:
            print(f"❌ Error indexing layout content: {str(e)}")
        # ----------------------------------------

        return jsonify({"msg": "Layout uploaded and indexed successfully", "layout_id": new_layout.id}), 201

    return jsonify({"msg": "File type not allowed"}), 400