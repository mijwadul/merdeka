# backend/app/models/aimodels.py

from app.extensions import db
from sqlalchemy import Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.sql import func

# ============================================================
# TABEL KONTEN DASAR (TERKAIT DENGAN USER)
# ============================================================

class Layout(db.Model):
    __tablename__ = 'layouts'
    id = db.Column(db.Integer, primary_key=True)
    jenjang = db.Column(db.String(50), nullable=False)
    mapel = db.Column(db.String(100), nullable=False)
    tipe_dokumen = db.Column(db.String(50), nullable=False)
    layout_json = db.Column(JSON, nullable=False)
    file_path = db.Column(db.String(255), nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(20), default='aktif')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    uploader = db.relationship('User', back_populates='layouts')

class Book(db.Model):
    __tablename__ = 'books'
    id = db.Column(db.Integer, primary_key=True)
    judul_buku = db.Column(db.String(255), nullable=False)
    jenjang = db.Column(db.String(50), nullable=False)
    mapel = db.Column(db.String(100), nullable=False)
    penulis = db.Column(db.String(255))
    tahun_terbit = db.Column(db.Integer)
    file_path = db.Column(db.String(255), nullable=False)
    topic_json = db.Column(JSON, nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    media_assets = db.relationship('MediaAsset', backref='book', lazy=True, cascade="all, delete-orphan")
    uploader = db.relationship('User', back_populates='books')

class MediaAsset(db.Model):
    __tablename__ = 'media_assets'
    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), nullable=False)
    tipe_media = db.Column(db.String(20), nullable=False)
    caption = db.Column(Text)
    halaman = db.Column(db.Integer)
    topik_terkait = db.Column(db.String(255))
    file_path = db.Column(db.String(255), nullable=False)
    resolusi = db.Column(db.String(50))
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    soal = db.relationship('Soal', backref='media_asset', lazy=True)

# ============================================================
# TABEL BARU DAN YANG DIPERBAIKI (CP, Elemen, ATP)
# ============================================================

class Elemen(db.Model):
    """Tabel master untuk elemen-elemen per mata pelajaran."""
    __tablename__ = 'elemen'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, ForeignKey('subjects.id'), nullable=False)
    nama_elemen = db.Column(db.String(255), nullable=False)
    kode_elemen = db.Column(db.String(20), nullable=True)
    deskripsi = db.Column(Text, nullable=True)
    
    subject = relationship('Subject', back_populates='elements')
    cps = relationship('CP', back_populates='elemen', cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Elemen {self.nama_elemen}>'

class CP(db.Model):
    """Model CP baru yang terstruktur dan relasional."""
    __tablename__ = 'cp'
    id = db.Column(db.Integer, primary_key=True)
    elemen_id = db.Column(db.Integer, ForeignKey('elemen.id'), nullable=False)
    fase = db.Column(Enum('A', 'B', 'C', 'D', 'E', 'F', name='fase_cp_enum'), nullable=False)
    isi_cp = db.Column(Text, nullable=False)
    sumber_dokumen = db.Column(db.String(255), nullable=True)
    uploaded_by_id = db.Column(db.Integer, ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())

    elemen = relationship('Elemen', back_populates='cps')
    uploader = relationship('User')
    atps = relationship('Atp', back_populates='cp', lazy=True) # Relasi balik ke ATP

    def __repr__(self):
        return f'<CP Fase {self.fase} - {self.elemen.nama_elemen}>'

# ============================================================
# TABEL INTI KURIKULUM (LANJUTAN ALUR WIZARD)
# ============================================================

class Prota(db.Model):
    __tablename__ = 'prota'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    mapel = db.Column(db.String(100), nullable=False) # CATATAN: bisa direlasi ke Subject di masa depan
    jenjang = db.Column(db.String(50), nullable=False)
    tahun_ajaran = db.Column(db.String(20), nullable=False)
    items_json = db.Column(JSON)
    status_validasi = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP, server_default=func.now(), onupdate=func.now())
    promes = db.relationship('Promes', backref='prota', lazy=True, cascade="all, delete-orphan")
    user = db.relationship('User', back_populates='prota')

class Promes(db.Model):
    __tablename__ = 'promes'
    id = db.Column(db.Integer, primary_key=True)
    prota_id = db.Column(db.Integer, db.ForeignKey('prota.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    minggu_ke = db.Column(db.Integer, nullable=False)
    topik = db.Column(db.Text)
    status_validasi = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP, server_default=func.now(), onupdate=func.now())
    atp = db.relationship('Atp', backref='promes', lazy=True, cascade="all, delete-orphan")

class Atp(db.Model):
    __tablename__ = 'atp'
    id = db.Column(db.Integer, primary_key=True)
    promes_id = db.Column(db.Integer, db.ForeignKey('promes.id'), nullable=True)
    
    # --- PERBAIKAN UTAMA ---
    # Menghubungkan ATP ke CP dengan Foreign Key, bukan string
    cp_id = db.Column(db.Integer, db.ForeignKey('cp.id'), nullable=False)
    
    tujuan_pembelajaran = db.Column(db.Text, nullable=False)
    indikator_pencapaian = db.Column(db.Text)
    status_validasi = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    cp = relationship('CP', back_populates='atps') # Relasi ke CP
    modul_ajar = db.relationship('ModulAjar', backref='atp', lazy=True, cascade="all, delete-orphan")

class ModulAjar(db.Model):
    __tablename__ = 'modul_ajar'
    id = db.Column(db.Integer, primary_key=True)
    atp_id = db.Column(db.Integer, db.ForeignKey('atp.id'), nullable=False)
    judul_modul = db.Column(db.String(255), nullable=False)
    komponen_modul = db.Column(JSON)
    status_validasi = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP, server_default=func.now(), onupdate=func.now())
    soal = db.relationship('Soal', backref='modul_ajar', lazy=True, cascade="all, delete-orphan")

class Soal(db.Model):
    __tablename__ = 'soal'
    id = db.Column(db.Integer, primary_key=True)
    modul_ajar_id = db.Column(db.Integer, db.ForeignKey('modul_ajar.id'), nullable=False)
    media_asset_id = db.Column(db.Integer, db.ForeignKey('media_assets.id'), nullable=True)
    teks_soal = db.Column(db.Text, nullable=False)
    kunci_jawaban = db.Column(db.Text)
    rubrik_penilaian = db.Column(JSON)
    tipe_soal = db.Column(db.String(50))
    status_validasi = db.Column(db.String(20), default='draft')
    created_at = db.Column(db.TIMESTAMP, server_default=func.now())
    updated_at = db.Column(db.TIMESTAMP, server_default=func.now(), onupdate=func.now())