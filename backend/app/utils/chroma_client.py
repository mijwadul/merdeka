from chromadb import Client
from chromadb.config import Settings

def get_collection(name="curriculum_docs"):
    client = Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory="./chroma"))
    if name in [c.name for c in client.list_collections()]:
        return client.get_collection(name)
    else:
        return client.create_collection(name)
