import os
import json
import uuid
import requests
import fitz  # PyMuPDF
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from chromadb import PersistentClient
from dotenv import load_dotenv
from googleapiclient.discovery import build
from app.utils.chroma_client import get_collection

load_dotenv()

# === PATH SETUP ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(BASE_DIR, '..', 'data', 'raw')
LOG_FILE = os.path.join(BASE_DIR, '..', 'data', 'logs', 'found_documents.json')
CHROMA_DIR = os.path.join(BASE_DIR, '..', 'data', 'chroma')

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

# === CRAWLING ===
SITES = {
    "buku.kemdikbud.go.id": "https://buku.kemdikbud.go.id",
    "kurikulum.kemdikbud.go.id": "https://kurikulum.kemdikbud.go.id",
    "datadikdasmen.com": "https://www.datadikdasmen.com"
}

def crawl_documents():
    found_documents = []
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    for site_name, base_url in SITES.items():
        try:
            print(f"Crawling {base_url}...")
            res = requests.get(base_url, headers=headers, timeout=10)
            soup = BeautifulSoup(res.content, 'html.parser')
            links = soup.find_all('a', href=True)

            for link in links:
                href = link['href']
                if href.endswith('.pdf'):
                    full_url = urljoin(base_url, href)
                    file_name = full_url.split("/")[-1]
                    file_id = str(uuid.uuid4())
                    save_path = os.path.join(RAW_DIR, file_name)

                    if not os.path.exists(save_path):
                        r = requests.get(full_url, headers=headers, timeout=10)
                        with open(save_path, 'wb') as f:
                            f.write(r.content)
                        print(f"Downloaded: {file_name}")

                    found_documents.append({
                        "id": file_id,
                        "source": site_name,
                        "url": full_url,
                        "file_name": file_name,
                        "local_path": save_path,
                        "status": "ready"
                    })

        except Exception as e:
            print(f"Error crawling {base_url}: {e}")

    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(found_documents, f, indent=2, ensure_ascii=False)

    return found_documents

# === PENGAMBILAN HASIL CRAWL ===
def get_discovered_documents():
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

# === EKSTRAKSI TEKS ===
def extract_text_from_pdf(path):
    doc = fitz.open(path)
    return "\n".join([page.get_text() for page in doc])

# === EMBED KE CHROMADB ===
def embed_documents_by_ids(id_list):
    if not os.path.exists(LOG_FILE):
        return []

    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        all_docs = json.load(f)

    selected = [doc for doc in all_docs if doc['id'] in id_list]

    client = PersistentClient(path=CHROMA_DIR)
    
    # --- PERBAIKAN DI SINI ---
    # Ganti nama koleksi dari "kurikulum" menjadi "gatra_sinau_docs"
    collection = client.get_or_create_collection("gatra_sinau_docs")
    # --- AKHIR PERBAIKAN ---

    results = []
    for doc in selected:
        try:
            text = extract_text_from_pdf(doc['local_path'])
            metadata = {
                "source": doc["source"],
                "file_name": doc["file_name"]
            }
            collection.add(
                documents=[text],
                metadatas=[metadata],
                ids=[doc["id"]]
            )
            results.append({**doc, "status": "embedded"})
        except Exception as e:
            results.append({**doc, "status": f"error: {str(e)}"})

    return results

# === GOOGLE SEARCH API (CSE) ===
def search_pdf_links(query, num_results=10):
    GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY")
    GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")

    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_CSE_ID:
        print("❌ API Key atau CSE ID belum ditemukan di .env")
        return []

    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_SEARCH_API_KEY)
        res = service.cse().list(
            q=query,
            cx=GOOGLE_CSE_ID,
            num=min(num_results, 10),
            fileType='pdf',
            siteSearch='kemdikbud.go.id'
        ).execute()
    except Exception as e:
        print(f"❌ Google API Error: {e}")
        return []

    results = []
    for item in res.get("items", []):
        url = item.get("link", "")
        if url.endswith(".pdf"):
            results.append({
                "url": url,
                "file_name": url.split("/")[-1],
                "title": item.get("title", "No Title"),
                "source": "Google CSE"
            })

    return results

def add_document_from_url(url):
    headers = {"User-Agent": "Mozilla/5.0"}
    file_name = url.split("/")[-1]
    file_id = str(uuid.uuid4())
    save_path = os.path.join(RAW_DIR, file_name)

    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code != 200:
            return {"error": f"Failed to download PDF. Status {r.status_code}"}, 400

        with open(save_path, 'wb') as f:
            f.write(r.content)

        doc_entry = {
            "id": file_id,
            "source": "manual",
            "url": url,
            "file_name": file_name,
            "local_path": save_path,
            "status": "ready"
        }

        docs = get_discovered_documents()
        docs.append(doc_entry)
        with open(LOG_FILE, 'w', encoding='utf-8') as f:
            json.dump(docs, f, indent=2, ensure_ascii=False)

        return doc_entry
    except Exception as e:
        return {"error": str(e)}, 500
    
def query_documents_by_text(query_text, top_k=5):
    client = PersistentClient(path=CHROMA_DIR)
    collection = client.get_or_create_collection("kurikulum")

    results = collection.query(
        query_texts=[query_text],
        n_results=top_k
    )

    docs = []
    for i in range(len(results["ids"][0])):
        docs.append({
            "id": results["ids"][0][i],
            "content": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score": results["distances"][0][i]
        })

    return docs

def extract_text_from_url(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()

        if 'application/pdf' in res.headers.get('Content-Type', ''):
            return None  # sudah ditangani oleh PDF handler

        soup = BeautifulSoup(res.text, 'html.parser')

        # Clean up common non-content tags
        for tag in soup(['script', 'style', 'nav', 'header', 'footer']):
            tag.decompose()

        text = soup.get_text(separator=' ', strip=True)
        title = soup.title.string if soup.title else "Untitled"

        return {
            "title": title,
            "text": text,
            "url": url
        }
    except Exception as e:
        print(f"[extract_text_from_url] Error: {e}")
        return {"success": False, "error": str(e)}
    
def embed_document_from_url(data):
    collection = get_collection()
    document_id = str(uuid.uuid4())
    metadata = {
        "title": data['title'],
        "source": data['url'],
        "jenis": "Web" if data['type'] == "html" else "PDF",
        "mapel": None,
        "kelas": None
    }

    collection.add(
        documents=[data['text']],
        metadatas=[metadata],
        ids=[document_id]
    )

    return {
        "id": document_id,
        "title": data['title'],
        "url": data['url'],
        "jenis": metadata['jenis']
    }