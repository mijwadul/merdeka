// frontend/src/components/ai/LayoutListPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Tooltip, Stack, IconButton,
  Modal, TextField, Select, MenuItem, FormControl, InputLabel, Button, useTheme
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

// Menggunakan komponen dan service kustom Anda
import { generatePdfFromLayout } from '../../services/pdfGenerator';
import ConfirmationModal from '../common/ConfirmationModal';
import CustomAlert from '../common/CustomAlert';

const getAuthToken = () => localStorage.getItem('authToken');
const createAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${getAuthToken()}` } });

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const LayoutListPage = () => {
  const theme = useTheme(); // Menggunakan tema kustom
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // --- State untuk modal & notifikasi ---
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedLayoutJson, setSelectedLayoutJson] = useState(null);
  const [editingLayout, setEditingLayout] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: () => {} });
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });

  // --- Style untuk modal yang menggunakan theme ---
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 800,
    bgcolor: 'background.paper',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '12px',
    boxShadow: 24,
    p: 4,
  };

  const fetchLayouts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/layouts/', createAuthHeaders());
      setLayouts(response.data);
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', message: 'Gagal mengambil daftar layout.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLayouts(); }, []);

  // --- Fungsi Handler yang Diperbarui ---

  const handleDownload = async (layoutId) => {
    setDownloadingId(layoutId);
    try {
      const response = await axios.get(`http://localhost:5000/api/layouts/${layoutId}`, createAuthHeaders());
      generatePdfFromLayout(response.data);
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', message: 'Gagal membuat file PDF.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewJson = async (layoutId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/layouts/${layoutId}`, createAuthHeaders());
      setSelectedLayoutJson(response.data.layout_json);
      setViewModalOpen(true);
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', message: 'Gagal memuat data JSON.' });
    }
  };

  const handleOpenEditModal = (layout) => {
    setEditingLayout({ ...layout });
    setEditModalOpen(true);
  };

  const handleUpdateLayout = async () => {
    if (!editingLayout) return;
    try {
      await axios.put(`http://localhost:5000/api/layouts/${editingLayout.id}`, {
        jenjang: editingLayout.jenjang,
        mapel: editingLayout.mapel,
        tipe_dokumen: editingLayout.tipe_dokumen,
      }, createAuthHeaders());
      setEditModalOpen(false);
      fetchLayouts();
      setAlertInfo({ show: true, type: 'success', message: 'Layout berhasil diperbarui!' });
    } catch(error) {
      setAlertInfo({ show: true, type: 'error', message: 'Gagal memperbarui layout.' });
    }
  };
  
  const handleDelete = (layoutId) => {
    setConfirmModal({
      isOpen: true,
      onConfirm: () => {
        confirmDelete(layoutId);
      }
    });
  };

  const confirmDelete = async (layoutId) => {
    try {
      await axios.delete(`http://localhost:5000/api/layouts/${layoutId}`, createAuthHeaders());
      setLayouts(prevLayouts => prevLayouts.filter(layout => layout.id !== layoutId));
      setAlertInfo({ show: true, type: 'success', message: 'Layout berhasil dihapus.' });
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', message: 'Gagal menghapus layout.' });
    } finally {
      setConfirmModal({ isOpen: false, onConfirm: () => {} });
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <AnimatePresence>
        {alertInfo.show && <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />}
      </AnimatePresence>
      
      <ConfirmationModal
        open={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, onConfirm: () => {} })}
        onConfirm={confirmModal.onConfirm}
        title="Konfirmasi Penghapusan"
        message="Apakah Anda yakin ingin menghapus layout ini secara permanen? Aksi ini tidak dapat dibatalkan."
      />

      <Typography variant="h4" fontWeight="bold">Database Layout</Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Kelola semua layout yang telah dianalisis oleh AI.</Typography>

      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead><TableRow sx={{ '& th': { fontWeight: 'bold' } }}><TableCell>Tipe Dokumen</TableCell><TableCell>Mata Pelajaran</TableCell><TableCell>Jenjang</TableCell><TableCell>Nama File</TableCell><TableCell align="center">Aksi</TableCell></TableRow></TableHead>
            <TableBody>
              {layouts.map((layout) => (
                <TableRow key={layout.id} hover>
                  <TableCell>{layout.tipe_dokumen}</TableCell><TableCell>{layout.mapel}</TableCell><TableCell>{layout.jenjang}</TableCell><TableCell>{layout.file_name}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Lihat JSON"><IconButton onClick={() => handleViewJson(layout.id)}><VisibilityIcon /></IconButton></Tooltip>
                      <Tooltip title="Edit Metadata"><IconButton onClick={() => handleOpenEditModal(layout)}><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton onClick={() => handleDownload(layout.id)} disabled={downloadingId === layout.id}>
                          {downloadingId === layout.id ? <CircularProgress size={22} /> : <DownloadIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus"><IconButton onClick={() => handleDelete(layout.id)} color="error"><DeleteIcon /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      <AnimatePresence>
        {isViewModalOpen && (
          <Modal open={isViewModalOpen} onClose={() => setViewModalOpen(false)}>
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <Box sx={modalStyle}>
                <Typography variant="h6" component="h2">Raw JSON Data</Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 2, maxHeight: '60vh', overflowY: 'auto' }}><pre>{JSON.stringify(selectedLayoutJson, null, 2)}</pre></Paper>
              </Box>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && (
          <Modal open={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
             <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit">
              <Box sx={modalStyle}>
                <Typography variant="h6" component="h2">Edit Metadata Layout</Typography>
                {editingLayout && (
                  <Stack spacing={3} sx={{ mt: 2 }}>
                    <TextField label="Mata Pelajaran" value={editingLayout.mapel} onChange={(e) => setEditingLayout({...editingLayout, mapel: e.target.value})} />
                    <FormControl fullWidth><InputLabel>Jenjang</InputLabel><Select value={editingLayout.jenjang} label="Jenjang" onChange={(e) => setEditingLayout({...editingLayout, jenjang: e.target.value})}><MenuItem value="SD">SD</MenuItem><MenuItem value="SMP">SMP</MenuItem><MenuItem value="SMA">SMA</MenuItem></Select></FormControl>
                    <FormControl fullWidth><InputLabel>Tipe Dokumen</InputLabel><Select value={editingLayout.tipe_dokumen} label="Tipe Dokumen" onChange={(e) => setEditingLayout({...editingLayout, tipe_dokumen: e.target.value})}><MenuItem value="Prota">Prota</MenuItem><MenuItem value="Promes">Promes</MenuItem><MenuItem value="ATP">ATP</MenuItem><MenuItem value="Modul Ajar">Modul Ajar</MenuItem></Select></FormControl>
                    <Stack direction="row" justifyContent="flex-end" spacing={2}><Button onClick={() => setEditModalOpen(false)}>Batal</Button><Button variant="contained" onClick={handleUpdateLayout}>Simpan</Button></Stack>
                  </Stack>
                )}
              </Box>
             </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default LayoutListPage;