# backend/app/routes/generate_routes.py

from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from app.extensions import db
from app.utils.decorators import token_required
from app.models import Class, Book, Layout, Prota, User, Subject, Elemen, CP
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
        raise FileNotFoundError(
            f"Layout Prota untuk {subject_name} jenjang {jenjang} tidak ditemukan atau belum diproses."
        )
    
    return layout.layout_json

def get_book_topic_json(class_obj):
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

def writer_agent_generate_prota_items(smart_template, cp_data, book_topics, class_obj, user):
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key: raise ValueError("GOOGLE_API_KEY tidak ditemukan di .env")
    genai.configure(api_key=google_api_key)
    list_placeholder = smart_template.get('main_list_placeholder', 'DAFTAR_PROTA_UTAMA')
    item_structure = smart_template.get('item_structure', {})
    layout_example_text = """
    Contoh dari file layout yang harus ditiru:
    - Kolom yang harus dihasilkan: Unit, Alur Tujuan Pembelajaran, Alokasi Waktu, Semester.
    - Baris pertama sebuah Unit berisi judul Unit dan total Alokasi Waktu untuk unit tersebut (misal: "27 JP").
    - Baris-baris berikutnya dalam Unit yang sama berisi poin-poin Alur Tujuan Pembelajaran (ATP) yang dinomori. Kolom Alokasi Waktu di baris ini DIBIARKAN KOSONG.
    - Gaya penulisan ATP harus formal, contoh: '1.1 Peserta didik mampu memahami...', '1.2 Peserta didik mampu mengidentifikasi...'.
    """
    prompt = f"""
Anda adalah AI Asisten Guru yang sangat teliti dan patuh pada instruksi.
Tugas Anda adalah membuat draf Program Tahunan (Prota) dengan SECARA KETAT MENIRU STRUKTUR, FORMAT, DAN GAYA BAHASA dari contoh layout yang dideskripsikan di bawah. Gunakan data CP dan Buku Ajar hanya sebagai sumber konten.

# INPUT:
1.  **CONTOH FILE LAYOUT (MASTER TEMPLATE YANG HARUS DIIKUTI):**
    {layout_example_text}
    Struktur kolom JSON yang harus dihasilkan: {json.dumps(list(item_structure.keys()), indent=2)}

2.  **CAPAIAN PEMBELAJARAN (CP) - Sumber Tujuan:**
    {json.dumps(cp_data, indent=2)}

3.  **DAFTAR ISI BUKU AJAR - Sumber Materi:**
    {json.dumps(book_topics, indent=2)}

# PERINTAH WAJIB (HARUS DIIKUTI):
1.  **STRUKTUR TABEL**: Output JSON Anda harus bisa menghasilkan tabel dengan kolom `{', '.join(item_structure.values())}`. Jangan menambah, mengurangi, atau mengubah nama kolom ini.
2.  **KOLOM 'Unit'**: Untuk setiap topik utama dari buku, buat sebuah baris `Unit` yang deskriptif. Tuliskan nama Unit hanya di baris pertama. Biarkan kolom Unit di baris ATP berikutnya kosong.
3.  **KOLOM 'Alur Tujuan Pembelajaran' (PALING PENTING)**:
    - **JANGAN MERANGKUM**.
    - Untuk setiap `Unit`, Anda **WAJIB** menjabarkannya menjadi beberapa poin `Alur Tujuan Pembelajaran` (ATP) yang bernomor (misal: 1.1, 1.2, 2.1, dst.).
    - Setiap poin ATP **WAJIB** meniru gaya bahasa formal, yaitu dimulai dengan frasa seperti "**Peserta didik mampu memahami...**", "**Peserta didik mampu menganalisis...**", dll.
4.  **KOLOM 'Alokasi Waktu'**:
    - **JANGAN GUNAKAN RENTANG**.
    - Alokasi waktu adalah **satu angka total** untuk keseluruhan `Unit` dalam satuan JP. 1 JP adalah 35-45 menit, 
    - dalam satu minggu maksimal 4 jP kalkulasikan agar sesuai dengan jumlah efektif jam pelajaran selama satu tahun.
    - contoh penulisan 10 JP
    - Letakkan angka ini **HANYA** di baris pertama dari setiap `Unit` baru. Biarkan kolom alokasi waktu untuk baris-baris ATP di bawahnya **kosong**.
5.  Pastikan mendistribusikan semua materi ke dalam 2 semester secara rasional.    
6.  **KONSISTENSI**: Pastikan hasil akhir Anda secara visual dan struktural sangat mirip dengan contoh file layout yang dideskripsikan.

HASILKAN HANYA OBJEK JSON YANG VALID dengan kunci utama "{list_placeholder}" yang berisi sebuah array dari objek-objek.
"""
    try:
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-1.5-flash', generation_config=generation_config)
        response = model.generate_content(prompt)
        return json.loads(response.text, strict=False)
    except Exception as e:
        current_app.logger.error(f"[WRITER_AGENT_ERROR] Gagal saat generate Prota: {e}\nResponse Text: {response.text if 'response' in locals() else 'No response'}")
        raise ConnectionError(f"Gagal memproses respons dari API Gemini: {e}")

