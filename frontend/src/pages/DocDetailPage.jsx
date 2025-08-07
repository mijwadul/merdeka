// frontend/src/pages/DocDetailPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Typography, Paper, Button, CircularProgress, Divider, Stack, TextField, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import CustomAlert from '../components/common/CustomAlert';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ProtaViewer from '../components/ai/ProtaViewer'; 
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5
};

function DocDetailPage() {
  const { docModel, docId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [documentContent, setDocumentContent] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false });
  const [modalInfo, setModalInfo] = useState({ open: false });

  useEffect(() => {
    const fetchDoc = async () => {
      if (!user || !docId || !docModel) return;
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`http://localhost:5000/api/docs/${docModel}/${docId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDocumentContent(res.data);
        setEditableContent(JSON.stringify(res.data, null, 2));
      } catch (err) {
        setAlertInfo({ show: true, type: 'error', message: 'Gagal memuat dokumen.' });
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [user, docId, docModel]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setAlertInfo({ show: false });
    try {
        const parsedJson = JSON.parse(editableContent);
        const token = localStorage.getItem('authToken');
        await axios.put(`http://localhost:5000/api/docs/${docModel}/${docId}`, parsedJson, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setDocumentContent(parsedJson);
        setIsEditing(false);
        setAlertInfo({ show: true, type: 'success', message: 'Dokumen berhasil disimpan!' });
    } catch (error) {
        const errorMsg = error.response?.data?.msg || 'Gagal menyimpan. Pastikan format JSON valid.';
        setAlertInfo({ show: true, type: 'error', message: errorMsg });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteConfirm = () => {
    setModalInfo({
        open: true,
        title: 'Konfirmasi Hapus',
        message: 'Apakah Anda yakin ingin menghapus dokumen ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
        onConfirm: handleDelete,
    });
  };

  const handleDelete = async () => {
    setModalInfo({ open: false });
    try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`http://localhost:5000/api/docs/${docModel}/${docId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        navigate('/docs', { state: { alert: { show: true, type: 'info', message: 'Dokumen telah dihapus.' } } });
    } catch (error) {
        setAlertInfo({ show: true, type: 'error', message: 'Gagal menghapus dokumen.' });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }
  
  const docTitle = documentContent?.document_structure?.Judul || `Dokumen ${docId}`;

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '960px', mx: 'auto' }}>
        <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ show: false })} />
        <ConfirmationModal {...modalInfo} onClose={() => setModalInfo({ open: false })} />

        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/docs')} sx={{ mb: 2 }}>
          Kembali ke Daftar Dokumen
        </Button>

        {documentContent ? (
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
              <Typography variant="h4" component="h1" gutterBottom>{docTitle}</Typography>
              <Stack direction="row" spacing={1}>
                {isEditing ? (
                  <Button variant="contained" startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} onClick={handleSaveChanges} disabled={isSaving}>
                    Simpan
                  </Button>
                ) : (
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
                 <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteConfirm}>
                    Hapus
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ my: 2 }} />

            {isEditing ? (
              <TextField
                multiline
                fullWidth
                rows={25}
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                variant="outlined"
                sx={{ fontFamily: 'monospace', bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100' }}
              />
            ) : (
              // ✅ 2. Ganti tampilan JSON mentah dengan komponen ProtaViewer
              <ProtaViewer documentContent={documentContent} />
            )}
          </Paper>
        ) : (
          <Typography>Dokumen tidak ditemukan atau gagal dimuat.</Typography>
        )}
      </Box>
    </motion.div>
  );
}

export default DocDetailPage;