# backend/app/routes/book_routes.py

import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Book, Subject # Tambahkan Subject
from app.utils.decorators import token_required

book_bp = Blueprint('book_bp', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf'}

@book_bp.route('/upload', methods=['POST'])
@token_required
def upload_book(current_user):
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    jenjang = request.form.get('jenjang')
    mapel_id = request.form.get('mapel_id') # Kita akan menggunakan ID mapel
    kelas = request.form.get('kelas')
    
    if not all([file, file.filename, jenjang, mapel_id, kelas]):
        return jsonify({"msg": "Semua field wajib diisi."}), 400

    subject = Subject.query.get(mapel_id)
    if not subject:
        return jsonify({"msg": "Mata pelajaran tidak valid"}), 400

    # --- JUDUL BUKU DIBUAT OTOMATIS ---
    judul_buku = f"Buku Ajar {subject.name} Kelas {kelas} Jenjang {jenjang}"
    
    if allowed_file(file.filename):
        filename = secure_filename(f"{subject.name.replace(' ', '_')}_Kls_{kelas}_{file.filename}")
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'books')
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        new_book = Book(
            judul_buku=judul_buku,
            jenjang=jenjang,
            mapel=subject.name, # Simpan nama mapel
            file_path=file_path,
            uploaded_by=current_user.id
        )
        db.session.add(new_book)
        db.session.commit()

        # TODO: Panggil service pemrosesan buku secara asynchronous
        # process_book_async(new_book.id)

        return jsonify({"msg": "Buku berhasil diunggah dan sedang diproses", "book_id": new_book.id}), 201

    return jsonify({"msg": "Tipe file tidak diizinkan. Hanya .pdf"}), 400