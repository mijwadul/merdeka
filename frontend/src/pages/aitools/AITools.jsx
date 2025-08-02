import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper,
  Avatar, useTheme
} from '@mui/material';
import { motion } from 'framer-motion';

// Import ikon baru
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ScienceIcon from '@mui/icons-material/Science';

import AIToolsImage from '../../assets/AI.png';

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

  const tools = [
    {
      title: '1. Layout Retriever',
      description: 'Unggah template layout dokumen resmi (Prota, Modul Ajar) sebagai referensi utama untuk AI.',
      icon: <CloudUploadIcon fontSize="large" />,
      path: '/aitools/layout-retriever', // Path baru untuk halaman layout retriever
      enabled: true,
    },
    {
      title: '2. Book Retriever',
      description: 'Unggah buku pegangan guru atau siswa. Sistem akan mengekstrak materi dan gambar secara otomatis.',
      icon: <MenuBookIcon fontSize="large" />,
      path: '#', // Belum aktif
      enabled: false,
    },
    {
      title: '3. Wizard Generator',
      description: 'Mulai proses pembuatan dokumen secara bertahap, dari Prota hingga soal, dibantu oleh AI.',
      icon: <AutoStoriesIcon fontSize="large" />,
      path: '#', // Belum aktif
      enabled: false,
    },
    {
      title: '4. AI Validator',
      description: 'Periksa kesesuaian dan kualitas dokumen yang dihasilkan AI berdasarkan layout dan buku acuan.',
      icon: <ScienceIcon fontSize="large" />,
      path: '#', // Belum aktif
      enabled: false,
    },
  ];

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
                onClick={() => tool.enabled && navigate(tool.path)}
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
    </motion.div>
  );
}

export default AITools;