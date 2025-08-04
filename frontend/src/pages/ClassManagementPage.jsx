import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, CircularProgress, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import ClassFormModal from '../components/class/ClassFormModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ClassImage from '../assets/class.png';

const pageVariants = {
  initial: { opacity: 0, rotateY: -90 },
  in: { opacity: 1, rotateY: 0 },
  out: { opacity: 0, rotateY: 90 },
};

const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

function ClassManagementPage() {
  const { user } = useContext(AuthContext);
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const classResponse = await axios.get('http://localhost:5000/api/classes', { headers });
      setClasses(classResponse.data);

      // Tetap ambil data sekolah untuk keperluan form modal
      if (user?.role === 'Developer' || user?.role === 'School Admin') {
        const schoolResponse = await axios.get('http://localhost:5000/api/schools', { headers });
        setSchools(schoolResponse.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingClass(null);
  };

  const handleFormSubmit = async (formData) => {
    const token = localStorage.getItem('authToken');
    const url = editingClass
      ? `http://localhost:5000/api/classes/${editingClass.id}`
      : 'http://localhost:5000/api/classes';
    const method = editingClass ? 'put' : 'post';

    try {
      await axios[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
      handleCloseFormModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save class.');
    }
  };

  const handleOpenConfirmModal = (cls) => {
    setClassToDelete(cls);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setClassToDelete(null);
    setIsConfirmModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://localhost:5000/api/classes/${classToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete class.');
    } finally {
      handleCloseConfirmModal();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ position: 'absolute', width: '100%' }}>
        <Typography color="error">{error}</Typography>
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ position: 'absolute', width: '100%' }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', textAlign: { xs: 'center', md: 'left' }, justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography variant="h1">Class Management</Typography>
            <Typography variant="h5" color="text.secondary">
              Add, edit, or remove classes for your school.
            </Typography>
            {user?.role !== 'Teacher' && (
              <Button variant="contained" onClick={handleOpenCreateModal} sx={{ mt: 2 }}>
                Add New Class
              </Button>
            )}
          </Box>
          <Box
            component="img"
            src={ClassImage}
            alt="Class illustration"
            sx={{
              height: { xs: 220, md: 300 },
              maxWidth: { xs: '80%', md: 'auto' }
            }}
          />
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Class Name</TableCell>
                {user?.role === 'Developer' && <TableCell>School</TableCell>}
                <TableCell>Subject</TableCell>
                <TableCell>Teacher</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.class_name}</TableCell>
                  {user?.role === 'Developer' && <TableCell>{row.school || 'N/A'}</TableCell>}
                  <TableCell>{row.subject || '-'}</TableCell>
                  <TableCell>{row.teacher || '-'}</TableCell>
                  <TableCell align="right">
                    {user?.role !== 'Teacher' && (
                      <>
                        <IconButton onClick={() => handleOpenEditModal(row)} color="primary"><EditIcon /></IconButton>
                        <IconButton onClick={() => handleOpenConfirmModal(row)} color="error"><DeleteIcon /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <ClassFormModal
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        initialData={editingClass || {}}
        schools={schools}
      />
      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the class "${classToDelete?.class_name}"?`}
      />
    </motion.div>
  );
}

export default ClassManagementPage;