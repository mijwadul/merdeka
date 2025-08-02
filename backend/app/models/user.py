# backend/app/models/user.py

from app.extensions import db
from sqlalchemy import Enum

# Tabel perantara untuk hubungan Guru (User) dan Sekolah (School)
# Didefinisikan di sini karena paling relevan dengan User
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
    
    # Untuk School Admin, relasi one-to-one/many-to-one
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=True)
    school = db.relationship('School', back_populates='staff', foreign_keys=[school_id])
    
    # Untuk Teacher, relasi many-to-many
    schools_taught = db.relationship('School', secondary=teacher_schools_table, back_populates='teachers')

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