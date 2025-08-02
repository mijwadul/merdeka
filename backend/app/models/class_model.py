# backend/app/models/class_model.py

from app.extensions import db

class Class(db.Model):
    __tablename__ = 'classes'  # Mengganti nama tabel menjadi 'classes' (plural)
    
    id = db.Column(db.Integer, primary_key=True)
    grade_level = db.Column(db.Integer, nullable=False) # e.g., 1, 7, 10
    parallel_class = db.Column(db.String(10), nullable=False) # e.g., 'A', 'B'
    
    # Foreign Keys
    school_id = db.Column(db.Integer, db.ForeignKey('school.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    school = db.relationship('School', back_populates='classes')
    subject = db.relationship('Subject')
    teacher = db.relationship('User')

    # Serializer untuk mengubah objek menjadi dictionary (untuk JSON response)
    def to_dict(self):
        return {
            'id': self.id,
            'class_name': f'{self.grade_level} - {self.parallel_class}',
            'grade_level': self.grade_level,
            'parallel_class': self.parallel_class,
            'school': self.school.name if self.school else None,
            'subject': self.subject.name if self.subject else None,
            'teacher': self.teacher.username if self.teacher else None
        }

    def __repr__(self):
        return f'<Class {self.grade_level} - {self.parallel_class}>'