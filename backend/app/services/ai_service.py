import os
import google.generativeai as genai
import requests

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model = genai.GenerativeModel('gemini-2.5-flash')

def generate_content_with_context(query, context_chunks):
    """Generates content using the Gemini model with provided context."""
    print("Generating AI content with Gemini...")
    
    # Combine the context chunks into a single string
    context = "\n\n---\n\n".join(context_chunks)
    
    # Construct a single, detailed prompt for the Gemini model
    full_prompt = (
        "Anda adalah asisten ahli untuk guru Indonesia, yang selaras dengan Kurikulum Merdeka. "
        "Gunakan konteks yang disediakan dari dokumen kurikulum resmi untuk menjawab permintaan pengguna secara akurat. "
        "Hasilkan tanggapan dalam Bahasa Indonesia.\n\n"
        f"Konteks:\n{context}\n\n"
        f"Permintaan Pengguna: '{query}'"
    )

    try:
        response = model.generate_content(full_prompt)
        ai_response = response.text
        print("AI content generated successfully.")
        return ai_response
    except Exception as e:
        print(f"An error occurred with the Gemini API: {e}")
        return "Maaf, terjadi kesalahan saat menghubungi layanan AI Gemini."
    
def generate_summary_with_together_ai(prompt):
    """
    Menghasilkan konten (biasanya ringkasan) menggunakan Together AI.
    """
    print("Generating summary with Together AI...")
    api_key = os.getenv("TOGETHER_API_KEY")
    model = os.getenv("TOGETHER_MODEL")
    
    if not api_key or not model:
        return "Error: TOGETHER_API_KEY atau TOGETHER_MODEL tidak ditemukan di .env"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Format prompt sesuai dengan model Llama/Mistral
    data = {
        "model": model,
        "prompt": f"[INST] {prompt} [/INST]",
        "max_tokens": 1024,
        "temperature": 0.7,
    }

    try:
        response = requests.post("https://api.together.xyz/v1/completions", headers=headers, json=data)
        response.raise_for_status() # Akan raise error jika status code bukan 2xx
        # Pastikan untuk mengambil teks dari respons JSON yang benar
        return response.json()['choices'][0]['text']
    except requests.exceptions.RequestException as e:
        print(f"An error occurred with the Together AI API: {e}")
        return f"Maaf, terjadi kesalahan saat menghubungi layanan Together AI: {e}"    