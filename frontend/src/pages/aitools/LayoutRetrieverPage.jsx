// frontend/src/pages/aitools/LayoutRetrieverPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Button, Paper, Grid, TextField,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Stack, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axios from 'axios';
import CustomAlert from '../../components/common/CustomAlert';

const getAuthToken = () => localStorage.getItem('authToken');

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween', ease: 'anticipate', duration: 0.5,
};

const LayoutRetrieverPage = () => {
  const theme = useTheme();
  const [file, setFile] = useState(null);
  const [jenjang, setJenjang] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [customMapel, setCustomMapel] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [tipeDokumen, setTipeDokumen] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });

  const createAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${getAuthToken()}` }});

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        // --- THIS IS THE CORRECTED LINE ---
        const response = await axios.get('http://localhost:5000/api/subjects', createAuthHeaders());
        setSubjects(response.data);
      } catch (error) {
        console.error("Gagal mengambil daftar subject:", error);
      }
    };
    fetchSubjects();
  }, []);

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isCustomMapel = mapelId === '__custom__';
    const mapelNameToSubmit = isCustomMapel ? customMapel.trim() : subjects.find(s => s.id === mapelId)?.name;

    if (!file || !jenjang || !mapelNameToSubmit || !tipeDokumen) {
      setAlertInfo({ type: 'error', show: true, title: 'Data Tidak Lengkap', message: 'Semua field wajib diisi.' });
      return;
    }
    setIsLoading(true);
    setAlertInfo({ show: false });

    try {
      let subjectIdToSubmit = mapelId;
      if (isCustomMapel) {
        const res = await axios.post('http://localhost:5000/api/subjects', { name: mapelNameToSubmit }, createAuthHeaders());
        subjectIdToSubmit = res.data.id;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('jenjang', jenjang);
      formData.append('mapel', mapelNameToSubmit); 
      formData.append('tipe_dokumen', tipeDokumen);

      const response = await axios.post('http://localhost:5000/api/layouts/upload', formData, {
        headers: { ...createAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      
      setAlertInfo({ type: 'success', show: true, title: 'Berhasil', message: `Layout berhasil diunggah! ID: ${response.data.layout_id}` });
      setFile(null); setJenjang(''); setMapelId(''); setCustomMapel(''); setTipeDokumen('');
      if (isCustomMapel) {
        // Refresh subject list
        const subjectRes = await axios.get('http://localhost:5000/api/subjects', createAuthHeaders());
        setSubjects(subjectRes.data);
      }
    } catch (error) {
      setAlertInfo({ type: 'error', show: true, title: 'Upload Gagal', message: error.response?.data?.msg || 'Terjadi kesalahan.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '700px', mx: 'auto' }}>
        <Stack spacing={4} component="form" onSubmit={handleSubmit}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">Layout Retriever</Typography>
            <Typography variant="subtitle1" color="text.secondary">Unggah file template (.docx atau .pdf) untuk dijadikan acuan oleh AI.</Typography>
          </Box>

          <AnimatePresence>{alertInfo.show && <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}</AnimatePresence>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 1: Unggah File Layout</Typography>
            <Box {...getRootProps()} sx={{ border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`, borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s, background-color 0.3s', backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent', '&:hover': { borderColor: theme.palette.primary.light } }}>
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography>{isDragActive ? 'Lepaskan file di sini...' : 'Seret & lepas file .docx/.pdf di sini, atau klik'}</Typography>
            </Box>
            <AnimatePresence>
              {file && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Paper variant="outlined" sx={{ mt: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}><InsertDriveFileIcon color="primary" /><Box><Typography fontWeight={500}>{file.name}</Typography></Box></Paper>
              </motion.div>}
            </AnimatePresence>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 2: Lengkapi Detail</Typography>
            <Stack spacing={3}>
              <FormControl fullWidth required><InputLabel>Jenjang</InputLabel><Select label="Jenjang" value={jenjang} onChange={(e) => setJenjang(e.target.value)}><MenuItem value="SD">SD</MenuItem><MenuItem value="SMP">SMP</MenuItem><MenuItem value="SMA">SMA</MenuItem></Select></FormControl>
              <FormControl fullWidth required><InputLabel>Mata Pelajaran</InputLabel><Select label="Mata Pelajaran" value={mapelId} onChange={(e) => setMapelId(e.target.value)}>{subjects.map((s) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}<MenuItem value="__custom__"><Typography variant="body2" fontStyle="italic">Lainnya...</Typography></MenuItem></Select></FormControl>
              <AnimatePresence>{mapelId === '__custom__' && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}><TextField fullWidth required label="Ketik Mata Pelajaran Baru" value={customMapel} onChange={(e) => setCustomMapel(e.target.value)} /></motion.div>}</AnimatePresence>
              <FormControl fullWidth required><InputLabel>Tipe Dokumen</InputLabel><Select label="Tipe Dokumen" value={tipeDokumen} onChange={(e) => setTipeDokumen(e.target.value)}><MenuItem value="Prota">Program Tahunan (Prota)</MenuItem><MenuItem value="Promes">Program Semester (Promes)</MenuItem><MenuItem value="ATP">Alur Tujuan Pembelajaran (ATP)</MenuItem><MenuItem value="Modul Ajar">Modul Ajar</MenuItem></Select></FormControl>
            </Stack>
          </Paper>
          
          <Box sx={{ textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={isLoading} sx={{ minWidth: { xs: '100%', sm: '300px' }, py: 1.5, position: 'relative' }}>{isLoading ? <CircularProgress size={24} color="inherit" /> : 'Unggah & Simpan Layout'}</Button>
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );
};

export default LayoutRetrieverPage;