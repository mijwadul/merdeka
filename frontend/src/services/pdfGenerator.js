// frontend/src/services/pdfGenerator.js

import jsPDF from 'jspdf';

// Fungsi utama untuk membuat PDF dari data layout
export const generatePdfFromLayout = (layoutData) => {
  const doc = new jsPDF();
  let y = 15; // Posisi Y awal pada dokumen

  // Fungsi helper untuk menulis teks dan menggeser posisi Y
  const writeText = (text, options = {}) => {
    const { fontStyle = 'normal', fontSize = 11, x = 15, isTitle = false } = options;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    // Split teks panjang agar tidak keluar halaman
    const splitText = doc.splitTextToSize(text, 180); 
    doc.text(splitText, x, y);
    
    // Tambah spasi setelah menulis teks
    y += (splitText.length * (isTitle ? 7 : 5)) + 5; 
    
    // Cek jika butuh halaman baru
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  };

  // Mulai menulis dokumen
  writeText(`Dokumen: ${layoutData.tipe_dokumen} - ${layoutData.mapel}`, { isTitle: true, fontSize: 16, fontStyle: 'bold' });
  y += 5; // Spasi ekstra setelah judul utama

  // Loop melalui setiap komponen dalam JSON
  layoutData.layout_json.components.forEach(component => {
    switch (component.component_type) {
      case 'metadata':
        writeText('Informasi Umum', { fontSize: 14, fontStyle: 'bold' });
        for (const [key, value] of Object.entries(component.data)) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          writeText(`${formattedKey}: ${value}`);
        }
        break;
        
      case 'main_structure':
        writeText('Struktur Utama', { fontSize: 14, fontStyle: 'bold' });
        for (const [key, value] of Object.entries(component.data)) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
           if (typeof value === 'object' && value !== null) {
             writeText(`${formattedKey}:`, { fontStyle: 'bold' });
             for(const [subKey, subValue] of Object.entries(value)) {
                writeText(`  - ${subKey.charAt(0).toUpperCase() + subKey.slice(1)}: ${subValue.deskripsi || JSON.stringify(subValue)}`);
             }
           } else {
             writeText(`${formattedKey}: ${value}`);
           }
        }
        break;

      case 'assessment':
        writeText('Asesmen / Penilaian', { fontSize: 14, fontStyle: 'bold' });
        for (const [key, value] of Object.entries(component.data)) {
           const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
           writeText(`${formattedKey}:`, {fontStyle: 'bold'});
           writeText(`  Teknik: ${value.teknik || 'N/A'}`);
           writeText(`  Deskripsi: ${value.deskripsi || value.contoh || 'N/A'}`);
        }
        break;

      case 'supporting_elements':
        writeText('Elemen Pendukung', { fontSize: 14, fontStyle: 'bold' });
         for (const [key, value] of Object.entries(component.data)) {
           const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
           writeText(`${formattedKey}:`, {fontStyle: 'bold'});
           if(Array.isArray(value)) {
               value.forEach(item => writeText(`- ${item}`));
           } else {
               writeText(String(value));
           }
         }
        break;

      default:
        // Komponen lain bisa ditambahkan di sini
        break;
    }
    y += 5; // Spasi antar komponen
  });

  // Simpan dan picu download PDF
  doc.save(`${layoutData.tipe_dokumen}_${layoutData.mapel.replace(/\s/g, '_')}.pdf`);
};