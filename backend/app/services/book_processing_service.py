# backend/app/services/book_processing_service.py

from app.extensions import db
from app.models import Book, MediaAsset
import pdfplumber
import re
import os
from flask import current_app

def _extract_toc_smart(pdf_path):
    """
    Fungsi cerdas untuk mengekstrak Daftar Isi (Table of Contents) dari PDF.
    """
    chapters = []
    chapter_pattern = re.compile(r'^(BAB\s+[IVXLC\d]+)', re.IGNORECASE)
    toc_entry_pattern = re.compile(r'(.+?)\s*\.{5,}\s*(\d+)')

    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages[:10]):
                text = page.extract_text()
                if not text:
                    continue

                lines = text.split('\n')
                for line in lines:
                    match = toc_entry_pattern.search(line)
                    if match:
                        title = match.group(1).strip()
                        page_num = int(match.group(2))
                        
                        if len(title) > 4 and not any(c['title'] == title for c in chapters):
                            is_main_chapter = chapter_pattern.match(title)
                            if is_main_chapter:
                                chapters.append({"title": title, "page": page_num, "subsections": []})
                            else:
                                chapters.append({"title": title, "page": page_num, "subsections": []})
        
        return {"chapters": chapters}
    except Exception as e:
        print(f"Error saat mengekstrak ToC dari {os.path.basename(pdf_path)}: {e}")
        return {"chapters": []}

# --- FUNGSI BARU UNTUK EKSTRAKSI GAMBAR ---
def _extract_and_save_images(pdf_path, book_id):
    """
    Mengekstrak semua gambar dari PDF, menyimpannya sebagai file,
    dan membuat record di tabel MediaAsset.
    """
    saved_images_count = 0
    # Membuat path folder penyimpanan yang unik untuk setiap buku
    media_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'media_assets', str(book_id))
    os.makedirs(media_folder, exist_ok=True)
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                for img_index, img_obj in enumerate(page.images):
                    try:
                        # Mengambil data gambar mentah (bytes)
                        image_bytes = img_obj['stream'].get_data()
                        
                        # Membuat nama file yang unik
                        image_filename = f"page_{i+1}_img_{img_index}.png"
                        image_path = os.path.join(media_folder, image_filename)
                        
                        # Menyimpan file gambar
                        with open(image_path, 'wb') as f:
                            f.write(image_bytes)
                        
                        # Membuat record baru di database
                        new_asset = MediaAsset(
                            book_id=book_id,
                            tipe_media='gambar',
                            halaman=i + 1,
                            file_path=image_path,
                            caption=f"Gambar dari halaman {i+1}" # Caption bisa diperkaya dengan OCR nanti
                        )
                        db.session.add(new_asset)
                        saved_images_count += 1
                    except Exception as e:
                        print(f"Gagal menyimpan gambar di halaman {i+1}: {e}")
        return saved_images_count
    except Exception as e:
        print(f"Error saat memproses gambar dari PDF {os.path.basename(pdf_path)}: {e}")
        return 0

# --- FUNGSI UTAMA YANG DIPERBARUI ---
def extract_book_content_and_media(app_context, book_id):
    """
    Fungsi utama yang berjalan di background thread.
    Sekarang sudah lengkap dengan ekstraksi ToC dan Gambar.
    """
    with app_context:
        print(f"Memulai pemrosesan LENGKAP untuk buku ID: {book_id}")
        book = Book.query.get(book_id)
        if not book:
            print(f"Buku ID {book_id} tidak ditemukan.")
            return

        try:
            # 1. Ekstrak Daftar Isi (ToC)
            print(f"Mengekstrak daftar isi dari {book.file_path}...")
            topic_json_data = _extract_toc_smart(book.file_path)
            if topic_json_data and topic_json_data["chapters"]:
                book.topic_json = topic_json_data
                print(f"Berhasil menemukan {len(topic_json_data['chapters'])} bab/topik.")
            else:
                book.topic_json = {"chapters": []}
                print("Peringatan: Tidak ada bab/topik yang ditemukan.")
            
            # ---- MEMANGGIL FUNGSI EKSTRAKSI GAMBAR ----
            print("Memulai ekstraksi gambar...")
            num_images = _extract_and_save_images(book.file_path, book.id)
            print(f"Berhasil mengekstrak dan menyimpan {num_images} gambar.")

            db.session.commit()
            print(f"Pemrosesan LENGKAP untuk buku ID: {book_id} selesai.")

        except Exception as e:
            db.session.rollback()
            print(f"Terjadi error saat memproses buku ID {book_id}: {e}")