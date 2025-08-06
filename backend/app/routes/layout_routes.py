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
    # We continue to allow only docx as it is the most structured
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'docx'}

# --- STEP 1: RAW PARSER (Unchanged) ---
def parse_docx_raw(file_path):
    """Parses a docx file into a raw data structure without interpretation."""
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

# --- STEP 2: ADVANCED AI-BASED AGENT PARSER (Heavily Upgraded) ---
def parser_agent_analyze_layout(raw_structure, document_type):
    """
    Uses Gemini to perform a deep, component-based analysis of an educational document.
    """
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in .env")
    genai.configure(api_key=google_api_key)

    prompt = f"""
Anda adalah AI ahli dalam dekonstruksi dan analisis dokumen kurikulum pendidikan di Indonesia.
Tugas Anda adalah menganalisis struktur JSON mentah dari sebuah dokumen (`{document_type}`) dan mengubahnya menjadi sebuah template komponen JSON yang terstruktur dan cerdas. Jangan hanya mencari satu tabel; dekonstruksi seluruh dokumen menjadi komponen-komponen pedagogisnya.

# INPUT (Struktur Dokumen Mentah):
{json.dumps(raw_structure, indent=2)}

# KONTEKS:
- Tipe Dokumen untuk dianalisis: {document_type}
- Dokumen ini bisa berupa Modul Ajar, ATP (Alur Tujuan Pembelajaran), Prota (Program Tahunan), atau Promes (Program Semester).

# PERINTAH UTAMA:
Analisis input secara mendalam dan ekstrak komponen-komponen berikut. Jika sebuah komponen tidak ada, abaikan dari output. Hasilkan sebuah objek JSON tunggal dan valid sebagai output akhir.

# STRUKTUR KOMPONEN UNTUK DIEKSTRAK:

1.  **`metadata`**: Identifikasi informasi umum.
    - Cari: "Satuan Pendidikan", "Mata Pelajaran", "Fase / Kelas", "Penyusun", "Alokasi Waktu", dll.
    - Output: Objek key-value. `{{ "satuan_pendidikan": "...", "fase_kelas": "...", ... }}`

2.  **`main_structure`**: Komponen inti dokumen.
    - **Jika `Modul Ajar`**: Ini BUKAN tabel. Ini adalah serangkaian bagian. Identifikasi dan ekstrak:
        - `tujuan_pembelajaran`: Teks tujuan pembelajaran.
        - `pemahaman_bermakna`: Teks pemahaman bermakna.
        - `pertanyaan_pemantik`: Daftar pertanyaan pemantik.
        - `langkah_kegiatan`: Objek yang berisi `pendahuluan`, `inti`, dan `penutup`, lengkap dengan alokasi waktunya jika ada.
        - `materi_ajar`: Ringkasan atau daftar materi ajar.
    - **Jika `ATP`, `Prota`, atau `Promes`**: Ini kemungkinan besar adalah sebuah tabel utama.
        - `table_headers`: Sebuah objek yang memetakan key `snake_case` ke nama kolom asli. `{{ "no_atp": "NO. ATP", "tujuan_pembelajaran": "ATP", "alokasi_waktu_jp": "JP" }}`.
        - `placeholder_name`: Sebuah nama placeholder unik untuk daftar utama, cth: `DAFTAR_ATP`.

3.  **`assessment`**: Analisis bagian Asesmen atau Penilaian.
    - Identifikasi jenis-jenis asesmen yang disebutkan (Sikap, Pengetahuan, Keterampilan, Formatif, Sumatif).
    - Ekstrak deskripsi singkat atau contoh untuk setiap jenis asesmen.
    - Output: Objek yang berisi jenis asesmen sebagai key. `{{ "pengetahuan": {{ "teknik": "Tes Tulis", "contoh": "Jelaskan cara..." }}, "keterampilan": {{...}} }}`.

4.  **`supporting_elements`**: Ekstrak komponen pendukung.
    - `sumber_belajar_media`: Daftar sumber belajar, media, atau alat dan bahan.
    - `glosarium`: Daftar istilah dan definisinya.
    - `referensi`: Daftar referensi atau buku yang digunakan.

5.  **`language_style_analysis`**: Lakukan analisis gaya bahasa dari keseluruhan dokumen.
    - `tone`: Nada bahasa (cth: "Formal, instruksional, dan teknis").
    - `common_phrasing`: Pola kalimat yang berulang (cth: "Peserta didik dapat menunjukkan kemampuan...", "Guru meminta peserta didik untuk...").
    - `key_terms`: Istilah atau jargon pendidikan yang dominan (cth: "Profil Pelajar Pancasila", "Capaian Pembelajaran", "Regulasi Diri").

# FORMAT OUTPUT JSON FINAL (Contoh untuk Modul Ajar):
{{
  "document_type": "{document_type}",
  "components": [
    {{
      "component_type": "metadata",
      "data": {{
        "penyusun": "Nama Guru...",
        "jenjang_sekolah": "SD",
        "kelas": "IV",
        "alokasi_waktu": "3 x 35 Menit"
      }}
    }},
    {{
      "component_type": "main_structure",
      "data": {{
        "tujuan_pembelajaran": "Peserta didik melalui pembelajaran demonstrasi...",
        "langkah_kegiatan": {{
          "pendahuluan": {{ "durasi_menit": 15, "deskripsi": "Guru menyapa dan memberi salam..." }},
          "inti": {{ "durasi_menit": 75, "deskripsi": "Peserta didik menyimak informasi dan peragaan..." }},
          "penutup": {{ "durasi_menit": 15, "deskripsi": "Guru dan peserta didik melakukan refleksi..." }}
        }}
      }}
    }},
    {{
      "component_type": "assessment",
      "data": {{
        "sikap": {{ "deskripsi": "Penilaian Pengembangan Karakter (Dimensi Mandiri dan Gotong Royong)..." }},
        "pengetahuan": {{ "teknik": "Tes Tulis", "deskripsi": "Pilihan Ganda Dan Uraian..." }}
      }}
    }},
    {{
      "component_type": "language_style_analysis",
      "data": {{
        "tone": "Formal dan sangat terstruktur, menggunakan bahasa instruksional yang jelas.",
        "common_phrasing": "Guru meminta peserta didik untuk...",
        "key_terms": ["Kebugaran Jasmani", "Profil Pelajar Pancasila", "Asesmen"]
      }}
    }}
  ]
}}
"""

    try:
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config=generation_config)
        response = model.generate_content(prompt)
        
        return json.loads(response.text, strict=False)

    except Exception as e:
        print(f"[PARSER_AGENT_ERROR] Failed to analyze layout with AI: {e}")
        # Optionally log the prompt and raw_structure for debugging
        # print(f"Failed prompt: {prompt}")
        raise

# --- UPLOAD ROUTE (Unchanged from previous update) ---
@layout_bp.route('/upload', methods=['POST'])
@token_required
def upload_layout(current_user):
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
            raw_layout = parse_docx_raw(file_path)
            smart_template_json = parser_agent_analyze_layout(raw_layout, tipe_dokumen)

        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"msg": f"Error: AI failed to process the layout: {str(e)}"}), 500

        new_layout = Layout(
            jenjang=jenjang, mapel=mapel, tipe_dokumen=tipe_dokumen,
            layout_json=smart_template_json,
            uploaded_by=current_user.id, file_path=file_path
        )
        db.session.add(new_layout)
        db.session.commit()

        return jsonify({
            "msg": "Layout uploaded and successfully analyzed by AI into a smart template.",
            "layout_id": new_layout.id,
            "smart_template": smart_template_json
        }), 201

    return jsonify({"msg": "File type not allowed. Only .docx is supported."}), 400