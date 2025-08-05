# backend/app/routes/generate_routes.py

from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.utils.decorators import token_required
from app.models import Class, Book, Layout, Prota, User
import requests
import json
import os
import re
import google.generativeai as genai


generator_bp = Blueprint('generator_bp', __name__)

# --- AGENT-AGENT PEMBANTU ---

def get_prota_layout(class_obj):
    """
    Layout Agent: Mengambil layout_json untuk Prota berdasarkan jenjang dan mapel.
    """
    subject_name = class_obj.subject.name
    
    if 1 <= class_obj.grade_level <= 6:
        jenjang = 'SD'
    elif 7 <= class_obj.grade_level <= 9:
        jenjang = 'SMP'
    elif 10 <= class_obj.grade_level <= 12:
        jenjang = 'SMA'
    else:
        raise ValueError("Grade level tidak valid.")

    layout = Layout.query.filter_by(
        jenjang=jenjang,
        mapel=subject_name,
        tipe_dokumen='Prota'
    ).order_by(Layout.created_at.desc()).first()

    if not layout or not layout.layout_json:
        raise FileNotFoundError(f"Layout Prota untuk {subject_name} jenjang {jenjang} tidak ditemukan atau belum diproses.")
    
    return layout.layout_json

def get_book_topic_json(class_obj):
    """
    Content Agent (part 1): Mengambil topic_json dari buku yang relevan.
    """
    subject_name = class_obj.subject.name

    if 1 <= class_obj.grade_level <= 6:
        jenjang = 'SD'
    elif 7 <= class_obj.grade_level <= 9:
        jenjang = 'SMP'
    elif 10 <= class_obj.grade_level <= 12:
        jenjang = 'SMA'
    else:
        raise ValueError("Grade level tidak valid.")
        
    book = Book.query.filter_by(
        jenjang=jenjang,
        mapel=subject_name,
    ).order_by(Book.created_at.desc()).first()

    if not book or not book.topic_json or not book.topic_json.get("chapters"):
        raise FileNotFoundError(f"Buku ajar untuk {subject_name} jenjang {jenjang} tidak ditemukan atau belum selesai diproses (topic_json kosong).")

    return book.topic_json

def writer_agent_generate_prota_items(smart_template, topics, class_obj, user):
    """
    Writer Agent (Versi 5.0): Menggunakan template cerdas untuk menghasilkan daftar item.
    """
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY tidak ditemukan di file .env")
    genai.configure(api_key=google_api_key)

    # Mengambil instruksi dari template cerdas
    list_placeholder = smart_template.get('main_list_placeholder', 'items')
    item_structure = smart_template.get('item_structure', {})

    prompt = f"""
Anda adalah AI ahli kurikulum yang sangat efisien.
Tugas Anda adalah membuat daftar (list) item untuk sebuah Program Tahunan (Prota) berdasarkan struktur item dan daftar topik yang diberikan.

# KONTEKS
- Mata Pelajaran: {class_obj.subject.name}
- Kelas: {class_obj.grade_level}

# INPUT
1. DAFTAR TOPIK DARI BUKU (Konten yang harus diproses):
{json.dumps(topics, indent=2)}

2. STRUKTUR UNTUK SETIAP ITEM (Gunakan ini sebagai format untuk setiap topik):
{json.dumps(item_structure, indent=2)}

# PERINTAH
1. Untuk setiap topik dalam `DAFTAR TOPIK DARI BUKU`, buat sebuah objek JSON yang mengikuti `STRUKTUR UNTUK SETIAP ITEM`.
2. Isi setiap kolom (seperti "Materi Pokok", "Semester", dll.) dengan informasi yang relevan dari topik tersebut.
3. Berikan estimasi "Alokasi Waktu" yang logis untuk setiap topik dalam satuan Jam Pelajaran (JP).
4. Hasil akhir HARUS berupa objek JSON tunggal dengan satu kunci utama bernama "{list_placeholder}", yang nilainya adalah sebuah array (list) dari semua item yang telah Anda buat.

Contoh Output yang Diharapkan:
{{
  "{list_placeholder}": [
    {{
      "materi_pokok": "Topik Pertama",
      "alokasi_waktu": "12 JP",
      "semester": 1
    }},
    {{
      "materi_pokok": "Topik Kedua",
      "alokasi_waktu": "15 JP",
      "semester": 1
    }}
  ]
}}

Pastikan output Anda HANYA berupa objek JSON yang valid tanpa teks tambahan.
"""

    try:
        print("[BACKEND-DEBUG] Mengirim request ke Google Gemini dengan template cerdas...")
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        # Menggunakan nama model yang sudah dikonfirmasi
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)
        
        response = model.generate_content(prompt)
        print("[BACKEND-DEBUG] Menerima respons dari Google Gemini.")

        # Parser JSON yang toleran tetap kita pertahankan untuk keamanan
        return json.loads(response.text, strict=False)

    except Exception as e:
        print(f"[WRITER_AGENT_ERROR] Gagal saat generate dengan template cerdas: {e}")
        if 'response' in locals():
            print(f"[BACKEND-DEBUG] Teks mentah dari Gemini: {response.text}")
        raise ConnectionError(f"Gagal memproses respons dari API Gemini: {e}")


# --- RUTE API UTAMA UNTUK WIZARD ---
@generator_bp.route('/api/wizard/generate/prota', methods=['POST'])
@token_required
def generate_prota_route(current_user):
    data = request.get_json()
    class_id = data.get('class_id')

    if not class_id:
        return jsonify({"msg": "Class ID wajib diisi."}), 400

    target_class = Class.query.get(class_id)
    if not target_class:
        return jsonify({"msg": "Kelas tidak ditemukan."}), 404
    
    if target_class.teacher_id != current_user.id and current_user.role != 'Developer':
        return jsonify({"msg": "Anda tidak memiliki akses ke kelas ini."}), 403

    try:
        # TAHAP ORKESTRASI SUPERVISOR AGENT
        layout_structure = get_prota_layout(target_class)
        topics = get_book_topic_json(target_class)
        generated_items_json = writer_agent_generate_prota_items(
            layout_structure, topics, target_class, current_user
        )

        # Simpan Prota baru ke Database
        new_prota = Prota(
            user_id=current_user.id,
            mapel=target_class.subject.name,
            jenjang=str(target_class.grade_level),
            tahun_ajaran="2024/2025",
            items_json=generated_items_json,
            status_validasi='draft'
        )
        db.session.add(new_prota)
        db.session.commit()

        return jsonify({
            "msg": f"Prota untuk {target_class.subject.name} kelas {target_class.grade_level} berhasil dibuat!",
            "prota_id": new_prota.id,
            "data": new_prota.items_json
        }), 201

    except (FileNotFoundError, ValueError, ConnectionError) as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error generating Prota: {e}")
        return jsonify({"msg": "Terjadi kesalahan internal saat membuat Prota.", "error": str(e)}), 500