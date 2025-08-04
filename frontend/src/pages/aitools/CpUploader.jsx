// frontend/src/pages/aitools/CpUploader.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box, Typography, Paper, Button, Select, MenuItem,
  FormControl, InputLabel, TextField, CircularProgress, Stack, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axios from 'axios';

import CustomAlert from '../../components/common/CustomAlert';

// Asumsi: Anda memiliki fungsi untuk mengambil token dari localStorage/cookies
// Sesuaikan jika nama item di localStorage Anda berbeda.
const getAuthToken = () => localStorage.getItem('authToken');

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

function CpUploader() {
  const theme = useTheme();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [otherSubject, setOtherSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });

  // Fungsi untuk membuat header otentikasi
  const createAuthHeaders = () => ({
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });

  // Fungsi untuk mengambil daftar subject dari backend
  const fetchSubjects = useCallback(async () => {
    try {
      const response = await axios.get('/api/subjects', createAuthHeaders());
      setSubjects(response.data);
    } catch (error) {
      console.error("Gagal mengambil daftar subject:", error);
      setAlertInfo({ show: true, type: 'error', title: 'Gagal Memuat', message: 'Tidak dapat mengambil daftar mata pelajaran dari server.' });
    }
  }, []);

  // Ambil data subject saat halaman pertama kali dibuka
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: false,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isOtherSelected = selectedSubject === 'other';

    if (!selectedFile || (!selectedSubject || (isOtherSelected && !otherSubject.trim()))) {
      setAlertInfo({ show: true, type: 'error', title: 'Data Tidak Lengkap', message: 'Harap unggah file dan pilih atau isi mata pelajaran.' });
      return;
    }

    setIsLoading(true);
    setAlertInfo({ show: false });

    try {
      let subjectIdToSubmit;

      // ALUR CERDAS: Jika user memilih "Lainnya...", buat subject baru dulu
      if (isOtherSelected) {
        // Langkah 1: Kirim request untuk membuat subject baru
        const createSubjectResponse = await axios.post(
          '/api/subjects',
          { name: otherSubject },
          createAuthHeaders()
        );
        // Ambil ID dari subject yang baru saja dibuat
        subjectIdToSubmit = createSubjectResponse.data.id;
      } else {
        // Jika memilih dari dropdown, langsung gunakan ID yang ada
        subjectIdToSubmit = selectedSubject;
      }

      // Langkah 2: Lanjutkan dengan upload file menggunakan ID yang sudah valid
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('subject_id', subjectIdToSubmit);

      const uploadResponse = await axios.post('/api/cp/upload-and-parse', formData, {
        headers: {
          ...createAuthHeaders().headers,
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setAlertInfo({ show: true, type: 'success', title: 'Berhasil!', message: uploadResponse.data.message });
      
      // Reset form ke kondisi awal
      setSelectedFile(null);
      setSelectedSubject('');
      setOtherSubject('');
      
      // Refresh daftar subject agar yang baru muncul di dropdown
      fetchSubjects();
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Terjadi kesalahan pada server.';
      setAlertInfo({ show: true, type: 'error', title: 'Proses Gagal', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '700px', mx: 'auto' }}>
        <Stack spacing={4} component="form" onSubmit={handleSubmit}>
          {/* Judul Halaman */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Unggah Capaian Pembelajaran (CP)
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Ikuti 3 langkah mudah untuk memproses dokumen CP Anda.
            </Typography>
          </Box>

          {/* Alert Notifikasi */}
          <AnimatePresence>
            {alertInfo.show && (
              <CustomAlert {...alertInfo} show={alertInfo.show} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
            )}
          </AnimatePresence>

          {/* Langkah 1: Drag and Drop */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 1: Unggah File</Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
                borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.3s, background-color 0.3s',
                backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
                '&:hover': { borderColor: theme.palette.primary.light }
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography>
                {isDragActive ? 'Lepaskan file di sini...' : 'Seret & lepas file .txt di sini, atau klik untuk memilih file'}
              </Typography>
            </Box>
            <AnimatePresence>
              {selectedFile && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Paper variant="outlined" sx={{ mt: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <InsertDriveFileIcon color="primary" />
                    <Box>
                      <Typography fontWeight={500}>{selectedFile.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{(selectedFile.size / 1024).toFixed(2)} KB</Typography>
                    </Box>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>

          {/* Langkah 2: Pilih Mata Pelajaran */}
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 2: Pilih Mata Pelajaran</Typography>
            <FormControl fullWidth>
              <InputLabel id="subject-select-label">Mata Pelajaran</InputLabel>
              <Select
                labelId="subject-select-label"
                value={selectedSubject}
                label="Mata Pelajaran"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjects.map((sub) => (
                  <MenuItem key={sub.id} value={sub.id}>{sub.name}</MenuItem>
                ))}
                <MenuItem value="other">Lainnya (Ketik Baru)...</MenuItem>
              </Select>
            </FormControl>
            <AnimatePresence>
              {selectedSubject === 'other' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 16 }} exit={{ opacity: 0, height: 0 }}>
                  <TextField
                    fullWidth
                    label="Ketik Nama Mata Pelajaran Baru"
                    value={otherSubject}
                    onChange={(e) => setOtherSubject(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>

          {/* Langkah 3: Tombol Submit */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading || !selectedFile || (!selectedSubject && !otherSubject.trim())}
              sx={{ 
                minWidth: { xs: '100%', sm: '300px' }, 
                py: 1.5,
                position: 'relative' 
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: 'white', position: 'absolute' }} />
              ) : (
                'Proses Dokumen CP'
              )}
            </Button>
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );
}

export default CpUploader;