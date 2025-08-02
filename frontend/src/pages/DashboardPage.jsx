import React, { useContext } from 'react';
import { Box, Typography, Grid, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import SummaryCard from '../components/dashboard/SummaryCard';
import ActivityItem from '../components/dashboard/ActivityItem';
import DashboardImage from '../assets/dashboard.png';
import DescriptionIcon from '@mui/icons-material/Description';
import SchoolIcon from '@mui/icons-material/School';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningIcon from '@mui/icons-material/Warning';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};
const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.5 };

// Placeholder data
const summaryData = [
  { icon: <DescriptionIcon />, value: '5', label: 'Dokumen AI' },
  { icon: <SchoolIcon />, value: '12', label: 'Kelas' },
  { icon: <GroupIcon />, value: '150', label: 'Siswa' },
];

const activityData = [
  { icon: <CheckCircleIcon />, color: 'success', text: 'Dokumen AI "Rencana Pembelajaran" telah disimpan', time: '2 jam lalu' },
  { icon: <PersonAddIcon />, color: 'info', text: 'Budi Santoso telah ditambahkan ke kelas 2B', time: '5 jam lalu' },
  { icon: <ReceiptLongIcon />, color: 'primary', text: 'Laporan kehadiran kelas 1A telah dibuat', time: '1 hari lalu' },
  { icon: <WarningIcon />, color: 'warning', text: 'Gagal memproses PDF acuan untuk kelas 3A', time: '2 hari lalu' },
];

function DashboardPage() {
  const { user } = useContext(AuthContext);

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ position: 'relative' }}>
      <Box sx={{ position: 'relative', p: { xs: 2, sm: 3 }, '&::before': { content: { xs: '""', md: 'none' }, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${DashboardImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1, zIndex: -1, }, }}>
        <Grid container spacing={4} alignItems="center">
          <Grid xs={12} md={7} lg={8}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4">Selamat Datang, {user?.username || 'Pengguna'}!</Typography>
              <Typography variant="body1" color="text.secondary">Ini adalah beranda untuk mengelola aktivitas Anda.</Typography>
            </Box>
            <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button variant="contained">Dokumen AI</Button>
              <Button variant="outlined">Manajemen Kelas</Button>
              <Button variant="outlined">Data Siswa</Button>
            </Box>
            <Grid container spacing={3}>
              <Grid xs={12} lg={6}>
                <Typography variant="h6" gutterBottom>Ringkasan</Typography>
                {summaryData.map(item => <SummaryCard key={item.label} {...item} />)}
              </Grid>
              <Grid xs={12} lg={6}>
                <Typography variant="h6" gutterBottom>Aktivitas Terbaru</Typography>
                <Paper sx={{ p: 2 }}>
                  {activityData.map(item => <ActivityItem key={item.text} {...item} />)}
                </Paper>
              </Grid>
            </Grid>
          </Grid>
          <Grid md={5} lg={4} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Box component="img" src={DashboardImage} alt="Dashboard Illustration" sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}/>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
}
export default DashboardPage;