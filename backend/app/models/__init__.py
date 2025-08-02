# backend/app/models/__init__.py

# Model yang sudah ada
from .user import User, teacher_schools_table
from .school import School
from .class_model import Class
from .subject import Subject
from .generated_document import GeneratedDocument
from .pdf_reference import PDFReference
from .aimodels import Layout, Book, MediaAsset, Prota, Promes, Atp, ModulAjar, Soal

__all__ = [
    'User', 
    'teacher_schools_table',
    'School', 
    'Class', 
    'Subject', 
    'GeneratedDocument',
    'PDFReference',
    # Menambahkan model baru ke __all__
    'Layout',
    'Book',
    'MediaAsset',
    'Prota',
    'Promes',
    'Atp',
    'ModulAjar',
    'Soal'
]