# ============================================================
# ============  RUTE API - NON STREAM  =======================
# ============================================================

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
        layout_structure = get_prota_layout(target_class)
        topics = get_book_topic_json(target_class)

        # === PERBAIKAN DI SINI: Membuat dictionary secara manual, bukan memanggil .to_dict() ===
        cp_objects = CP.query.join(Elemen).filter(Elemen.subject_id == target_class.subject_id).all()
        cp_data = [{
            'id': cp.id,
            'fase': cp.fase,
            'isi_cp': cp.isi_cp,
            'elemen': cp.elemen.nama_elemen if cp.elemen else None,
            'sumber_dokumen': cp.sumber_dokumen
        } for cp in cp_objects]
        # =======================================================================================

        generated_items_json = writer_agent_generate_prota_items(
            layout_structure, cp_data, topics, target_class, current_user
        )

        new_prota = Prota(
            user_id=current_user.id,
            mapel=target_class.subject.name,
            jenjang=str(target_class.grade_level),
            tahun_ajaran=get_current_academic_year(),
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
            yield f"data: {json.dumps({'progress': 5, 'status': '🚀 Starting AI Engine...'})}\n\n"
            time.sleep(1)

            yield f"data: {json.dumps({'progress': 10, 'status': '🔍 Validating class & permissions'})}\n\n"
            time.sleep(0.5)

            yield f"data: {json.dumps({'progress': 20, 'status': '📂 Fetching Layout Template'})}\n\n"
            layout_structure = get_prota_layout(target_class)
            time.sleep(0.5)

            yield f"data: {json.dumps({'progress': 40, 'status': '📖 Loading Book Topics'})}\n\n"
            topics = get_book_topic_json(target_class)
            time.sleep(0.5)

            # === PERBAIKAN DI SINI JUGA: Membuat dictionary secara manual ===
            cp_objects = CP.query.join(Elemen).filter(Elemen.subject_id == target_class.subject_id).all()
            cp_data = [{
                'id': cp.id,
                'fase': cp.fase,
                'isi_cp': cp.isi_cp,
                'elemen': cp.elemen.nama_elemen if cp.elemen else None,
                'sumber_dokumen': cp.sumber_dokumen
            } for cp in cp_objects]
            # ===============================================================

            yield f"data: {json.dumps({'progress': 60, 'status': '🤖 Starting AI Agents'})}\n\n"
            generated_items_json = writer_agent_generate_prota_items(
                layout_structure, cp_data, topics, target_class, current_user
            )

            yield f"data: {json.dumps({'progress': 90, 'status': '💾 Finalizing & Saving to Database'})}\n\n"
            new_prota = Prota(
                user_id=current_user.id,
                mapel=target_class.subject.name,
                jenjang=str(target_class.grade_level),
                tahun_ajaran=get_current_academic_year(),
                items_json=generated_items_json,
                status_validasi='draft'
            )
            db.session.add(new_prota)
            db.session.commit()

            yield f"data: {json.dumps({'progress': 100, 'status': '✅ Completed!', 'result': {'msg': 'Prota berhasil dibuat!', 'data': generated_items_json}})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': True, 'status': str(e), 'progress': 0})}\n\n"

    return Response(stream_with_context(event_stream()), mimetype='text/event-stream')