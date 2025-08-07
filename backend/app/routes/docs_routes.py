from flask import Blueprint, jsonify, request, current_app
from app.extensions import db
from app.utils.decorators import token_required
from app.models import Prota, User # Nantinya bisa ditambah Promes, ModulAjar, dll.

docs_bp = Blueprint('docs_bp', __name__)

# ✅ (R)EAD - Rute untuk mendapatkan daftar semua dokumen pengguna
@docs_bp.route('/api/docs', methods=['GET'])
@token_required
def get_user_documents(current_user: User):
    """
    Mengambil daftar semua dokumen (Prota, Promes, dll) yang dimiliki oleh pengguna.
    Hasilnya disatukan dalam satu list untuk ditampilkan di frontend.
    """
    documents = []
    
    # 1. Ambil semua Prota
    protas = Prota.query.filter_by(user_id=current_user.id).order_by(Prota.created_at.desc()).all()
    for prota in protas:
        # Membuat judul yang lebih informatif dari data JSON jika memungkinkan
        title = f"Prota: {prota.mapel} Kelas {prota.jenjang}"
        if prota.items_json and 'document_structure' in prota.items_json:
            title = prota.items_json['document_structure'].get('Judul', title)
        
        documents.append({
            'id': prota.id,
            'doc_model': 'prota', # Menandakan model asal data
            'title': title,
            'subject': prota.mapel,
            'grade_level': prota.jenjang,
            'document_type': 'Program Tahunan (Prota)',
            'created_at': prota.created_at.isoformat()
        })
        
    # Nanti bisa ditambahkan untuk Promes, ModulAjar, dll. di sini
    # proms = Promes.query.filter_by(...)
    # for prom in proms:
    #   documents.append(...)
            
    return jsonify(documents)

# ✅ (R)EAD - Rute untuk mendapatkan detail satu dokumen Prota
@docs_bp.route('/api/docs/prota/<int:prota_id>', methods=['GET'])
@token_required
def get_prota_detail(current_user: User, prota_id: int):
    """Mengambil detail konten dari satu dokumen Prota."""
    prota = Prota.query.get_or_404(prota_id)
    
    if prota.user_id != current_user.id:
        return jsonify({"msg": "Akses ditolak"}), 403
        
    return jsonify(prota.items_json)

# ✅ (U)PDATE - Rute untuk memperbarui dokumen Prota
@docs_bp.route('/api/docs/prota/<int:prota_id>', methods=['PUT'])
@token_required
def update_prota_detail(current_user: User, prota_id: int):
    """Memperbarui konten JSON dari sebuah Prota."""
    prota = Prota.query.get_or_404(prota_id)
    
    if prota.user_id != current_user.id:
        return jsonify({"msg": "Akses ditolak"}), 403
        
    updated_json = request.get_json()
    if not updated_json:
        return jsonify({"msg": "Request body tidak boleh kosong"}), 400
        
    prota.items_json = updated_json
    db.session.commit()
    
    return jsonify({"msg": "Dokumen berhasil diperbarui."}), 200

# ✅ (D)ELETE - Rute untuk menghapus dokumen Prota
@docs_bp.route('/api/docs/prota/<int:prota_id>', methods=['DELETE'])
@token_required
def delete_prota(current_user: User, prota_id: int):
    """Menghapus sebuah dokumen Prota."""
    prota = Prota.query.get_or_404(prota_id)
    
    if prota.user_id != current_user.id:
        return jsonify({"msg": "Akses ditolak"}), 403
        
    db.session.delete(prota)
    db.session.commit()
    
    return jsonify({"msg": "Dokumen berhasil dihapus."}), 200