import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { motion } from 'framer-motion';
import AuthContext from '../../context/AuthContext';
import UserFormModal from '../../components/user/UserFormModal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import AssignSchoolModal from '../../components/user/AssignSchoolModal';
import UserImage from '../../assets/user.png';

const pageVariants = {
  initial: { opacity: 0, rotateY: -90 },
  in: { opacity: 1, rotateY: 0 },
  out: { opacity: 0, rotateY: 90 },
};
const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.5 };

const INITIAL_FORM_STATE = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'Teacher',
  school_id: '',
  school_ids: []
};

function UserManagementPage() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [editingUser, setEditingUser] = useState(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'Developer' || user.role === 'School Admin')) {
      fetchUsers();
    } else if (user) {
      setLoading(false);
      setError('You do not have permission to view this page.');
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData(INITIAL_FORM_STATE);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingUser(null);
  };

  const handleFormSubmit = async (submittedData) => {
  const token = localStorage.getItem('authToken');
  const url = editingUser
    ? `http://localhost:5000/api/users/${editingUser.id}`
    : 'http://localhost:5000/api/users';
  const method = editingUser ? 'put' : 'post';

  if (editingUser && !submittedData.password) {
    delete submittedData.password;
  }

  try {
    const res = await axios[method](url, submittedData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const userId = editingUser?.id || res.data.user?.id;

    // 💡 Hanya Developer yang boleh assign
    if (userId && user.role === 'Developer') {
      if (submittedData.role === 'Teacher' && submittedData.school_ids?.length > 0) {
        await axios.put(`http://localhost:5000/api/users/${userId}/assign-schools`, {
          school_ids: submittedData.school_ids
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (submittedData.role === 'School Admin' && submittedData.school_id) {
        await axios.put(`http://localhost:5000/api/users/${userId}/assign-schools`, {
          school_ids: [submittedData.school_id]
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }

    handleCloseFormModal();
    fetchUsers();
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to save user.');
  }
  };
  
const handleOpenConfirmModal = (user) => {
    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setUserToDelete(null);
    setIsConfirmModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`http://localhost:5000/api/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user.');
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
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography variant="h1">User Management</Typography>
            <Typography variant="h5" color="text.secondary">
              Create, view, and manage user accounts for your institution.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" onClick={handleOpenCreateModal}>
                Add New User
              </Button>
              <Button variant="outlined" onClick={() => setIsAssignModalOpen(true)}>
                Assign Teacher
              </Button>
            </Box>
          </Box>
          <Box component="img" src={UserImage} alt="User illustration" sx={{ height: { xs: 220, md: 220 }, maxWidth: { xs: '80%', md: 'auto' } }} />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>School(s)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>
                    {Array.isArray(row.school_names)
                      ? row.school_names.join(', ')
                      : row.school_names || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenEditModal(row)} color="primary" disabled={user && user.id === row.id}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleOpenConfirmModal(row)} color="error" disabled={user && user.id === row.id}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <UserFormModal
        open={isFormModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        formData={formData}
        setFormData={setFormData}
        initialData={editingUser || {}}
      />

      <ConfirmationModal
        open={isConfirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the user "${userToDelete?.username}"? This action cannot be undone.`}
      />

      <AssignSchoolModal
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </motion.div>
  );
}

export default UserManagementPage;