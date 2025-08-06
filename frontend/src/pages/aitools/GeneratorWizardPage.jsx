// frontend/src/pages/aitools/GeneratorWizardPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel,
  Select, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, useTheme,
  LinearProgress, Divider // Ditambahkan Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CustomAlert from '../../components/common/CustomAlert';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// --- AKHIR BAGIAN BARU ---

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
      setAlertInfo({ show: true, type: 'error', title: 'Error', message: 'Gagal terhubung ke server.' });
      setIsGenerating(false);
    }
  };

  let itemsToRender = [];
  let tableHeaders = [];

  if (generatedProta && generatedProta.data) {
    const data = generatedProta.data;
    const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
    if (firstArrayKey) {
      itemsToRender = data[firstArrayKey];
      if (itemsToRender.length > 0) {
        tableHeaders = Object.keys(itemsToRender[0]);
      }
    }
  }

  // --- BAGIAN BARU: Fungsi untuk menangani download DOCX ---
  const handleDownloadDocx = () => {
    if (itemsToRender.length === 0) return;

    const headerRow = new DocxTableRow({
      children: tableHeaders.map(header => new DocxTableCell({
        children: [new Paragraph({ text: header.replace(/_/g, ' ').toUpperCase(), bold: true })],
      })),
    });

    const dataRows = itemsToRender.map(item => new DocxTableRow({
      children: tableHeaders.map(header => new DocxTableCell({
        children: [new Paragraph(String(item[header] !== null ? item[header] : ''))],
      })),
    }));

    const table = new DocxTable({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "Hasil Draf Program Tahunan (Prota)", heading: "Heading1" }),
          table,
        ],
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, "Prota_Generated.docx");
    });
  };

  // --- BAGIAN BARU: Fungsi untuk menangani download PDF ---
  const handleDownloadPdf = () => {
    if (itemsToRender.length === 0) return;
    const doc = new jsPDF();

    doc.text("Hasil Draf Program Tahunan (Prota)", 14, 15);

    const head = [tableHeaders.map(h => h.replace(/_/g, ' ').toUpperCase())];
    const body = itemsToRender.map(item => tableHeaders.map(header => String(item[header] !== null ? item[header] : '')));

    autoTable(doc,{
      startY: 20,
      head: head,
      body: body,
    });

    doc.save("Prota_Generated.pdf");
  };
  // --- AKHIR BAGIAN BARU ---

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
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={initiateGenerationAndListen}
                disabled={!selectedClass || isGenerating}
                sx={{ minWidth: 200 }}
              >
                {isGenerating ? 'Sedang Membuat...' : 'Buat Draf Prota'}
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
                  
                  {/* --- BAGIAN BARU: Teks informasi simpan otomatis --- */}
                  <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                    Draf ini sudah tersimpan otomatis di akun Anda. Anda dapat mengekspornya di bawah ini.
                  </Typography>
                  {/* --- AKHIR BAGIAN BARU --- */}

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
                          <TableRow key={index}>
                            {Object.values(item).map((value, valueIndex) => (
                              // --- PERBAIKAN: Menghilangkan 'null' dari tampilan ---
                              <TableCell key={valueIndex}>
                                {value !== null ? String(value) : ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* --- BAGIAN BARU: Tombol-tombol download --- */}
                  <Divider sx={{ my: 3 }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                    <Button variant="outlined" onClick={handleDownloadDocx}>
                      Download as .DOCX
                    </Button>
                    <Button variant="outlined" onClick={handleDownloadPdf}>
                      Download as .PDF
                    </Button>
                  </Stack>
                  {/* --- AKHIR BAGIAN BARU --- */}

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