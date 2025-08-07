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

def save_ai_generation_to_db(ai_json_output: dict, current_user: User, target_class, db_session):
    """
    Menyimpan hasil generate AI (Prota) ke dalam database secara terpusat.
    """
    if not ai_json_output:
        raise ValueError("Input JSON dari AI tidak boleh kosong.")

    try:
        tahun_ajaran = get_current_academic_year()
        new_prota = Prota(
            user_id=current_user.id,
            mapel=target_class.subject.name,
            jenjang=str(target_class.grade_level),
            tahun_ajaran=tahun_ajaran,
            items_json=ai_json_output,
            status_validasi='draft'
        )
        db_session.add(new_prota)
        db_session.commit()
        current_app.logger.info(f"✅ Prota baru berhasil disimpan dengan ID: {new_prota.id} untuk user {current_user.email}")
        return new_prota
    except Exception as e:
        db_session.rollback()
        current_app.logger.error(f"❌ Gagal menyimpan Prota ke database: {e}")
        raise e

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

def writer_agent_generate_prota_items(smart_template, cp_data, book_topics, class_obj, current_user):
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY tidak ditemukan di .env")
    
    genai.configure(api_key=google_api_key)

    def get_fase_from_grade(grade_level):
        if grade_level in [1, 2]: return 'A'
        if grade_level in [3, 4]: return 'B'
        if grade_level in [5, 6]: return 'C'
        if grade_level in [7, 8, 9]: return 'D'
        if grade_level == 10: return 'E'
        if grade_level in [11, 12]: return 'F'
        return None

    correct_fase = get_fase_from_grade(class_obj.grade_level)
    if not correct_fase:
        raise ValueError(f"Tingkat kelas {class_obj.grade_level} tidak valid untuk Kurikulum Merdeka.")

    filtered_cp_data = [cp for cp in cp_data if cp.get('fase') == correct_fase]
    if not filtered_cp_data:
        raise FileNotFoundError(f"Data Capaian Pembelajaran (CP) untuk Fase {correct_fase} mata pelajaran ini tidak ditemukan di database.")

    list_placeholder = smart_template.get('main_list_placeholder', 'DAFTAR_PROTA_UTAMA')
    kelas = str(class_obj.grade_level)
    tahun_ajaran = get_current_academic_year()
    mapel = class_obj.subject.name
    
    prompt = f"""
Anda adalah asisten ahli dalam pembuatan dokumen kurikulum pendidikan di Indonesia.
Tugas Anda adalah membuat Program Tahunan (Prota) Kurikulum Merdeka dalam format JSON yang terstruktur dengan baik dan akurat.

## ❗️ PERINTAH UTAMA
Buatkan Prota untuk mata pelajaran **{mapel}**, Kelas **{kelas}**, Fase **{correct_fase}**, untuk Tahun Ajaran **{tahun_ajaran}**.

## 📥 DATA INPUT
1.  **Capaian Pembelajaran (CP) untuk Fase {correct_fase}**:
    {json.dumps(filtered_cp_data, indent=2)}

2.  **Daftar Isi Buku Ajar (Referensi Materi)**:
    {json.dumps(book_topics, indent=2)}

## 📝 STRUKTUR OUTPUT JSON YANG DIINGINKAN
Hasilkan JSON dengan DUA kunci utama: "document_structure" dan "{list_placeholder}".

1.  **`document_structure`**: Harus berisi metadata dokumen.
    - `Judul`: "PROGRAM TAHUNAN KURIKULUM MERDEKA"
    - `Identitas Dokumen`: Sebuah objek berisi:
        - `Mata Pelajaran`: "{mapel}"
        - `Kelas`: "{kelas}"
        - `Fase`: "{correct_fase}"
        - `Tahun Ajaran`: "{tahun_ajaran}"
        - `Sekolah`: "[Nama Sekolah Anda]"
    - `Capaian Pembelajaran Umum`: Paragraf ringkasan capaian fase dari data CP yang diberikan.
    - `Elemen Capaian Pembelajaran`: Array objek, masing-masing berisi `Elemen` dan `Deskripsi`.

2.  **`{list_placeholder}`**: Harus berupa **Array of Objects**, di mana SETIAP objek mewakili SATU unit pembelajaran.
    - **Struktur setiap objek dalam array WAJIB mengikuti format ini**:
        - `Unit` (string): Judul unit (misal: "Unit 1: Permainan Bola Besar").
        - `Alur Tujuan Pembelajaran` (string): Daftar ATP untuk unit tersebut, dipisahkan oleh newline (\\n). Setiap ATP harus diawali nomor (misal: "1.1 ...\\n1.2 ...").
        - `Alokasi Waktu` (string): Total alokasi Jam Pelajaran untuk unit itu (misal: "12 JP").
        - `Semester` (string): "Ganjil" atau "Genap".
    
    - **CONTOH STRUKTUR `{list_placeholder}` YANG BENAR**:
      ```json
      [
        {{
          "Unit": "Unit 1: Aktivitas Permainan Bola Besar",
          "Alur Tujuan Pembelajaran": "1.1 Peserta didik mampu menirukan pola gerak dasar lokomotor...\\n1.2 Peserta didik mampu menirukan pola gerak dasar non-lokomotor...",
          "Alokasi Waktu": "12 JP",
          "Semester": "Ganjil"
        }},
        {{
          "Unit": "Unit 2: Aktivitas Permainan Bola Kecil",
          "Alur Tujuan Pembelajaran": "2.1 Peserta didik mampu menirukan pola gerak dasar melempar...",
          "Alokasi Waktu": "12 JP",
          "Semester": "Ganjil"
        }}
      ]
      ```

## ⚠️ ATURAN KETAT
- **KONSISTENSI DATA**: Pastikan `Kelas`, `Fase`, dan `Tahun Ajaran` di dalam output JSON **sesuai persis** dengan yang saya perintahkan di bagian PERINTAH UTAMA.
- **STRUKTUR TABEL**: **JANGAN** membuat baris terpisah untuk judul Unit dan ATP-nya. Gabungkan semua informasi tersebut ke dalam satu objek JSON per unit, sesuai contoh. Kegagalan mengikuti struktur ini akan membuat output tidak valid.
- **BAHASA**: Gunakan bahasa Indonesia yang formal dan sesuai standar pendidikan.
"""
    try:
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config=generation_config)
        
        current_app.logger.info(f"Sending structured prompt to AI for Class {kelas}, Fase {correct_fase}.")
        response = model.generate_content(prompt)
        
        return json.loads(response.text, strict=False)
    except Exception as e:
        current_app.logger.error(f"[WRITER_AGENT_ERROR] Gagal saat generate Prota: {e}")
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
        cp_objects = CP.query.join(Elemen).filter(Elemen.subject_id == target_class.subject_id).all()
        cp_data = [{'id': cp.id, 'fase': cp.fase, 'isi_cp': cp.isi_cp, 'elemen': cp.elemen.nama_elemen if cp.elemen else None, 'sumber_dokumen': cp.sumber_dokumen} for cp in cp_objects]

        generated_items_json = writer_agent_generate_prota_items(
            layout_structure, cp_data, topics, target_class, current_user
        )

        new_prota = save_ai_generation_to_db(
            ai_json_output=generated_items_json,
            current_user=current_user,
            target_class=target_class,
            db_session=db.session
        )
        
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

            cp_objects = CP.query.join(Elemen).filter(Elemen.subject_id == target_class.subject_id).all()
            cp_data = [{'id': cp.id, 'fase': cp.fase, 'isi_cp': cp.isi_cp, 'elemen': cp.elemen.nama_elemen if cp.elemen else None, 'sumber_dokumen': cp.sumber_dokumen} for cp in cp_objects]

            yield f"data: {json.dumps({'progress': 60, 'status': '🤖 Starting AI Agents'})}\n\n"
            generated_items_json = writer_agent_generate_prota_items(
                layout_structure, cp_data, topics, target_class, current_user
            )

            yield f"data: {json.dumps({'progress': 90, 'status': '💾 Finalizing & Saving to Database'})}\n\n"
            
            save_ai_generation_to_db(
                ai_json_output=generated_items_json,
                current_user=current_user,
                target_class=target_class,
                db_session=db.session
            )
            
            yield f"data: {json.dumps({'progress': 100, 'status': '✅ Completed!', 'result': {'msg': 'Prota berhasil dibuat!', 'data': generated_items_json}})}\n\n"

        except Exception as e:
            current_app.logger.error(f"Error dalam stream: {str(e)}")
            yield f"data: {json.dumps({'error': True, 'status': str(e), 'progress': 0})}\n\n"

    return Response(stream_with_context(event_stream()), mimetype='text/event-stream')