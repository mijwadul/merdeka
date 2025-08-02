from app.extensions import db
import datetime

class GeneratedDocument(db.Model):
    __tablename__ = 'generated_document'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    document_type = db.Column(db.String(50), nullable=False) # Contoh: Modul Ajar, RPP, dll.
    subject = db.Column(db.String(100), nullable=False)
    grade_level = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    # Relasi untuk menghubungkan dokumen ini dengan pengguna yang membuatnya
    creator = db.relationship('User')

    def to_dict(self):
        """Mengubah objek menjadi format dictionary yang mudah diubah ke JSON."""
        return {
            'id': self.id,
            'title': self.title,
            'document_type': self.document_type,
            'subject': self.subject,
            'grade_level': self.grade_level,
            'content': self.content,
            'creator_username': self.creator.username if self.creator else None,
            'created_at': self.created_at.isoformat()
        }