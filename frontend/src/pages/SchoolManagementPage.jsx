import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button,
  CircularProgress, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import SchoolFormModal from '../components/school/SchoolFormModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import SchoolImage from '../assets/school.png';

const pageVariants = {
  initial: { opacity: 0, rotateY: -90 },
  in: { opacity: 1, rotateY: 0 },
  out: { opacity: 0, rotateY: 90 },
};
const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

function SchoolManagementPage() {
  const { user } = useContext(AuthContext);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState(null);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('http://localhost:5000/api/schools', { headers });

      if (user.role === 'School Admin') {
        const filtered = response.data.filter(s => s.id === user.school_id);
        setSchools(filtered);
      } else {
        setSchools(response.data); // Developer sees all
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch schools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['Developer', 'School Admin'].includes(user.role)) {
      fetchSchools();
    } else if (user) {
      setLoading(false);
      setError('You do not have permission to view this page.');
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingSchool(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (school) => {
    setEditingSchool(school);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingSchool(null);
  };

  const handleFormSubmit = async (formData) => {
    const token = localStorage.getItem('authToken');
    const url = editingSchool
      ? `http://localhost:5000/api/schools/${editingSchool.id}`
      : 'http://localhost:5000/api/schools';
    const method = editingSchool ? 'put' : 'post';

    try {
      await axios[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
      handleCloseFormModal();
      fetchSchools();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save school.');
    }
  };

  const handleOpenConfirmModal = (school) => {
    setSchoolToDelete(school);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setSchoolToDelete(null);
    setIsConfirmModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://localhost:5000/api/schools/${schoolToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSchools();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete school.');
    } finally {
      handleCloseConfirmModal();
    }
  };

  if (loading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!['Developer', 'School Admin'].includes(user.role)) {
    return <Typography color="error" sx={{ p: 3 }}>You do not have permission to view this page.</Typography>;
  }

  if (error) {
    return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            textAlign: { xs: 'center', md: 'left' },
            justifyContent: 'space-between',
            mb: 4
          }}
        >
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography variant="h1">School Management</Typography>
            <Typography variant="h5" color="text.secondary">
              Add, edit, or remove schools from the platform.
            </Typography>
            {user.role === 'Developer' && (
              <Button variant="contained" onClick={handleOpenCreateModal} sx={{ mt: 2 }}>
                Add New School
              </Button>
            )}
          </Box>
          <Box
            component="img"
            src={SchoolImage}
            alt="School illustration"
            sx={{ height: { xs: 220, md: 300 }, maxWidth: { xs: '80%', md: 'auto' } }}
          />
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>School Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schools.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.address}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEditModal(row)} color="primary">
                      <EditIcon />
                    </IconButton>
                    {user.role === 'Developer' && (
                      <IconButton onClick={() => handleOpenConfirmModal(row)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <SchoolFormModal
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        initialData={editingSchool || {}}
      />
      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the school "${schoolToDelete?.name}"? All associated classes will also be deleted.`}
      />
    </motion.div>
  );
}

export default SchoolManagementPage;
