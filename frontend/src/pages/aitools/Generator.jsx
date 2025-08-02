import React, { useState, useEffect, useContext } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, CircularProgress, Paper, LinearProgress
} from '@mui/material';
import axios from 'axios';
import { motion } from 'framer-motion';
import AuthContext from '../../context/AuthContext';
import CustomAlert from '../../components/common/CustomAlert';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import GeneratorImage from '../../assets/generator.png'; // <-- Menggunakan gambar yang benar

// Animasi transisi halaman
const pageVariants = {
  initial: { opacity: 0, rotateY: -90 },
  in: { opacity: 1, rotateY: 0 },
  out: { opacity: 0, rotateY: 90 },
};
const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

function Generator() {
  const { user } = useContext(AuthContext);

  // States for the form
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  const [jenis, setJenis] = useState('Modul Ajar');
  const [topik, setTopik] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  // States for dynamic data
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // States for UI feedback
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState('');
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'info', message: '' });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchDataForForm = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get('http://localhost:5000/api/generator/form-data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAvailableSubjects(res.data.subjects || []);
        setAvailableClasses(res.data.classes || []);
      } catch (error) {
        console.error("Failed to fetch generator form data:", error);
        setAlertInfo({ show: true, type: 'error', message: 'Failed to load subjects and classes.' });
      }
    };
    fetchDataForForm();
  }, [user]);

  const handleSaveDocument = async () => {
    if (!hasil) return;
    setAlertInfo({ show: true, type: 'info', message: 'Saving document...' });
    try {
      const token = localStorage.getItem('authToken');
      const subjectName = availableSubjects.find(s => s.id === mapel)?.name || 'Unknown';
      await axios.post('http://localhost:5000/api/docs/save', {
        jenis,
        mapel: subjectName,
        kelas,
        topik,
        content: hasil
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlertInfo({ show: true, type: 'success', message: 'Document saved successfully!' });
    } catch (error) {
      setAlertInfo({ show: true, type: 'error', message: 'Failed to save document.' });
    }
  };
  
  const handleDownload = async () => {
    if (!hasil) return;
    setIsDownloading(true);
    setAlertInfo({ show: false });
    const subjectName = availableSubjects.find(s => s.id === mapel)?.name || 'Unknown Subject';
    const title = `${jenis} ${subjectName} Grade ${kelas} - ${topik}`;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:5000/api/docs/download-pdf', 
        { content: hasil, title: title },
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const safeFilename = title.replace(/[^a-z0-9 ]/gi, '').replace(/ /g, '_') + '.pdf';
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

  const handleGenerate = async () => {
    setLoading(true);
    setHasil('');
    setAlertInfo({ show: false });
    let subjectId = mapel;
    const token = localStorage.getItem('authToken');

    try {
      if (user.role === 'Developer' && mapel === 'add_new' && newSubjectName.trim()) {
        const res = await axios.post('http://localhost:5000/api/subjects', 
          { name: newSubjectName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        subjectId = res.data.id;
        setAvailableSubjects(prev => [...prev, res.data]);
        setNewSubjectName('');
      }
      
      const res = await axios.post('http://localhost:5000/api/generate/document-agent', {
        kelas,
        mapel: subjectId,
        jenis,
        topik
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setHasil(res.data.text);
      setAlertInfo({ show: true, type: 'success', message: 'Document generated successfully!' });
    } catch (err) {
      console.error(err);
      setAlertInfo({ show: true, type: 'error', message: err.response?.data?.error || 'Failed to generate document.' });
    } finally {
      setLoading(false);
    }
  };

  if (user && user.role === 'School Admin') {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" color="error">
          You do not have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ position: 'absolute', width: '100%' }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <CustomAlert
          show={alertInfo.show}
          type={alertInfo.type}
          message={alertInfo.message}
          onClose={() => setAlertInfo({ ...alertInfo, show: false })}
        />
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography variant="h1">AI Generator</Typography>
            <Typography variant="h5" color="text.secondary">
              Create teaching documents with AI agent assistance.
            </Typography>
          </Box>
          <Box
            component="img"
            src={GeneratorImage}
            alt="AI Generator illustration"
            sx={{ height: { xs: 180, md: 220 }, maxWidth: { xs: '70%', md: 'auto' } }}
          />
        </Box>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Document Parameters</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Document Type</InputLabel>
              <Select value={jenis} label="Document Type" onChange={(e) => setJenis(e.target.value)}>
                <MenuItem value="Modul Ajar">Modul Ajar</MenuItem>
                <MenuItem value="CP">Capaian Pembelajaran</MenuItem>
                <MenuItem value="ATP">Alur Tujuan Pembelajaran</MenuItem>
                <MenuItem value="Prota">Program Tahunan</MenuItem>
                <MenuItem value="Promes">Program Semester</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Subject</InputLabel>
              <Select value={mapel} label="Subject" onChange={(e) => setMapel(e.target.value)}>
                {availableSubjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
                ))}
                {user?.role === 'Developer' && <MenuItem value="add_new"><em>+ Add New Subject</em></MenuItem>}
              </Select>
            </FormControl>

            {mapel === 'add_new' && user?.role === 'Developer' && (
              <TextField
                size="small"
                label="New Subject Name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
              />
            )}

            {user?.role === 'Teacher' ? (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Grade</InputLabel>
                <Select value={kelas} label="Grade" onChange={(e) => setKelas(e.target.value)}>
                  {availableClasses.map((grade) => (
                    <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField size="small" label="Grade" value={kelas} onChange={(e) => setKelas(e.target.value)} />
            )}

            <TextField
              size="small"
              label="Specific Topic"
              value={topik}
              onChange={(e) => setTopik(e.target.value)}
              sx={{ flexGrow: 1 }}
            />

            <Button onClick={handleGenerate} variant="contained" color="success" disabled={!mapel || !kelas || !topik || loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate'}
            </Button>
          </Box>
        </Paper>

        {loading && <LinearProgress sx={{ my: 2 }} />}

        {hasil && (
          <Paper elevation={3} sx={{ p: 3, mt: 2, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6">Generated Result</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  Download PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveDocument}
                >
                  Save Document
                </Button>
              </Box>
            </Box>
            <Box 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                p: 2, 
                border: '1px solid #eee', 
                borderRadius: 1,
                fontFamily: 'default',
                lineHeight: 1.6
              }}
            >
               <Typography 
                 component="div" 
                 dangerouslySetInnerHTML={{ 
                   __html: hasil.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') 
                 }} 
               />
            </Box>
          </Paper>
        )}
      </Box>
    </motion.div>
  );
}

export default Generator;