# backend/app/services/book_processing_service.py

import fitz  # PyMuPDF
import os
from app.extensions import db
from app.models import Book, MediaAsset
from .rag_service import add_to_collection
import traceback

def extract_book_content_and_media(app_context, book_id):
    """
    Fungsi utama yang berjalan di background untuk memproses PDF buku.
    Mengekstrak teks, daftar isi, dan gambar.
    """
    with app_context:
        book = Book.query.get(book_id)
        if not book:
            print(f"❌ Book with ID {book_id} not found.")
            return

        print(f"🚀 Starting background processing for book: {book.judul_buku}")
        
        try:
            doc = fitz.open(book.file_path)
            
            # 1. Ekstrak Daftar Isi (Table of Contents)
            toc = doc.get_toc()
            book.topic_json = toc
            print(f"  -> Extracted {len(toc)} TOC items.")

            # 2. Ekstrak Teks & Indeks ke ChromaDB
            full_text = ""
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                full_text += page.get_text("text") + "\n\n"
            
            text_chunks = [chunk for chunk in full_text.split('\n\n') if len(chunk.strip()) > 50]
            if text_chunks:
                document_id = f"book_{book.id}"
                add_to_collection(text_chunks, document_id)
                print(f"  -> Indexed {len(text_chunks)} text chunks to ChromaDB.")
            
            # 3. Ekstrak Gambar/Media Aset
            media_count = 0
            for page_num in range(len(doc)):
                image_list = doc.get_page_images(page_num)
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Simpan gambar sebagai file
                    image_filename = f"book_{book.id}_page_{page_num+1}_img_{img_index}.png"
                    image_folder = os.path.join(os.path.dirname(book.file_path), 'media')
                    os.makedirs(image_folder, exist_ok=True)
                    image_path = os.path.join(image_folder, image_filename)
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                    
                    # Simpan referensi ke database
                    new_asset = MediaAsset(
                        book_id=book.id,
                        tipe_media='image',
                        halaman=page_num + 1,
                        file_path=image_path
                    )
                    db.session.add(new_asset)
                    media_count += 1
            print(f"  -> Extracted and saved {media_count} media assets.")

            db.session.commit()
            print(f"✅ Successfully processed book: {book.judul_buku}")

        except Exception as e:
            print(f"❌ Error processing book ID {book_id}: {e}")
            traceback.print_exc()
            db.session.rollback()