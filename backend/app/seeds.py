# backend/app/seeds.py

from app.extensions import db
from app.models.subject import Subject

def seed_subjects():
    """Mengisi tabel subjects dengan data awal jika masih kosong."""
    
    # Cek apakah tabel sudah ada isinya
    if Subject.query.count() > 0:
        print("Tabel 'subjects' sudah berisi data. Seeding dibatalkan.")
        return

    # Data subject yang sama dengan di frontend
    initial_subjects = [
        {'id': 1, 'name': 'Bahasa Indonesia'},
        {'id': 2, 'name': 'Informatika'},
        {'id': 3, 'name': 'PJOK'},
        {'id': 4, 'name': 'Fisika'},
        {'id': 5, 'name': 'Matematika'},
    ]

    print("Memulai seeding untuk tabel 'subjects'...")
    for sub_data in initial_subjects:
        subject = Subject(id=sub_data['id'], name=sub_data['name'], is_custom=False)
        db.session.add(subject)
    
    db.session.commit()
    print("Seeding untuk tabel 'subjects' berhasil!")