# backend/app/routes/generate_routes.py

from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from app.extensions import db
from app.utils.decorators import token_required
from app.models import Class, Book, Layout, Prota, User
import json
import os
import time
import google.generativeai as genai
from datetime import datetime

generator_bp = Blueprint('generator_bp', __name__)

# ============================================================
# ============  UTILITAS TAMBAHAN  ===========================
# ============================================================

def get_current_academic_year():
    """
    Tahun ajaran otomatis:
    - Jika bulan >= 7 (Juli–Des) → tahun ini/tahun depan
    - Jika bulan < 7 (Jan–Jun) → tahun lalu/tahun ini
    """
    now = datetime.now()
    year = now.year
    if now.month >= 7:
        return f"{year}/{year+1}"
    else:
        return f"{year-1}/{year}"

# ============================================================
# ============  AGENT-AGENT PEMBANTU  ========================
# ============================================================

def get_prota_layout(class_obj):
    """
    Layout Agent: Ambil layout_json untuk Prota berdasarkan jenjang dan mapel.
    """
    subject_name = class_obj.subject.name
    
    # Tentukan jenjang dari grade level
    if 1 <= class_obj.grade_level <= 6:
        jenjang = 'SD'
    elif 7 <= class_obj.grade_level <= 9:
        jenjang = 'SMP'
    elif 10 <= class_obj.grade_level <= 12:
        jenjang = 'SMA'
    else:
        raise ValueError("Grade level tidak valid.")

    # Ambil layout terbaru
    layout = Layout.query.filter_by(
        jenjang=jenjang,
        mapel=subject_name,
        tipe_dokumen='Prota'
    ).order_by(Layout.created_at.desc()).first()

    if not layout or not layout.layout_json:
        raise FileNotFoundError(
            f"Layout Prota untuk {subject_name} jenjang {jenjang} tidak ditemukan atau belum diproses."
        )
    
    return layout.layout_json

def get_book_topic_json(class_obj):
    """
    Content Agent: Ambil topic_json dari buku terbaru sesuai jenjang & mapel.
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
        raise FileNotFoundError(
            f"Buku ajar untuk {subject_name} jenjang {jenjang} tidak ditemukan atau belum selesai diproses (topic_json kosong)."
        )

    return book.topic_json

def writer_agent_generate_prota_items(smart_template, topics, class_obj, user):
    """
    Writer Agent: Menggunakan Google Gemini untuk membuat items Prota berbasis template.
    """
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY tidak ditemukan di file .env")
    genai.configure(api_key=google_api_key)

    list_placeholder = smart_template.get('main_list_placeholder', 'items')
    item_structure = smart_template.get('item_structure', {})

    prompt = f"""
Anda adalah AI ahli kurikulum yang sangat efisien.
Tugas Anda adalah membuat daftar (list) item untuk sebuah Program Tahunan (Prota) berdasarkan struktur item dan daftar topik yang diberikan.

# KONTEKS
- Mata Pelajaran: {class_obj.subject.name}
- Kelas: {class_obj.grade_level}

# INPUT
1. DAFTAR TOPIK DARI BUKU:
{json.dumps(topics, indent=2)}

2. STRUKTUR UNTUK SETIAP ITEM:
{json.dumps(item_structure, indent=2)}

