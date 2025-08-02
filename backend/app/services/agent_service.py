import os
import json
import re
from .ai_service import generate_content_with_context, generate_summary_with_together_ai
from .rag_service import search_index
from app.utils.search_tool import search_internet

def parse_json_from_string(text):
    """
    Mencari dan mem-parsing blok JSON dari dalam string.
    Ini lebih tangguh terhadap teks tambahan yang mungkin dihasilkan oleh LLM.
    """
    # Mencari blok JSON yang diapit oleh ```json ... ```
    match = re.search(r'```json\n({.*?})\n```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error after finding block: {e}")
            return None
    
    # Fallback jika tidak ada blok markdown, coba parsing teks mentah
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error on raw text: {e}")
        return None

# --- AGEN-AGEN SPESIALIS ---

def run_research_agent(topik, kelas, mapel, jenis_dokumen):
    """
    Tugas: Mencari informasi relevan dari internet dan merangkumnya menggunakan Together AI.
    """
    print(f"🔎 Agen Peneliti: Mencari di internet untuk '{jenis_dokumen}' tentang '{topik} {mapel} kelas {kelas}'...")
    
    # Kueri pencarian sekarang menyertakan jenis dokumen untuk hasil yang lebih relevan
    queries = [
        f"contoh {jenis_dokumen} {mapel} kelas {kelas} topik {topik} kurikulum merdeka",
        f"materi ajar untuk {jenis_dokumen} {topik} kelas {kelas}",
        f"struktur dan komponen {jenis_dokumen} kurikulum merdeka"
    ]
    
    search_snippets = []
    for query in queries:
        results = search_internet(query) 
        search_snippets.append(f"Hasil pencarian untuk '{query}':\n{results}")

    raw_search_data = "\n\n".join(search_snippets)

    summarization_prompt = f"""
    Anda adalah seorang asisten peneliti. Tugas Anda adalah membaca hasil pencarian web berikut dan membuat ringkasan (Laporan Riset) yang padat dan informatif untuk pembuatan '{jenis_dokumen}'. 
    Fokus pada poin-poin kunci, ide-ide utama, dan contoh-contoh konkret yang relevan.
    
    HASIL PENCARIAN MENTAH:
    ---
    {raw_search_data}
    ---
    
    LAPORAN RISET (dalam Bahasa Indonesia):
    """
    research_summary = generate_summary_with_together_ai(summarization_prompt)
    return research_summary

def run_curriculum_specialist_agent(kelas, mapel, jenis_dokumen, topik, full_context):
    """
    Tugas: Menganalisis input & konteks, lalu membuat kerangka (outline) dokumen.
    """
    print("🤖 Agen Spesialis Kurikulum: Membuat outline...")

    # Struktur JSON dinamis berdasarkan jenis dokumen yang dipilih
    if jenis_dokumen == "Modul Ajar":
        json_structure = '{"tujuan_pembelajaran": [], "alur_kegiatan": {"pembuka": "", "inti": [], "penutup": ""}, "rencana_asesmen": []}'
    elif jenis_dokumen == "ATP":
        json_structure = '{"elemen": "", "capaian_pembelajaran": "", "tujuan_pembelajaran": [], "kata_kunci": [], "alokasi_waktu": ""}'
    else: # Struktur default untuk CP, Prota, Promes
        json_structure = '{"poin_utama": [], "sub_poin": []}'

    prompt = f"""
    Anda adalah seorang ahli dalam desain Kurikulum Merdeka di Indonesia.
    Berdasarkan konteks yang diberikan: '{full_context}'.
    
    Buatkan kerangka (outline) untuk sebuah '{jenis_dokumen}' mata pelajaran '{mapel}' untuk siswa kelas '{kelas}' dengan topik '{topik}'.
    
    Format output HARUS dalam bentuk JSON di dalam blok markdown (```json ... ```) dengan struktur berikut yang lengkap:
    {json_structure}
    """
    
    outline_str = generate_content_with_context(prompt, [full_context])
    outline_json = parse_json_from_string(outline_str)
    
    if not outline_json:
        print("Error: Gagal mem-parsing outline JSON dari LLM.")
        return None
        
    return outline_json

def run_content_writer_agent(tujuan, topik, kelas, mapel, context):
    """
    Tugas: Menulis materi inti berdasarkan satu tujuan pembelajaran.
    """
    print(f"✍️  Agen Penulis Konten: Menulis materi untuk '{tujuan}'...")
    prompt = f"Jelaskan secara detail, mendalam, dan mudah dipahami untuk siswa kelas {kelas} materi tentang '{tujuan}' dalam konteks {topik} pada mata pelajaran {mapel}. Gunakan konteks berikut sebagai acuan utama: '{context}'. Berikan contoh yang relevan dan praktis."
    return generate_content_with_context(prompt, [context])

def run_pedagogy_designer_agent(aktivitas_outline, topik, kelas, mapel):
    """
    Tugas: Merancang detail aktivitas pembelajaran.
    """
    print(f"🎨 Agen Desainer Pedagogi: Merancang aktivitas untuk '{aktivitas_outline}'...")
    prompt = f"Anda adalah seorang desainer pedagogi. Rancang sebuah aktivitas pembelajaran yang menarik dan interaktif untuk siswa kelas {kelas} mapel {mapel}. Instruksi awal aktivitas adalah: '{aktivitas_outline}'. Sertakan langkah-langkah yang jelas untuk guru, estimasi waktu, dan media yang mungkin dibutuhkan."
    return generate_content_with_context(prompt, [])

def run_qa_specialist_agent(full_draft, jenis_dokumen, kelas, mapel):
    """
    Tugas: Melakukan review dan pemformatan akhir.
    """
    print("📝 Agen QA: Melakukan review dan pemformatan akhir...")
    prompt = f"""
    Tugas Anda adalah memformat ulang DRAF DOKUMEN di bawah ini menjadi sebuah '{jenis_dokumen}' yang profesional dan terstruktur untuk guru kelas {kelas} mata pelajaran {mapel}.

    Ikuti instruksi berikut dengan SANGAT TELITI:
    1. Perbaiki semua kesalahan tata bahasa dan ejaan.
    2. Pastikan alur konten logis dan mudah diikuti.
    3. Gunakan heading tebal (contoh: **A. TUJUAN PEMBELAJARAN**) dan penomoran yang konsisten.
    4. PENTING: Jangan sertakan kalimat pembuka, komentar, atau paragraf pengantar dalam bentuk apapun. Langsung mulai respons Anda dengan judul dokumen.

    DRAF DOKUMEN:
    ---
    {full_draft}
    ---

    HASIL AKHIR YANG TELAH DIFORMAT:
    """
    return generate_content_with_context(prompt, [])

# --- FUNGSI ORKESTRATOR UTAMA ---
def generate_document_with_agents(kelas, mapel, jenis, topik):
    print(f"🚀 Memulai alur kerja agen untuk: {jenis} - {mapel} Kelas {kelas}")
    print("🧠 Mencari konteks di database internal (ChromaDB)...")
    rag_context_chunks = search_index(f"Capaian Pembelajaran dan ATP untuk {mapel} kelas {kelas} mengenai {topik}")
    
    internet_context = ""
    if not rag_context_chunks:
        print("⚠️ Konteks internal tidak ditemukan. Mengaktifkan Agen Peneliti...")
        internet_context = run_research_agent(topik, kelas, mapel, jenis)
    else:
        print("✅ Konteks internal ditemukan.")

    rag_context = "\n".join(rag_context_chunks)
    full_context = f"Konteks Internal (RAG):\n{rag_context}\n\nKonteks Internet:\n{internet_context}"

    outline = run_curriculum_specialist_agent(kelas, mapel, jenis, topik, full_context)
    if not outline:
        return "Gagal membuat kerangka dokumen. Layanan AI mungkin tidak dapat memproses permintaan. Coba lagi dengan topik yang lebih spesifik."

    draft_dokumen = f"**{jenis.upper()} {mapel.upper()} KELAS {kelas}**\n\n"
    draft_dokumen += f"**Topik:** {topik}\n\n"

    if jenis == "Modul Ajar":
        materi_pembelajaran = [run_content_writer_agent(t, topik, kelas, mapel, full_context) for t in outline.get("tujuan_pembelajaran", [])]
        aktivitas_inti = [run_pedagogy_designer_agent(a, topik, kelas, mapel) for a in outline.get("alur_kegiatan", {}).get("inti", [])]
        
        draft_dokumen += "**A. TUJUAN PEMBELAJARAN**\n"
        for i, tujuan in enumerate(outline.get("tujuan_pembelajaran", [])):
            draft_dokumen += f"{i+1}. {tujuan}\n"
        
        draft_dokumen += "\n**B. MATERI PEMBELAJARAN**\n"
        for materi in materi_pembelajaran:
            draft_dokumen += f"{materi}\n\n"
            
        draft_dokumen += "\n**C. LANGKAH-LANGKAH KEGIATAN**\n"
        draft_dokumen += f"**Kegiatan Pembuka:**\n{outline.get('alur_kegiatan', {}).get('pembuka', 'N/A')}\n\n"
        draft_dokumen += "**Kegiatan Inti:**\n"
        for i, aktivitas in enumerate(aktivitas_inti):
            draft_dokumen += f"**Aktivitas {i+1}:**\n{aktivitas}\n\n"
        draft_dokumen += f"**Kegiatan Penutup:**\n{outline.get('alur_kegiatan', {}).get('penutup', 'N/A')}\n\n"
            
        draft_dokumen += "\n**D. RENCANA ASESMEN**\n"
        for i, asesmen in enumerate(outline.get("rencana_asesmen", [])):
            draft_dokumen += f"{i+1}. {asesmen}\n"
            
    elif jenis == "ATP":
        draft_dokumen += f"**Elemen:** {outline.get('elemen', 'N/A')}\n\n"
        draft_dokumen += f"**Capaian Pembelajaran:**\n{outline.get('capaian_pembelajaran', 'N/A')}\n\n"
        draft_dokumen += "**Tujuan Pembelajaran:**\n"
        for i, tujuan in enumerate(outline.get("tujuan_pembelajaran", [])):
            draft_dokumen += f"{i+1}. {tujuan}\n"
        draft_dokumen += f"\n**Alokasi Waktu:** {outline.get('alokasi_waktu', 'N/A')}\n"
        
    else: 
        for i, poin in enumerate(outline.get("poin_utama", [])):
            draft_dokumen += f"**{chr(65+i)}. {poin}**\n"
            if "sub_poin" in outline:
                for j, sub_poin in enumerate(outline.get("sub_poin", [])):
                     if f"{chr(65+i)}." in sub_poin:
                        draft_dokumen += f"- {sub_poin}\n"
            draft_dokumen += "\n"

    final_document = run_qa_specialist_agent(draft_dokumen, jenis, kelas, mapel)
    
    return final_document