// frontend/src/pages/aitools/LayoutRetrieverPage.jsx

import React, { useState, useCallback, useContext } from 'react'; // Import useContext
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Button, Paper, Grid, TextField,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AuthContext from '../../context/AuthContext'; // Ganti path jika berbeda

const daftarMapelUmum = [
  'Bahasa Indonesia', 'Matematika', 'IPA (Ilmu Pengetahuan Alam)',
  'IPS (Ilmu Pengetahuan Sosial)', 'Pendidikan Pancasila', 'Bahasa Inggris',
  'Seni Budaya', 'PJOK (Pendidikan Jasmani, Olahraga, dan Kesehatan)',
];

const LayoutRetrieverPage = () => {
  const [file, setFile] = useState(null);
  const [jenjang, setJenjang] = useState('');
  const [mapel, setMapel] = useState('');
  const [customMapel, setCustomMapel] = useState('');
  const [mapelList, setMapelList] = useState(daftarMapelUmum);
  const [tipeDokumen, setTipeDokumen] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { user } = useContext(AuthContext); // Gunakan user dari context

  // Ambil token dari local storage
  const token = localStorage.getItem('authToken');

  const handleMapelChange = (event) => {
    const value = event.target.value;
    setMapel(value);
    if (value !== '__custom__') setCustomMapel('');
  };

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
    setMessage({ type: '', text: '' });
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
    const mapelToSend = mapel === '__custom__' ? customMapel : mapel;

    if (!file || !jenjang || !mapelToSend || !tipeDokumen) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi dan file harus dipilih.' });
      return;
    }
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenjang', jenjang);
    formData.append('mapel', mapelToSend);
    formData.append('tipe_dokumen', tipeDokumen);

    try {
      // --- PERBAIKAN DI SINI ---
      // Gunakan URL lengkap ke API backend
      const response = await fetch('http://localhost:5000/api/layouts/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      // --- AKHIR PERBAIKAN ---
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Layout berhasil diunggah! ID: ${data.layout_id}` });
        if (mapel === '__custom__' && !mapelList.includes(customMapel)) {
          setMapelList(prevList => [...prevList, customMapel]);
        }
        setFile(null); setJenjang(''); setMapel(''); setCustomMapel(''); setTipeDokumen('');
      } else {
        setMessage({ type: 'error', text: data.msg || 'Terjadi kesalahan saat mengunggah.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Layout Retriever</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Unggah file template (.docx atau .pdf) untuk dijadikan acuan oleh AI.
      </Typography>

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box {...getRootProps()} sx={{ border: '2px dashed', borderColor: 'grey.400', borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', bgcolor: isDragActive ? 'action.hover' : 'background.default' }}>
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 50, color: 'primary.main' }} />
              <Typography>{isDragActive ? 'Lepaskan file di sini...' : 'Seret & lepas file di sini, atau klik'}</Typography>
            </Box>
            {file && <Box display="flex" alignItems="center" mt={2}><CheckCircleIcon color="success" sx={{ mr: 1 }} /><Typography>File: {file.name}</Typography></Box>}
          </Grid>
          
          <Grid item xs={12}><FormControl fullWidth required><InputLabel>Jenjang</InputLabel><Select label="Jenjang" value={jenjang} onChange={(e) => setJenjang(e.target.value)}><MenuItem value="SD">SD</MenuItem><MenuItem value="SMP">SMP</MenuItem><MenuItem value="SMA">SMA</MenuItem></Select></FormControl></Grid>
          
          <Grid item xs={12}><FormControl fullWidth required><InputLabel>Mata Pelajaran</InputLabel><Select label="Mata Pelajaran" value={mapel} onChange={handleMapelChange}>{mapelList.map((namaMapel) => (<MenuItem key={namaMapel} value={namaMapel}>{namaMapel}</MenuItem>))}<MenuItem value="__custom__"><Typography variant="body2" fontStyle="italic">Lainnya (Ketik Manual)...</Typography></MenuItem></Select></FormControl></Grid>
          
          {mapel === '__custom__' && <Grid item xs={12}><TextField fullWidth required label="Ketik Mata Pelajaran Baru" value={customMapel} onChange={(e) => setCustomMapel(e.target.value)} helperText="Mata pelajaran ini akan disimpan."/></Grid>}
           
          <Grid item xs={12}><FormControl fullWidth required><InputLabel>Tipe Dokumen</InputLabel><Select label="Tipe Dokumen" value={tipeDokumen} onChange={(e) => setTipeDokumen(e.target.value)}><MenuItem value="Prota">Program Tahunan (Prota)</MenuItem><MenuItem value="Promes">Program Semester (Promes)</MenuItem><MenuItem value="ATP">Alur Tujuan Pembelajaran (ATP)</MenuItem><MenuItem value="Modul Ajar">Modul Ajar</MenuItem></Select></FormControl></Grid>
          
          <Grid item xs={12}><Button type="submit" variant="contained" size="large" disabled={isLoading || !file} startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}>{isLoading ? 'Memproses...' : 'Unggah & Simpan Layout'}</Button></Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LayoutRetrieverPage;