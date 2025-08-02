# backend/app/models/user.py

from app.extensions import db
from sqlalchemy import Enum

# Tabel perantara untuk hubungan Guru (User) dan Sekolah (School)
teacher_schools_table = db.Table('teacher_schools',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('school_id', db.Integer, db.ForeignKey('school.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(
        Enum('Developer', 'School Admin', 'Teacher', name='user_role_enum'),
        default='Teacher',
        nullable=False
    )
    
    # Relasi ke Sekolah
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=True)
    school = db.relationship('School', back_populates='staff', foreign_keys=[school_id])
    schools_taught = db.relationship('School', secondary=teacher_schools_table, back_populates='teachers')

    # === RELASI KE MODEL-MODEL KURIKULUM AI (TAMBAHAN) ===
    layouts = db.relationship('Layout', backref='uploader', lazy=True)
    books = db.relationship('Book', backref='uploader', lazy=True)
    prota = db.relationship('Prota', backref='user', lazy=True)
    # ======================================================

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'school_id': self.school_id
        }

    def __repr__(self):
        return f'<User {self.username}>'