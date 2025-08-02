// frontend/src/pages/aitools/BookRetrieverPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Button, Paper, Grid, TextField,
  CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const BookRetrieverPage = () => {
  const [file, setFile] = useState(null);
  const [jenjang, setJenjang] = useState('');
  const [mapelId, setMapelId] = useState(''); // Ganti ke mapelId
  const [kelas, setKelas] = useState(''); // State baru untuk kelas
  
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const token = localStorage.getItem('authToken');

  // Ambil daftar mata pelajaran saat komponen dimuat
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/subjects', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableSubjects(res.data);
      } catch (err) {
        console.error("Gagal mengambil daftar mata pelajaran:", err);
      }
    };
    fetchSubjects();
  }, [token]);

  // Update daftar kelas berdasarkan jenjang yang dipilih
  useEffect(() => {
    if (jenjang === 'SD') setAvailableClasses([1, 2, 3, 4, 5, 6]);
    else if (jenjang === 'SMP') setAvailableClasses([7, 8, 9]);
    else if (jenjang === 'SMA') setAvailableClasses([10, 11, 12]);
    else setAvailableClasses([]);
    setKelas(''); // Reset pilihan kelas saat jenjang berubah
  }, [jenjang]);

  const onDrop = useCallback(acceptedFiles => {
    setFile(acceptedFiles[0]);
    setMessage({ type: '', text: '' });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jenjang || !mapelId || !kelas) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi.' });
      return;
    }
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jenjang', jenjang);
    formData.append('mapel_id', mapelId);
    formData.append('kelas', kelas);

    try {
      const response = await fetch('http://localhost:5000/api/books/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Buku berhasil diunggah! ID: ${data.book_id}` });
        setFile(null);
        setJenjang('');
        setMapelId('');
        setKelas('');
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
      <Typography variant="h4" gutterBottom fontWeight="bold">Book Retriever</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        Unggah buku ajar (.pdf). Sistem akan mengekstrak teks, daftar isi, dan gambar secara otomatis.
      </Typography>

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box {...getRootProps()} sx={{ border: '2px dashed', borderColor: 'grey.400', borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', bgcolor: isDragActive ? 'action.hover' : 'background.default' }}>
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 50, color: 'primary.main' }} />
              <Typography>{isDragActive ? 'Lepaskan file di sini...' : 'Seret & lepas file PDF buku di sini, atau klik'}</Typography>
            </Box>
            {file && <Box display="flex" alignItems="center" mt={2}><CheckCircleIcon color="success" sx={{ mr: 1 }} /><Typography>File: {file.name}</Typography></Box>}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Jenjang</InputLabel>
              <Select label="Jenjang" value={jenjang} onChange={(e) => setJenjang(e.target.value)}>
                <MenuItem value="SD">SD</MenuItem>
                <MenuItem value="SMP">SMP</MenuItem>
                <MenuItem value="SMA">SMA</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Mata Pelajaran</InputLabel>
              <Select label="Mata Pelajaran" value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
                {availableSubjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth required disabled={!jenjang}>
              <InputLabel>Kelas</InputLabel>
              <Select label="Kelas" value={kelas} onChange={(e) => setKelas(e.target.value)}>
                {availableClasses.map((grade) => (
                  <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              disabled={isLoading || !file || !jenjang || !mapelId || !kelas} 
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            >
              {isLoading ? 'Memproses...' : 'Unggah & Proses Buku'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default BookRetrieverPage;