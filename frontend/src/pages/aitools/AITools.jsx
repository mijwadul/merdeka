// frontend/src/pages/AITools.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper,
  Avatar, useTheme, Button, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { motion } from 'framer-motion';

// Import ikon
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AIToolsImage from '../../assets/AI.png';

// Import komponen Modal Konfirmasi yang sudah ada
import ConfirmationModal from '../../components/common/ConfirmationModal';

const pageVariants = {
  initial: { opacity: 0, scale: 0.9 },
  in: { opacity: 1, scale: 1 },
  out: { opacity: 0, scale: 0.9 },
};

const pageTransition = {
  type: 'spring',
  stiffness: 100,
  duration: 0.5,
};

function AITools() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const tools = [
    {
      id: 'layout_retriever',
      title: '1. Layout Retriever',
      description: 'Unggah template layout dokumen resmi (Prota, Modul Ajar) sebagai referensi utama untuk AI.',
      icon: <CloudUploadIcon fontSize="large" />,
      path: '/aitools/layout-retriever',
      enabled: true,
    },
    {
      id: 'book_retriever',
      title: '2. Book Retriever',
      description: 'Unggah buku pegangan guru atau siswa. Sistem akan mengekstrak materi dan gambar secara otomatis.',
      icon: <MenuBookIcon fontSize="large" />,
      path: '/aitools/book-retriever',
      enabled: true,
    },
    {
      id: 'cp_uploader',
      title: '3. Upload CP',
      description: 'Unggah dokumen Capaian Pembelajaran (CP) resmi sebagai fondasi utama pembuatan dokumen.',
      icon: <AutoStoriesIcon fontSize="large" />,
      path: '/aitools/cp-upload', // Path ke halaman baru
      enabled: true, // Kita aktifkan
    },
    {
      id: 'wizard_generator',
      title: '4. Wizard Generator',
      description: 'Mulai proses pembuatan dokumen (Prota, Promes, ATP, dst.) secara terstruktur dan terpandu.',
      icon: <AutoFixHighIcon fontSize="large" />,
      path: '/aitools/generator-wizard',
      enabled: true,
    },
  ];

  const handleToolClick = (tool) => {
    if (!tool.enabled) return;

    // Khusus untuk tool upload CP, tampilkan modal dulu
    if (tool.id === 'cp_uploader') {
      setModalOpen(true);
    } else {
      navigate(tool.path);
    }
  };

  const handleConfirmNavigation = () => {
    setModalOpen(false);
    navigate('/aitools/cp-upload'); // Arahkan ke halaman upload CP setelah konfirmasi
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Pusat Alat Bantu AI Kurikulum
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Mulai proses pembuatan dokumen kurikulum Anda dengan mengunggah aset yang dibutuhkan.
          </Typography>
           <Box
            component="img"
            src={AIToolsImage}
            alt="AI Tools illustration"
            sx={{ height: { xs: 200, md: 250 }, maxWidth: { xs: '80%', md: 'auto' }, my: 2 }}
          />
        </Box>

        <Grid container spacing={4}>
          {tools.map((tool) => (
            <Grid item xs={12} sm={6} md={3} key={tool.title}>
              <Paper
                elevation={tool.enabled ? 3 : 1}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: tool.enabled ? 'translateY(-5px)' : 'none',
                    boxShadow: tool.enabled ? 6 : 1,
                  },
                  cursor: tool.enabled ? 'pointer' : 'not-allowed',
                  backgroundColor: tool.enabled ? 'background.paper' : theme.palette.action.hover,
                }}
                onClick={() => handleToolClick(tool)}
              >
                <Avatar
                  sx={{
                    bgcolor: tool.enabled ? theme.palette.primary.main : theme.palette.action.disabled,
                    width: 56,
                    height: 56,
                    mb: 2,
                  }}
                >
                  {tool.icon}
                </Avatar>
                <Typography variant="h6" fontWeight="600">{tool.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {tool.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Gunakan Komponen Modal yang sudah ada */}
      <ConfirmationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmNavigation}
        title="Konfirmasi Navigasi"
        message="Anda akan diarahkan ke halaman untuk mengunggah dokumen Capaian Pembelajaran (CP). Pastikan Anda sudah menyiapkan file .txt dari CP resmi. Lanjutkan?"
      />
    </motion.div>
  );
}

export default AITools;