# backend/app/models/school.py

from app.extensions import db
from sqlalchemy import Enum

class School(db.Model):
    __tablename__ = 'school'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    level = db.Column(
        Enum('SD/MI', 'SMP/MTs', 'SMA/MA', name='school_level_enum'),
        nullable=False
    )
    
    # Relasi ke semua staff yang terikat pada sekolah ini (termasuk admin)
    staff = db.relationship('User', back_populates='school', foreign_keys='User.school_id')
    
    # Relasi ke guru-guru yang mengajar di sekolah ini (dari tabel perantara)
    teachers = db.relationship('User', secondary='teacher_schools', back_populates='schools_taught')
    
    # Relasi ke kelas
    classes = db.relationship('Class', back_populates='school', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'level': self.level
        }

    def __repr__(self):
        return f'<School {self.name}>'