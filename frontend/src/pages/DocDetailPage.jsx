import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Typography, Paper, Button, CircularProgress, Divider, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import CustomAlert from '../components/common/CustomAlert';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const pageVariants = {
  initial: { opacity: 0, x: 100 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -100 },
};

function DocDetailPage() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });

  useEffect(() => {
    const fetchDoc = async () => {
      if (!user || !docId) return;
      try {
        const token = localStorage.getItem('authToken');
        // NOTE: We need a new backend endpoint to fetch a single document by ID
        const res = await axios.get(`http://localhost:5000/api/docs/${docId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDocument(res.data);
      } catch (err) {
        setAlertInfo({ show: true, type: 'error', message: 'Failed to load document.' });
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [user, docId]);
  
  const handleDownload = async () => {
    if (!document) return;
    setIsDownloading(true);
    setAlertInfo({ show: false });

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:5000/api/docs/download-pdf', 
        { content: document.content, title: document.title },
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeFilename = document.title.replace(/[^a-z0-9 ]/gi, '').replace(/ /g, '_') + '.pdf';
      link.setAttribute('download', safeFilename);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to download PDF:", error);
      setAlertInfo({ show: true, type: 'error', message: 'Failed to create PDF file.' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <CustomAlert {...alertInfo} onClose={() => setAlertInfo({ ...alertInfo, show: false })} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/docs')} sx={{ mb: 2 }}>
          Back to Documents
        </Button>
        {document ? (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4">{document.title}</Typography>
                <Chip label={document.document_type} size="small" sx={{ mr: 1, mt: 1 }} />
                <Chip label={document.subject} size="small" sx={{ mt: 1 }} />
              </Box>
              <Button
                variant="contained"
                startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={isDownloading}
              >
                Download PDF
              </Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                maxHeight: '70vh', 
                overflowY: 'auto', 
                p: 2, 
                fontFamily: 'default',
                lineHeight: 1.7
              }}
            >
               <Typography 
                 component="div" 
                 dangerouslySetInnerHTML={{ 
                   __html: document.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') 
                 }} 
               />
            </Box>
          </Paper>
        ) : (
          <Typography>Document not found.</Typography>
        )}
      </Box>
    </motion.div>
  );
}

export default DocDetailPage;