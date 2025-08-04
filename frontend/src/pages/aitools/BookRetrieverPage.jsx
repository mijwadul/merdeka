// frontend/src/pages/aitools/BookRetrieverPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Button, Paper, Stack,
  CircularProgress, FormControl, InputLabel, Select, MenuItem, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
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

const BookRetrieverPage = () => {
  const theme = useTheme();
  const [file, setFile] = useState(null);
  const [jenjang, setJenjang] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [kelas, setKelas] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: '', text: '' });

  const createAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${getAuthToken()}` }});

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get('/api/subjects', createAuthHeaders());
        setSubjects(res.data);
      } catch (err) {
        console.error("Gagal mengambil daftar mata pelajaran:", err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (jenjang === 'SD') setAvailableClasses([1, 2, 3, 4, 5, 6]);
    else if (jenjang === 'SMP') setAvailableClasses([7, 8, 9]);
    else if (jenjang === 'SMA') setAvailableClasses([10, 11, 12]);
    else setAvailableClasses([]);
    setKelas('');
  }, [jenjang]);

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jenjang || !mapelId || !kelas) {
      setAlertInfo({ type: 'error', show: true, title: 'Data Tidak Lengkap', message: 'Semua field wajib diisi.' });
      return;
    }
    setIsLoading(true);
    setAlertInfo({ show: false });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenjang', jenjang);
    formData.append('mapel_id', mapelId);
    formData.append('kelas', kelas);

    try {
      const response = await axios.post('/api/books/upload', formData, {
        headers: { ...createAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      setAlertInfo({ type: 'success', show: true, title: 'Berhasil', message: `Buku berhasil diunggah! ID: ${response.data.book_id}` });
      setFile(null); setJenjang(''); setMapelId(''); setKelas('');
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
            <Typography variant="h4" gutterBottom fontWeight="bold">Book Retriever</Typography>
            <Typography variant="subtitle1" color="text.secondary">Unggah buku ajar (.pdf). Sistem akan mengekstrak teks, daftar isi, dan gambar.</Typography>
          </Box>
          
          <AnimatePresence>{alertInfo.show && <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}</AnimatePresence>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 1: Unggah File Buku</Typography>
            <Box {...getRootProps()} sx={{ border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`, borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s, background-color 0.3s', backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent', '&:hover': { borderColor: theme.palette.primary.light } }}>
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography>{isDragActive ? 'Lepaskan file di sini...' : 'Seret & lepas file PDF buku di sini, atau klik'}</Typography>
            </Box>
            <AnimatePresence>
              {file && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Paper variant="outlined" sx={{ mt: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}><InsertDriveFileIcon color="primary" /><Box><Typography fontWeight={500}>{file.name}</Typography></Box></Paper>
              </motion.div>}
            </AnimatePresence>
          </Paper>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 2: Tentukan Detail Buku</Typography>
            {/* --- PERBAIKAN DI SINI: Mengganti Grid dengan Stack --- */}
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Jenjang</InputLabel>
                <Select label="Jenjang" value={jenjang} onChange={(e) => setJenjang(e.target.value)}>
                  <MenuItem value="SD">SD</MenuItem>
                  <MenuItem value="SMP">SMP</MenuItem>
                  <MenuItem value="SMA">SMA</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Mata Pelajaran</InputLabel>
                <Select label="Mata Pelajaran" value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
                  {subjects.map((s) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth required disabled={!jenjang}>
                <InputLabel>Kelas</InputLabel>
                <Select label="Kelas" value={kelas} onChange={(e) => setKelas(e.target.value)}>
                  {availableClasses.map((g) => (<MenuItem key={g} value={g}>{g}</MenuItem>))}
                </Select>
              </FormControl>
            </Stack>
            {/* --- AKHIR PERBAIKAN --- */}
          </Paper>

          <Box sx={{ textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={isLoading || !file} sx={{ minWidth: { xs: '100%', sm: '300px' }, py: 1.5, position: 'relative' }}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Unggah & Proses Buku'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );
};

export default BookRetrieverPage;