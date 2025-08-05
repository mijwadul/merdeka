# backend/app/routes/layout_routes.py

import os
import re
import json
from flask import Blueprint, request, jsonify, current_app
from app.utils.decorators import token_required 
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Layout
import docx
import google.generativeai as genai

layout_bp = Blueprint('layout_bp', __name__)

def allowed_file(filename):
    # Kita kembali mengizinkan docx saja karena paling terstruktur
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'docx'}

# --- LANGKAH 1: PARSER MENTAH ---
def parse_docx_raw(file_path):
    """Hanya mengubah docx menjadi struktur data mentah tanpa interpretasi."""
    doc = docx.Document(file_path)
    raw_structure = {'paragraphs': [], 'tables': []}
    for p in doc.paragraphs:
        if p.text.strip():
            raw_structure['paragraphs'].append(p.text.strip())
    for table in doc.tables:
        table_data = []
        for row in table.rows:
            row_data = [cell.text.strip() for cell in row.cells]
            table_data.append(row_data)
        raw_structure['tables'].append(table_data)
    return raw_structure

# --- LANGKAH 2: PARSER AGENT BERBASIS AI ---
def parser_agent_analyze_layout(raw_structure):
    """Menggunakan Gemini untuk menganalisis struktur mentah dan mengubahnya menjadi template cerdas."""
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY tidak ditemukan di .env")
    genai.configure(api_key=google_api_key)

    prompt = f"""
Anda adalah AI analis struktur dokumen yang sangat ahli.
Tugas Anda adalah menganalisis struktur JSON mentah dari sebuah dokumen dan mengubahnya menjadi sebuah "template cerdas" dalam format JSON.

# INPUT (Struktur Dokumen Mentah):
{json.dumps(raw_structure, indent=2)}

# PERINTAH:
1. Analisis input di atas. Identifikasi mana tabel utama yang kemungkinan besar akan diisi dengan daftar data (seperti daftar Prota, Promes, dll.).
2. Abaikan teks-teks lain yang tidak relevan (seperti kop surat, instruksi, atau paragraf penjelasan umum).
3. Buat sebuah template JSON baru dengan struktur berikut:
   {{
     "main_list_placeholder": "DAFTAR_PROTA_UTAMA", 
     "item_structure": {{
       "key_kolom_1": "Nama Kolom 1 dari tabel",
       "key_kolom_2": "Nama Kolom 2 dari tabel"
     }}
   }}
4. "main_list_placeholder" harus berupa string unik yang merepresentasikan daftar utama.
5. "item_structure" harus berupa objek yang key-nya adalah versi snake_case dari nama kolom di tabel utama, dan value-nya adalah nama kolom asli.

Contoh jika tabel utama memiliki kolom "Materi Pokok" dan "Alokasi Waktu", output Anda harus:
{{
  "main_list_placeholder": "DAFTAR_MATERI_PROTA",
  "item_structure": {{
    "materi_pokok": "Materi Pokok",
    "alokasi_waktu": "Alokasi Waktu"
  }}
}}

Pastikan output Anda HANYA berupa objek JSON yang valid tanpa teks tambahan.
"""

    try:
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)
        response = model.generate_content(prompt)
        
        # Menggunakan parser JSON yang toleran untuk keamanan
        return json.loads(response.text, strict=False)

    except Exception as e:
        print(f"[PARSER_AGENT_ERROR] Gagal menganalisis layout dengan AI: {e}")
        raise

# --- RUTE UPLOAD YANG MENGGUNAKAN WORKFLOW BARU ---
@layout_bp.route('/upload', methods=['POST'])
@token_required
def upload_layout(current_user):
    # ... (kode pengecekan file, jenjang, mapel, dll. tetap sama) ...
    if 'file' not in request.files: return jsonify({"msg": "No file part"}), 400
    file = request.files['file']
    jenjang = request.form.get('jenjang')
    mapel = request.form.get('mapel')
    tipe_dokumen = request.form.get('tipe_dokumen')
    if not all([file, file.filename, jenjang, mapel, tipe_dokumen]): return jsonify({"msg": "Missing required form data"}), 400

    if allowed_file(file.filename):
        # ... (kode penyimpanan file tetap sama) ...
        filename = secure_filename(file.filename)
        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'layouts')
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        try:
            # 1. Lakukan parsing mentah
            raw_layout = parse_docx_raw(file_path)
            
            # 2. Minta AI untuk menganalisis dan membuat template cerdas
            smart_template_json = parser_agent_analyze_layout(raw_layout)

        except Exception as e:
            if os.path.exists(file_path): os.remove(file_path)
            return jsonify({"msg": f"Error: Gagal saat AI memproses layout: {str(e)}"}), 500

        # 3. Simpan template cerdas ke database
        new_layout = Layout(
            jenjang=jenjang, mapel=mapel, tipe_dokumen=tipe_dokumen,
            layout_json=smart_template_json, # <-- Menyimpan hasil dari AI
            uploaded_by=current_user.id, file_path=file_path
        )
        db.session.add(new_layout)
        db.session.commit()

        return jsonify({
            "msg": "Layout diunggah dan berhasil dianalisis oleh AI menjadi template cerdas.",
            "layout_id": new_layout.id,
            "smart_template": smart_template_json
        }), 201

    return jsonify({"msg": "File type not allowed. Only .docx is supported."}), 400