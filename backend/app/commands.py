import click
from flask.cli import with_appcontext
from .extensions import db
from .models import User, School, Layout, Book, PDFReference
from flask_bcrypt import Bcrypt
import os
import threading
from flask import current_app
from .services.rag_service import add_to_collection
from .services.book_processing_service import extract_book_content_and_media
from .routes.layout_routes import parse_docx_to_json_and_text, parse_pdf_to_json_and_text

bcrypt = Bcrypt()

@click.command('create-developer')
@with_appcontext
@click.argument('email')
@click.argument('username')
@click.argument('password')
def create_developer_command(email, username, password):
    """Creates a new user with the Developer role."""
    if User.query.filter((User.email == email) | (User.username == username)).first():
        click.echo('Error: A user with that email or username already exists.')
        return

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    developer = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        role='Developer'
    )

    db.session.add(developer)
    db.session.commit()

    click.echo(f'Developer account for "{username}" created successfully.')

@click.command('create-school')
@with_appcontext
@click.argument('name')
def create_school_command(name):
    """Creates a new school."""
    if School.query.filter_by(name=name).first():
        click.echo('Error: A school with that name already exists.')
        return
    
    new_school = School(name=name)
    db.session.add(new_school)
    db.session.commit()
    click.echo(f'School "{name}" created successfully.')

def init_app(app):
    bcrypt.init_app(app)
    app.cli.add_command(create_developer_command)
    app.cli.add_command(create_school_command)

@click.command('reindex-all')
@with_appcontext
def reindex_all_command():
    """
    Re-processes and indexes all existing layouts and books into ChromaDB.
    """
    app = current_app._get_current_object()
    
    # 1. Re-index Layouts
    layouts = Layout.query.all()
    click.echo(f"Found {len(layouts)} layouts to re-index...")
    for layout in layouts:
        # --- LOGIKA BARU UNTUK LAYOUT ---
        if not layout.file_path or not os.path.exists(layout.file_path):
            click.echo(f"⚠️  File path for layout ID {layout.id} not found. Please re-upload it. Skipping.")
            continue
        
        click.echo(f"🚀 Processing layout ID {layout.id}: {os.path.basename(layout.file_path)}...")
        try:
            if layout.file_path.endswith('.docx'):
                _, text_content = parse_docx_to_json_and_text(layout.file_path)
            else:
                _, text_content = parse_pdf_to_json_and_text(layout.file_path)
            
            document_id = f"layout_{layout.id}_{layout.tipe_dokumen}"
            text_chunks = [chunk for chunk in text_content.split('\n') if len(chunk.strip()) > 30]
            if text_chunks:
                add_to_collection(text_chunks, document_id)
                click.echo(f"  -> Successfully indexed layout ID {layout.id}.")
        except Exception as e:
            click.echo(f"❌ Error processing layout ID {layout.id}: {e}")
    click.echo("✅ Layout re-indexing finished.")

    # 2. Re-index Books
    books = Book.query.all()
    click.echo(f"\nFound {len(books)} books to re-index...")
    for book in books:
        if not os.path.exists(book.file_path):
            click.echo(f"⚠️  File not found for book ID {book.id}: {book.file_path}. Skipping.")
            continue
        
        click.echo(f"🚀 Processing book ID {book.id}: {book.judul_buku}...")
        try:
            # Gunakan logika yang sama seperti di `upload_routes`
            pdf_ref = PDFReference.query.filter_by(file_path=book.file_path).first()
            if not pdf_ref:
                pdf_ref = PDFReference(filename=os.path.basename(book.file_path), file_path=book.file_path)
                db.session.add(pdf_ref)
            
            pdf_ref.processing_status = 'pending'
            db.session.commit()
            
            # Jalankan proses di thread agar tidak memblokir
            thread = threading.Thread(target=extract_book_content_and_media, args=(app.app_context(), book.id))
            thread.start()
            thread.join() # Tunggu hingga selesai untuk command-line
            click.echo(f"  -> Successfully queued book ID {book.id} for processing.")

        except Exception as e:
            click.echo(f"❌ Error processing book ID {book.id}: {e}")

    click.echo("\n✅ Re-indexing process for books has been initiated.")

def init_app(app):
    bcrypt.init_app(app)
    app.cli.add_command(create_developer_command)
    app.cli.add_command(create_school_command)
    # --- DAFTARKAN COMMAND BARU ---
    app.cli.add_command(reindex_all_command)    