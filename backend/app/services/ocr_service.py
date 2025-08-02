import traceback
from pdf2image import convert_from_path
import pytesseract
from app.extensions import db
from app.models import PDFReference
from .rag_service import add_to_collection

def ocr_process_pdf_with_context(app_context, file_path, ref_id):
    """
    Wrapper function to run OCR, update detailed progress, and add to ChromaDB.
    """
    with app_context:
        pdf_ref = PDFReference.query.get(ref_id)
        if not pdf_ref: return

        try:
            # Stage 1: Text Extraction (OCR)
            print(f"Starting OCR for {file_path}...")
            pdf_ref.processing_status = 'extracting'
            pdf_ref.processing_progress = 0
            db.session.commit()

            images = convert_from_path(file_path)
            total_pages = len(images)
            full_text = ""

            for i, image in enumerate(images):
                print(f"Extracting page {i + 1}/{total_pages}...")
                text = pytesseract.image_to_string(image, lang='ind')
                full_text += text + "\n\n"
                progress = int(((i + 1) / total_pages) * 100)
                pdf_ref.processing_progress = progress
                db.session.commit()

            pdf_ref.extracted_text = full_text
            
            # Stage 2: AI Indexing
            print("Starting AI Indexing...")
            pdf_ref.processing_status = 'indexing'
            db.session.commit()
            
            text_chunks = [chunk for chunk in full_text.split('\n') if len(chunk.strip()) > 50]
            if text_chunks:
                add_to_collection(text_chunks, document_id=f"doc_{pdf_ref.id}")
            
            # Stage 3: Done
            pdf_ref.processing_status = 'done'
            db.session.commit()
            print("--- Processing Complete ---")

        except Exception as e:
            traceback.print_exc()
            pdf_ref.processing_status = 'failed'
            db.session.commit()