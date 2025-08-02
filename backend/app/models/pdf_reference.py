from app.extensions import db
from sqlalchemy import Enum, Text
import datetime

class PDFReference(db.Model):
    __tablename__ = 'pdf_reference'
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False, unique=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    processing_status = db.Column(
        Enum('pending', 'extracting', 'indexing', 'done', 'failed', name='processing_status_enum'),
        default='pending',
        nullable=False
    )
    extracted_text = db.Column(db.Text, nullable=True)
    processing_progress = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<PDFReference {self.filename}>'