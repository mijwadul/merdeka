import os
from serpapi import GoogleSearch

def search_internet(query):
    """
    Melakukan pencarian internet menggunakan SerpApi (sebagai wrapper untuk Google Search)
    dan mengembalikan ringkasan dari hasil pencarian.
    """
    print(f"  -> Melakukan pencarian Google untuk: '{query}'")
    
    # Mengambil API key dari environment variables
    # Pastikan Anda menggunakan nama variabel yang konsisten dengan file .env Anda
    api_key = os.getenv("GOOGLE_SEARCH_API_KEY") 
    
    if not api_key:
        print("PERINGATAN: GOOGLE_SEARCH_API_KEY tidak ditemukan di file .env")
        return "Pencarian internet tidak dapat dilakukan karena API key tidak ada."

    params = {
        "engine": "google",
        "q": query,
        "api_key": api_key,
        "num": 5 # Ambil 5 hasil teratas untuk efisiensi
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        
        # Ekstrak cuplikan (snippets) dari hasil pencarian organik
        snippets = []
        if "organic_results" in results:
            for result in results.get("organic_results", []):
                if "snippet" in result:
                    snippets.append(result["snippet"])
        
        if not snippets:
            return "Tidak ada hasil yang relevan ditemukan di internet."
            
        # Gabungkan semua cuplikan menjadi satu blok teks
        return "\n".join(snippets)
        
    except Exception as e:
        print(f"Error saat melakukan pencarian internet: {e}")
        return f"Gagal melakukan pencarian internet: {e}"