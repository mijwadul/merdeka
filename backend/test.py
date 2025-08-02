from googlesearch import search

def search_pdf_links(query, num_results=10):
    results = []
    for url in search(f"{query} site:buku.kemdikbud.go.id filetype:pdf", num_results=num_results):
        if url.endswith('.pdf'):
            results.append(url)
    return results