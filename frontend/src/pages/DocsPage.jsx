// frontend/src/pages/DocsPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  CircularProgress, Divider, Chip, ListItemButton, ListSubheader, useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CustomAlert from '../components/common/CustomAlert';
import DocsImage from '../assets/docs.png';

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

function DocsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const [groupedDocs, setGroupedDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ show: false });

  useEffect(() => {
    const fetchDocs = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get('http://localhost:5000/api/docs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const groups = res.data.reduce((acc, doc) => {
          const type = doc.document_type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(doc);
          return acc;
        }, {});

        setGroupedDocs(groups);

      } catch (err) {
        setAlertInfo({ show: true, type: 'error', message: 'Gagal memuat dokumen.' });
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, [user]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '960px', mx: 'auto' }}>
        <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ show: false })} />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
            <Box>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">Dokumen Saya</Typography>
                <Typography variant="h6" color="text.secondary">
                  Daftar dokumen yang telah Anda buat dengan AI.
                </Typography>
            </Box>
            <Box
                component="img"
                src={DocsImage}
                alt="Documents illustration"
                sx={{ height: { xs: 150, md: 180 }, maxWidth: { xs: '60%', md: 'auto' }, mt: { xs: 2, md: 0 } }}
            />
        </Box>
        
        {Object.keys(groupedDocs).length > 0 ? (
            Object.keys(groupedDocs).map(groupTitle => (
              <Paper key={groupTitle} sx={{ mb: 3 }} elevation={2}>
                <List
                  subheader={
                    <ListSubheader component="div" sx={{ bgcolor: 'inherit', fontWeight: 'bold', color: 'primary.main', borderRadius: '8px 8px 0 0' }}>
                      {groupTitle}
                    </ListSubheader>
                  }
                >
                  {groupedDocs[groupTitle].map((doc, index) => (
                    <React.Fragment key={doc.id}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => navigate(`/docs/${doc.doc_model}/${doc.id}`)}>
                          <ListItemText
                            primary={doc.title}
                            // ✅✅✅ PERBAIKAN DI SINI ✅✅✅
                            // Tambahkan prop `secondaryTypographyProps` untuk mengubah elemen <p> menjadi <div>
                            secondaryTypographyProps={{ component: 'div' }} 
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.secondary">
                                  Dibuat pada: {new Date(doc.created_at).toLocaleString('id-ID')}
                                </Typography>
                                <br />
                                <Chip label={`Kelas ${doc.grade_level}`} size="small" sx={{ mr: 1, mt: 1 }} />
                                <Chip label={doc.subject} size="small" sx={{ mt: 1 }} />
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < groupedDocs[groupTitle].length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ))
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography>Anda belum memiliki dokumen tersimpan.</Typography>
            </Paper>
          )}
      </Box>
    </motion.div>
  );
}

export default DocsPage;