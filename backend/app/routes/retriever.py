# backend/app/retriever.py

from flask import Blueprint, jsonify, request
from app.extensions import db
import os
import re

# Import model yang kita butuhkan untuk menyimpan CP
from app.models.subject import Subject
from app.models.aimodels import Elemen, CP

# Import fungsi-fungsi yang sudah ada
from app.agents.retriever_agent import (
    add_document_from_url,
    crawl_documents,
    get_discovered_documents,
    embed_documents_by_ids,
    search_pdf_links,
    query_documents_by_text
    # Pastikan extract_text_from_url dan embed_document_from_url juga ada
)

retriever_bp = Blueprint('retriever', __name__)

# =================================================================
# == RUTE-RUTE YANG SUDAH ADA UNTUK RETRIEVAL AUGMENTED GENERATION ==
# =================================================================

@retriever_bp.route('/api/crawl-documents', methods=['POST'])
def trigger_crawler():
    documents = crawl_documents()
    return jsonify({"status": "success", "count": len(documents)}), 200


@retriever_bp.route('/api/found-documents', methods=['GET'])
def list_found_documents():
    documents = get_discovered_documents()
    return jsonify(documents), 200


@retriever_bp.route('/api/embed-documents', methods=['POST'])
def embed_documents():
    data = request.get_json()
    selected_ids = data.get('ids', [])
    if not selected_ids:
        return jsonify({"error": "No IDs provided"}), 400

    results = embed_documents_by_ids(selected_ids)
    return jsonify(results), 200

@retriever_bp.route('/api/search-documents')
def search_documents():
    q = request.args.get('q')
    if not q:
        return jsonify({"error": "No query"}), 400

    results = search_pdf_links(q)
    return jsonify(results), 200

@retriever_bp.route('/api/add-document', methods=['POST'])
def add_document():
    data = request.get_json()
    url = data.get("url")

    if not url or not url.endswith(".pdf"):
        return jsonify({"error": "Invalid or missing PDF URL"}), 400

    result = add_document_from_url(url)
    if isinstance(result, tuple):  # error
        return jsonify(result[0]), result[1]

    return jsonify(result), 200

@retriever_bp.route('/api/query-documents')
def query_documents():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "No query"}), 400

    results = query_documents_by_text(q)
    return jsonify(results)

# ============================================================
# == RUTE BARU UNTUK UPLOAD DAN PARSING FILE CP (TUGAS KITA) ==
# ============================================================

def parse_cp_from_file(file_path):
    """
    Membaca file teks CP dan mengubahnya menjadi struktur data Python.
    Fungsi ini dirancang untuk fleksibel terhadap format penulisan elemen.
    """
    structured_data = []
    current_fase = None
    reading_mode = None # Mode bisa 'umum' atau 'elemen'

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            # Deteksi Fase Baru
            fase_match = re.search(r'FASE\s+([A-F])', line, re.IGNORECASE)
            if fase_match:
                current_fase = fase_match.group(1).upper()
                reading_mode = None # Reset mode saat ganti fase
                continue

            if not current_fase:
                continue

            # Deteksi mode baca
            if 'capaian umum' in line.lower():
                reading_mode = 'umum'
                capaian_umum_text = line.split(':', 1)[1].strip() if ':' in line else ''
                if capaian_umum_text:
                    structured_data.append({
                        'fase': current_fase,
                        'elemen_name': 'Capaian Umum',
                        'isi': capaian_umum_text
                    })
                continue
            
            if 'capaian per elemen' in line.lower() or 'elemen:' in line.lower():
                reading_mode = 'elemen'
                continue

            # Proses baris berdasarkan mode baca
            if reading_mode == 'umum':
                structured_data.append({
                    'fase': current_fase,
                    'elemen_name': 'Capaian Umum',
                    'isi': line
                })
                reading_mode = None

            elif reading_mode == 'elemen':
                elemen_match = re.match(r'^[•-]\s*([^:]+):\s*(.*)', line)
                if elemen_match:
                    nama_elemen = elemen_match.group(1).strip()
                    isi_elemen = elemen_match.group(2).strip()
                    structured_data.append({
                        'fase': current_fase,
                        'elemen_name': nama_elemen,
                        'isi': isi_elemen
                    })

    return structured_data


@retriever_bp.route('/api/cp/upload-and-parse', methods=['POST'])
def upload_cp_and_parse():
    # 1. Validasi
    if 'file' not in request.files:
        return jsonify({"error": "Tidak ada file yang diunggah"}), 400
    
    file = request.files['file']
    subject_id = request.form.get('subject_id')

    if not subject_id:
        return jsonify({"error": "Subject ID wajib diisi"}), 400

    # 2. Cek Subject (Sekarang hanya perlu cek ID)
    subject = Subject.query.get(subject_id)
    if not subject:
        return jsonify({"error": f"Subject dengan ID {subject_id} tidak ditemukan"}), 404

    # 3. Simpan File Temporer
    upload_folder = 'uploads/cp_documents'
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, file.filename)
    file.save(file_path)

    try:
        # 4. Parsing dan Simpan ke DB (logika ini tidak berubah)
        parsed_data = parse_cp_from_file(file_path)
        if not parsed_data:
            return jsonify({"error": "Tidak ada data yang bisa diparsing dari file."}), 400

        for data in parsed_data:
            # ... (logika for loop untuk membuat Elemen dan CP tetap sama persis)
            elemen_name = data.get('elemen_name', 'Capaian Umum')
            elemen = Elemen.query.filter_by(subject_id=subject.id, nama_elemen=elemen_name).first()
            if not elemen:
                elemen = Elemen(subject_id=subject.id, nama_elemen=elemen_name)
                db.session.add(elemen)
                db.session.flush()

            existing_cp = CP.query.filter_by(elemen_id=elemen.id, fase=data['fase']).first()
            if existing_cp:
                existing_cp.isi_cp = data['isi']
            else:
                new_cp = CP(
                    elemen_id=elemen.id,
                    fase=data['fase'],
                    isi_cp=data['isi'],
                    sumber_dokumen=file.filename
                )
                db.session.add(new_cp)
        
        db.session.commit()
        
        return jsonify({
            "message": f"File CP untuk '{subject.name}' berhasil diunggah dan diproses!",
            "data_ditemukan": len(parsed_data)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Terjadi kesalahan saat memproses file ke database", "details": str(e)}), 500