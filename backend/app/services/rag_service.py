import chromadb
from sentence_transformers import SentenceTransformer
import os

# --- Configuration ---
model = SentenceTransformer('all-MiniLM-L6-v2')
INSTANCE_FOLDER_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'instance'))

# 1. Initialize ChromaDB client with persistence
client = chromadb.PersistentClient(path=INSTANCE_FOLDER_PATH)

# 2. Get or create a collection. This is like a table in a database.
# This operation is idempotent, so it's safe to run every time.
collection = client.get_or_create_collection(name="gatra_sinau_docs")

def add_to_collection(text_chunks, document_id):
    """
    Adds text chunks and their embeddings to the ChromaDB collection.
    ChromaDB handles creating and updating internally.
    """
    print(f"Adding {len(text_chunks)} chunks for document: {document_id} to ChromaDB...")
    
    # Generate unique IDs for each chunk to prevent duplicates
    chunk_ids = [f"{document_id}_{i}" for i in range(len(text_chunks))]
    
    # Add the text chunks, metadata, and embeddings to the collection.
    # Chroma automatically handles the embedding process if we provide the text.
    collection.add(
        documents=text_chunks,
        ids=chunk_ids
    )
    print("Document added to ChromaDB collection successfully.")


def search_index(query_text, k=25):
    """
    Searches the collection for the most relevant text chunks.
    """
    print(f"Searching ChromaDB for query: '{query_text}'")
    
    # Query the collection
    results = collection.query(
        query_texts=[query_text],
        n_results=k
    )
    
    # The actual documents are in the 'documents' key of the first result set
    retrieved_chunks = results['documents'][0]
    
    print(f"Found {len(retrieved_chunks)} relevant chunks from ChromaDB.")
    return retrieved_chunks