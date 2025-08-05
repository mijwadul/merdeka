// frontend/src/pages/aitools/GeneratorWizardPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import CustomAlert from '../../components/common/CustomAlert';

const getAuthToken = () => localStorage.getItem('authToken');
const createAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${getAuthToken()}` } });

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween', ease: 'anticipate', duration: 0.5,
};

const GeneratorWizardPage = () => {
  const theme = useTheme();
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedProta, setGeneratedProta] = useState(null);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });

  useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        const response = await axios.get('/api/my-classes', createAuthHeaders());
        setMyClasses(response.data);
      } catch (error) {
        console.error("Gagal mengambil daftar kelas:", error);
        setAlertInfo({ show: true, type: 'error', title: 'Gagal Memuat', message: 'Tidak dapat mengambil daftar kelas Anda.' });
      }
    };
    fetchMyClasses();
  }, []);

  const handleGenerateProta = async () => {
    if (!selectedClass) {
      setAlertInfo({ show: true, type: 'warning', title: 'Peringatan', message: 'Silakan pilih kelas terlebih dahulu.' });
      return;
    }
    setIsLoading(true);
    setGeneratedProta(null);
    setAlertInfo({ show: false });

    try {
      const response = await axios.post('/api/wizard/generate/prota', { class_id: selectedClass }, createAuthHeaders());
      setGeneratedProta(response.data);
      setAlertInfo({ show: true, type: 'success', title: 'Berhasil!', message: response.data.msg });
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', title: 'Proses Gagal', message: error.response?.data?.msg || 'Terjadi kesalahan pada server.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIKA CERDAS UNTUK MENEMUKAN ARRAY & HEADER TABEL ---
  let itemsToRender = [];
  let tableHeaders = [];

  if (generatedProta && generatedProta.data) {
    const data = generatedProta.data;
    let potentialArray = null;

    if (Array.isArray(data)) {
      potentialArray = data;
    } else if (data.items && Array.isArray(data.items)) {
      potentialArray = data.items;
    } else {
      const firstArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
      if (firstArrayKey) {
        potentialArray = data[firstArrayKey];
      }
    }

    if (potentialArray && potentialArray.length > 0) {
      itemsToRender = potentialArray;
      // Ambil header dari keys objek pertama di dalam array
      tableHeaders = Object.keys(itemsToRender[0]);
    }
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '900px', mx: 'auto' }}>
        <Stack spacing={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">Wizard Generator Dokumen</Typography>
            <Typography variant="subtitle1" color="text.secondary">Buat dokumen kurikulum Anda secara bertahap.</Typography>
          </Box>

          <AnimatePresence>{alertInfo.show && <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}</AnimatePresence>

          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Langkah 1: Pilih Konteks Kelas</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Pilih Kelas</InputLabel>
              <Select label="Pilih Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
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
              <Button variant="contained" size="large" onClick={handleGenerateProta} disabled={!selectedClass || isLoading} sx={{ minWidth: 200 }}>
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Buat Draf Prota'}
              </Button>
            </Box>
          </Paper>

          <AnimatePresence>
            {itemsToRender.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Paper elevation={3} sx={{ p: 3, mt: 2, borderRadius: 3 }}>
                  <Typography variant="h6" gutterBottom>Hasil Draf Prota</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
                        <TableRow>
                          {/* --- HEADER TABEL DIBUAT SECARA DINAMIS --- */}
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
                            {/* Object.values(item) akan mengambil semua nilai dari objek 'item' 
                              sebagai sebuah array, lalu kita map untuk membuat sel tabel.
                              Ini memastikan urutannya sama persis dengan header.
                            */}
                            {Object.values(item).map((value, valueIndex) => (
                              <TableCell key={valueIndex}>{String(value)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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