# PERINTAH
1. Untuk setiap topik, buat sebuah objek JSON yang mengikuti STRUKTUR UNTUK SETIAP ITEM.
2. Isi setiap kolom (misalnya "Materi Pokok", "Semester", "Alokasi Waktu") dengan informasi dari topik.
3. Hasil akhir HARUS berupa objek JSON tunggal dengan satu kunci utama bernama "{list_placeholder}", yang nilainya adalah list semua item.
4. Jangan berikan teks di luar JSON.
"""

    try:
        print("[BACKEND-DEBUG] Mengirim request ke Google Gemini dengan template cerdas...")
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)
        
        response = model.generate_content(prompt)
        print("[BACKEND-DEBUG] Menerima respons dari Google Gemini.")

        return json.loads(response.text, strict=False)

    except Exception as e:
        print(f"[WRITER_AGENT_ERROR] Gagal saat generate dengan template cerdas: {e}")
        if 'response' in locals():
            print(f"[BACKEND-DEBUG] Teks mentah dari Gemini: {response.text}")
        raise ConnectionError(f"Gagal memproses respons dari API Gemini: {e}")

# ============================================================
# ============  RUTE API - NON STREAM  =======================
# ============================================================

@generator_bp.route('/api/wizard/generate/prota', methods=['POST'])
@token_required
def generate_prota_route(current_user):
    """
    Endpoint normal (langsung) untuk generate Prota.
    """
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
        layout_structure = get_prota_layout(target_class)
        topics = get_book_topic_json(target_class)
        generated_items_json = writer_agent_generate_prota_items(
            layout_structure, topics, target_class, current_user
        )

        new_prota = Prota(
            user_id=current_user.id,
            mapel=target_class.subject.name,
            jenjang=str(target_class.grade_level),
            tahun_ajaran=get_current_academic_year(),  # ✅ otomatis
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
        return jsonify({
            "msg": "Terjadi kesalahan internal saat membuat Prota.",
            "error": str(e)
        }), 500

# ============================================================
# ============  RUTE API - STREAMING SSE  ====================
# ============================================================

@generator_bp.route('/api/wizard/generate/prota/stream', methods=['GET'])
@token_required
def generate_prota_stream(current_user):
    """
    Endpoint streaming SSE untuk generate Prota dengan progress real-time.
    """

    class_id = request.args.get('class_id', type=int)
    if not class_id:
        return jsonify({"msg": "Class ID wajib diisi."}), 400

    target_class = Class.query.get(class_id)
    if not target_class:
        return jsonify({"msg": "Kelas tidak ditemukan."}), 404

    if target_class.teacher_id != current_user.id and current_user.role != 'Developer':
        return jsonify({"msg": "Anda tidak memiliki akses ke kelas ini."}), 403

    def event_stream():
        try:
            # 1. Starting
            yield f"data: {json.dumps({'progress': 5, 'status': '🚀 Starting AI Engine...'})}\n\n"
            time.sleep(1)

            # 2. Validasi class
            yield f"data: {json.dumps({'progress': 10, 'status': '🔍 Validating class & permissions'})}\n\n"
            time.sleep(0.5)

            # 3. Ambil layout
            yield f"data: {json.dumps({'progress': 20, 'status': '📂 Fetching Layout Template'})}\n\n"
            layout_structure = get_prota_layout(target_class)
            time.sleep(0.5)

            # 4. Ambil topik buku
            yield f"data: {json.dumps({'progress': 40, 'status': '📖 Loading Book Topics'})}\n\n"
            topics = get_book_topic_json(target_class)
            time.sleep(0.5)

            # 5. Hubungi Gemini
            yield f"data: {json.dumps({'progress': 60, 'status': '🤖 Starting AI Agents'})}\n\n"
            generated_items_json = writer_agent_generate_prota_items(
                layout_structure, topics, target_class, current_user
            )

            # 6. Simpan DB
            yield f"data: {json.dumps({'progress': 90, 'status': '💾 Finalizing & Saving to Database'})}\n\n"
            new_prota = Prota(
                user_id=current_user.id,
                mapel=target_class.subject.name,
                jenjang=str(target_class.grade_level),
                tahun_ajaran=get_current_academic_year(),  # ✅ otomatis
                items_json=generated_items_json,
                status_validasi='draft'
            )
            db.session.add(new_prota)
            db.session.commit()

            # 7. Selesai
            yield f"data: {json.dumps({'progress': 100, 'status': '✅ Completed!', 'result': {'msg': 'Prota berhasil dibuat!', 'data': generated_items_json}})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': True, 'status': str(e), 'progress': 0})}\n\n"

    return Response(stream_with_context(event_stream()), mimetype='text/event-stream')