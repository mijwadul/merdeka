// frontend/src/pages/aitools/GeneratorWizardPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel,
  Select, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, useTheme,
  LinearProgress, Divider, CircularProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CustomAlert from '../../components/common/CustomAlert';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getAuthToken = () => localStorage.getItem('authToken');
const createAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${getAuthToken()}` } });

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

const ProgressDisplay = ({ progress, text }) => (
  <Box sx={{ width: '100%', my: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
      </Box>
    </Box>
    <Typography variant="caption" display="block" sx={{ textAlign: 'center' }}>
      {text}
    </Typography>
  </Box>
);

const GeneratorWizardPage = () => {
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedProta, setGeneratedProta] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/my-classes', createAuthHeaders());
        setMyClasses(response.data);
      } catch (error) {
        console.error("Gagal mengambil daftar kelas:", error);
        setAlertInfo({
          show: true,
          type: 'error',
          title: 'Gagal Memuat',
          message: 'Tidak dapat mengambil daftar kelas Anda.'
        });
      }
    };
    fetchMyClasses();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const initiateGenerationAndListen = async () => {
    if (!selectedClass) return;

    setIsGenerating(true);
    setGeneratedProta(null);
    setAlertInfo({ show: false });
    setProgress(0);
    setProgressText('🚀 Starting AI Engine...');

    const token = getAuthToken();
    const url = `http://localhost:5000/api/wizard/generate/prota/stream?class_id=${selectedClass}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');

          for (let i = 0; i < events.length - 1; i++) {
            const line = events[i].replace(/^data: /, '');
            try {
              const data = JSON.parse(line);

              if (data.error) {
                setAlertInfo({ show: true, type: 'error', title: 'Proses Gagal', message: data.status });
                setIsGenerating(false);
                controller.abort();
                return;
              }

              setProgress(data.progress);
              setProgressText(data.status);

              if (data.progress === 100 && data.result) {
                setGeneratedProta(data.result);
                setAlertInfo({ show: true, type: 'success', title: 'Berhasil!', message: data.result.msg });
                setIsGenerating(false);
                controller.abort();
                return;
              }
            } catch {
              console.error("Gagal parse SSE chunk:", events[i]);
            }
          }

          buffer = events[events.length - 1];
        }
      };

      processStream();
    } catch (error) {
      console.error("Streaming SSE gagal:", error);
      if (error.name !== 'AbortError') {
        setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Gagal terhubung ke server.' });
      }
      setIsGenerating(false);
    }
  };

  let itemsToRender = [];
  let tableHeaders = [];
  let docStructure = null;

  if (generatedProta && generatedProta.data) {
    const data = generatedProta.data;
    docStructure = data.document_structure;
    
    const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (firstArrayKey) {
      itemsToRender = data[firstArrayKey];
      if (itemsToRender.length > 0) {
        tableHeaders = ["Unit", "Alur Tujuan Pembelajaran", "Alokasi Waktu", "Semester"];
      }
    }
  }

  // ✅ =================================================================
  // ✅ MODIFICATION 1: UPDATED DOCX DOWNLOAD HANDLER
  // ✅ =================================================================
  const handleDownloadDocx = () => {
    if (!docStructure || itemsToRender.length === 0) return;

    // --- Part 1: Build Document Structure ---
    const docChildren = [
      new Paragraph({ text: docStructure.Judul || "Program Tahunan", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "" }), // Spacer
    ];

    if (docStructure["Identitas Dokumen"]) {
      docChildren.push(new Paragraph({ text: "Identitas Dokumen", heading: HeadingLevel.HEADING_2 }));
      Object.entries(docStructure["Identitas Dokumen"]).forEach(([key, val]) => {
        docChildren.push(new Paragraph({
          children: [
            new TextRun({ text: `${key.padEnd(20, ' ')}\t: `, bold: true }),
            new TextRun({ text: String(val) })
          ],
        }));
      });
      docChildren.push(new Paragraph({ text: "" }));
    }

    if (docStructure["Capaian Pembelajaran Umum"]) {
      docChildren.push(new Paragraph({ text: "Capaian Pembelajaran Umum", heading: HeadingLevel.HEADING_2 }));
      docChildren.push(new Paragraph({ text: docStructure["Capaian Pembelajaran Umum"], style: "WellSpoken" }));
      docChildren.push(new Paragraph({ text: "" }));
    }
    
    if (Array.isArray(docStructure["Elemen Capaian Pembelajaran"])) {
        docChildren.push(new Paragraph({ text: "Elemen Capaian Pembelajaran", heading: HeadingLevel.HEADING_2 }));
        docStructure["Elemen Capaian Pembelajaran"].forEach(elem => {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: elem.Elemen, bold: true })]
            }));
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: elem.Deskripsi })]
            }));
             docChildren.push(new Paragraph({ text: "" }));
        });
    }

    // --- Part 2: Build Table ---
    const headerRow = new DocxTableRow({
      children: tableHeaders.map(header => new DocxTableCell({
        children: [new Paragraph({ text: header.replace(/_/g, ' ').toUpperCase(), bold: true })],
      })),
    });

    const dataRows = itemsToRender.map(item => new DocxTableRow({
      children: tableHeaders.map(header => new DocxTableCell({
        children: [new Paragraph(String(item[header] !== null && item[header] !== undefined ? item[header] : ''))],
      })),
    }));

    const table = new DocxTable({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
    
    docChildren.push(table);

    // --- Part 3: Create and Save Document ---
    const doc = new Document({
      sections: [{ children: docChildren }],
      styles: {
        paragraphStyles: [{
          id: "WellSpoken",
          name: "Well Spoken",
          basedOn: "Normal",
          next: "Normal",
          run: { italics: true, color: "595959" },
        }],
      }
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, "Prota_Generated.docx");
    });
  };

  // ✅ =================================================================
  // ✅ MODIFICATION 2: UPDATED PDF DOWNLOAD HANDLER
  // ✅ =================================================================
  const handleDownloadPdf = () => {
    if (!docStructure || itemsToRender.length === 0) return;
    
    const doc = new jsPDF();
    const pageMargin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - (pageMargin * 2);
    let yPos = pageMargin;

    // --- Part 1: Write Document Structure ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(docStructure.Judul || "Program Tahunan", pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    if (docStructure["Identitas Dokumen"]) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Identitas Dokumen", pageMargin, yPos);
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      Object.entries(docStructure["Identitas Dokumen"]).forEach(([key, val]) => {
         doc.text(`${key}: ${val}`, pageMargin, yPos);
         yPos += 5;
      });
      yPos += 5; // Extra space
    }
    
    if (docStructure["Capaian Pembelajaran Umum"]) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Capaian Pembelajaran Umum", pageMargin, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        const cpLines = doc.splitTextToSize(docStructure["Capaian Pembelajaran Umum"], usableWidth);
        doc.text(cpLines, pageMargin, yPos);
        yPos += (cpLines.length * 4) + 5; // Adjust yPos based on number of lines
    }

    if (Array.isArray(docStructure["Elemen Capaian Pembelajaran"])) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Elemen Capaian Pembelajaran", pageMargin, yPos);
        yPos += 6;

        doc.setFontSize(10);
        docStructure["Elemen Capaian Pembelajaran"].forEach(elem => {
            doc.setFont("helvetica", "bold");
            doc.text(elem.Elemen, pageMargin, yPos);
            yPos += 5;

            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(elem.Deskripsi, usableWidth);
            doc.text(descLines, pageMargin, yPos);
            yPos += (descLines.length * 4) + 3;
        });
        yPos += 5;
    }

    // --- Part 2: Generate Table ---
    const head = [tableHeaders.map(h => h.replace(/_/g, ' ').toUpperCase())];
    const body = itemsToRender.map(item => tableHeaders.map(header => String(item[header] !== null && item[header] !== undefined ? item[header] : '')));

    autoTable(doc, {
      startY: yPos,
      head: head,
      body: body,
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        1: { cellWidth: 'auto' }, // Alur Tujuan Pembelajaran
      }
    });

    // --- Part 3: Save PDF ---
    doc.save("Prota_Generated.pdf");
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '900px', mx: 'auto' }}>
        <Stack spacing={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">Wizard Generator Dokumen</Typography>
            <Typography variant="subtitle1" color="text.secondary">Buat dokumen kurikulum Anda secara otomatis.</Typography>
          </Box>

          <AnimatePresence>
            {alertInfo.show && (
              <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
            )}
          </AnimatePresence>
          
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 1: Pilih Konteks Kelas</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Pilih Kelas</InputLabel>
              <Select
                label="Pilih Kelas"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isGenerating}
              >
                {myClasses.map((cls) => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {`${cls.subject.name} - Kelas ${cls.grade_level}${cls.parallel_class}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, opacity: selectedClass ? 1 : 0.5 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 2: Program Tahunan (Prota)</Typography>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={initiateGenerationAndListen}
                disabled={!selectedClass || isGenerating}
                sx={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isGenerating ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Sedang Membuat...
                  </>
                ) : (
                  'Buat Draf Prota'
                )}
              </Button>
            </Box>
            <AnimatePresence>
              {isGenerating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProgressDisplay progress={progress} text={progressText} />
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>

          <AnimatePresence>
            {itemsToRender.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Paper elevation={3} sx={{ p: 3, mt: 2, borderRadius: 3 }}>
                  <Typography variant="h6" gutterBottom>Hasil Draf Prota</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Draf ini sudah tersimpan otomatis di akun Anda. Anda dapat mengekspornya di bawah ini.
                  </Typography>

                  {docStructure && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {docStructure.Judul || "Program Tahunan"}
                      </Typography>

                      <Box sx={{ mb: 2, p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Identitas Dokumen</Typography>
                        {Object.entries(docStructure["Identitas Dokumen"] || {}).map(([key, val]) => (
                          <Typography key={key} variant="body2" sx={{ display: 'flex' }}>
                            <Box component="strong" sx={{ minWidth: '120px', mr: 1 }}>{key}</Box>: {val}
                          </Typography>
                        ))}
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>Capaian Pembelajaran Umum</Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {docStructure["Capaian Pembelajaran Umum"]}
                        </Typography>
                      </Box>

                      {Array.isArray(docStructure["Elemen Capaian Pembelajaran"]) && (
                        <Box>
                          <Typography variant="h6" fontWeight={600} gutterBottom>
                            Elemen Capaian Pembelajaran
                          </Typography>
                          {docStructure["Elemen Capaian Pembelajaran"].map((elemen, idx) => (
                            <Box key={idx} sx={{ mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {elemen.Elemen}
                              </Typography>
                              <Typography variant="body2">
                                {elemen.Deskripsi}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                      <Divider sx={{ my: 3 }} />
                    </Box>
                  )}

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
                        <TableRow>
                          {tableHeaders.map((header) => (
                            <TableCell key={header} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                              {header.replace(/_/g, ' ')}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itemsToRender.map((item, index) => (
                          <TableRow key={index} sx={ item.Unit ? { backgroundColor: theme.palette.grey[100] } : {} }>
                            {tableHeaders.map((header) => (
                              <TableCell 
                                key={header} 
                                sx={{ 
                                  fontWeight: item.Unit && header === 'Unit' ? 'bold' : 'normal',
                                  whiteSpace: header === 'Alur Tujuan Pembelajaran' ? 'pre-wrap' : 'normal',
                                  verticalAlign: 'top'
                                }}
                              >
                                {item[header] !== null && item[header] !== undefined ? String(item[header]) : ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Divider sx={{ my: 3 }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                    <Button variant="outlined" onClick={handleDownloadDocx}>
                      Download as .DOCX
                    </Button>
                    <Button variant="outlined" onClick={handleDownloadPdf}>
                      Download as .PDF
                    </Button>
                  </Stack>
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>
        </Stack>
      </Box>
    </motion.div>
  );
};

export default GeneratorWizardPage;