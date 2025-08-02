# backend/app/routes/generate_routes.py

from flask import Blueprint, request, jsonify
from app.services.rag_service import search_index
from app.services.ai_service import generate_content_with_context
from app.utils.decorators import token_required
from app.models import Class, Subject, GeneratedDocument
from app.extensions import db
from app.services.agent_service import generate_document_with_agents
from sqlalchemy import distinct
import json
from io import BytesIO
from flask import send_file
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
import re

# Menggunakan satu blueprint untuk semua rute terkait generator
generator_bp = Blueprint('generator_bp', __name__)

# --- FUNGSI LAMA (Sekarang di bawah blueprint yang benar) ---
@generator_bp.route('/api/generate', methods=['POST'])
@token_required # Sebaiknya endpoint ini juga diamankan
def generate(current_user):
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({"error": "Query is required."}), 400

    query = data['query']
    context_chunks = search_index(query)

    if not context_chunks:
        return jsonify({"error": "Could not find relevant context in the uploaded documents."}), 404

    generated_content = generate_content_with_context(query, context_chunks)
    return jsonify({"content": generated_content}), 200

# --- FUNGSI BARU 1: Endpoint untuk Data Form ---
@generator_bp.route('/api/generator/form-data', methods=['GET'])
@token_required
def get_generator_form_data(current_user):
    if current_user.role == 'Teacher':
        classes_taught = Class.query.filter_by(teacher_id=current_user.id).all()
        unique_subjects = {cls.subject for cls in classes_taught if cls.subject}
        subjects = sorted([s.to_dict() for s in unique_subjects], key=lambda x: x['name'])
        grades = sorted(list(set([cls.grade_level for cls in classes_taught])))
        
        return jsonify({
            'subjects': subjects,
            'classes': grades
        })

    elif current_user.role == 'Developer':
        all_subjects = Subject.query.order_by(Subject.name).all()
        return jsonify({
            'subjects': [s.to_dict() for s in all_subjects],
            'classes': []
        })
        
    return jsonify({"error": "Access Denied"}), 403

# --- FUNGSI BARU 2: Endpoint untuk Generator Berbasis Agen ---
@generator_bp.route('/api/generate/document-agent', methods=['POST'])
@token_required
def generate_document_agent(current_user):
    data = request.get_json()
    kelas = data.get('kelas')
    mapel_id = data.get('mapel')
    jenis = data.get('jenis')
    topik = data.get('topik')

    if not all([kelas, mapel_id, jenis, topik]):
        return jsonify({"error": "Data tidak lengkap: kelas, mapel, jenis, dan topik dibutuhkan."}), 400

    subject = Subject.query.get(mapel_id)
    if not subject:
        return jsonify({"error": "Mata pelajaran tidak ditemukan."}), 404
    
    try:
        final_document = generate_document_with_agents(str(kelas), subject.name, jenis, topik)
        return jsonify({"text": final_document})
    except Exception as e:
        print(f"Error during agent generation: {e}")
        return jsonify({"error": "Gagal menghasilkan dokumen. Terjadi kesalahan pada sistem agen AI."}), 500

# --- FUNGSI BARU 3: Endpoint untuk Menyimpan Dokumen ---
@generator_bp.route('/api/docs/save', methods=['POST'])
@token_required
def save_generated_document(current_user):
    data = request.get_json()
    title = f"{data.get('jenis')} {data.get('mapel')} Kelas {data.get('kelas')} - {data.get('topik')}"
    new_doc = GeneratedDocument(
        title=title,
        document_type=data.get('jenis'),
        subject=data.get('mapel'),
        grade_level=data.get('kelas'),
        content=data.get('content'),
        created_by_id=current_user.id
    )
    db.session.add(new_doc)
    db.session.commit()
    return jsonify({"message": "Dokumen berhasil disimpan!", "document": new_doc.to_dict()}), 201

# --- FUNGSI BARU 4: Endpoint untuk Mengambil Daftar Dokumen ---
@generator_bp.route('/api/docs', methods=['GET'])
@token_required
def get_saved_documents(current_user):
    documents = GeneratedDocument.query.filter_by(created_by_id=current_user.id).order_by(GeneratedDocument.created_at.desc()).all()
    return jsonify([doc.to_dict() for doc in documents])

# --- FUNGSI BARU 5: Endpoint untuk Download PDF ---
@generator_bp.route('/api/docs/download-pdf', methods=['POST'])
@token_required
def download_document_as_pdf(current_user):
    data = request.get_json()
    content = data.get('content', '')
    title = data.get('title', 'Dokumen GatraSinau.AI')

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph(title, styles['h1']))
    story.append(Spacer(1, 0.2 * inch))

    lines = content.split('\n')
    for line in lines:
        line_formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
        p = Paragraph(line_formatted, styles['BodyText'])
        story.append(p)

    doc.build(story)
    buffer.seek(0)
    safe_filename = "".join([c for c in title if c.isalpha() or c.isdigit() or c == ' ']).rstrip() + ".pdf"

    return send_file(
        buffer,
        as_attachment=True,
        download_name=safe_filename,
        mimetype='application/pdf'
    )

@generator_bp.route('/api/docs/<int:doc_id>', methods=['GET'])
@token_required
def get_saved_document(current_user, doc_id):
    # Ambil dokumen berdasarkan ID dan pastikan pemiliknya adalah user yang sedang login
    doc = GeneratedDocument.query.filter_by(id=doc_id, created_by_id=current_user.id).first_or_404()
    return jsonify(doc.to_dict())
