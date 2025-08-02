# backend/app/models/__init__.py

from .pdf_reference import PDFReference
from .user import User, teacher_schools_table # Impor tabel perantara juga
from .school import School
from .class_model import Class
from .subject import Subject 
from .generated_document import GeneratedDocument

# Anda bisa menambahkan __all__ jika ingin
__all__ = ['PDFReference', 'User', 'School', 'Class', 'Subject', 'teacher_schools_table', 'GeneratedDocument']