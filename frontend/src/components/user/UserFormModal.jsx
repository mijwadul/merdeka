import React, { useState, useEffect, useContext } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';

function UserFormModal({ open, onClose, onSubmit, initialData = {} }) {
  const { user: currentUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Teacher',
    school_id: '',
    school_ids: []
  });

  const [error, setError] = useState('');
  const [schools, setSchools] = useState([]);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get('http://localhost:5000/api/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(res.data);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  };

  useEffect(() => {
    if (open) {
      const role = initialData.role || 'Teacher';
      setFormData({
        username: initialData.username || '',
        email: initialData.email || '',
        password: '',
        confirmPassword: '',
        role,
        school_id: initialData.school_id || '',
        school_ids: initialData.school_ids || []
      });

      if (role === 'Teacher' || role === 'School Admin') {
        fetchSchools();
      }
    }
  }, [initialData, open]);

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData(prev => ({
      ...prev,
      role,
      school_id: '',
      school_ids: []
    }));

    if (role === 'Teacher' || role === 'School Admin') {
      fetchSchools();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, school_ids: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const { confirmPassword, school_ids, school_id, ...submissionData } = formData;

    const payload = { ...submissionData };

    // Developer dapat mengirimkan school_ids atau school_id secara opsional
    if (formData.role === 'Teacher' && currentUser?.role === 'Developer' && school_ids.length > 0) {
      payload.school_ids = school_ids;
    }

    // Developer wajib kirim school_id untuk School Admin
    if (formData.role === 'School Admin' && currentUser?.role === 'Developer' && school_id) {
      payload.school_id = school_id;
    }

    onSubmit(payload);
  };

  const isDev = currentUser?.role === 'Developer';
  const isAdmin = currentUser?.role === 'School Admin';

  return (
    <Dialog open={open} onClose={onClose} component="form" onSubmit={handleSubmit} fullWidth maxWidth="xs">
      <DialogTitle>{initialData.id ? 'Edit User' : 'Add New User'}</DialogTitle>
      <DialogContent>
        <TextField autoFocus margin="dense" name="username" label="Username" fullWidth value={formData.username} onChange={handleChange} required />
        <TextField margin="dense" name="email" label="Email Address" type="email" fullWidth value={formData.email} onChange={handleChange} required />
        <TextField
          margin="dense"
          name="password"
          label="Password"
          type="password"
          fullWidth
          value={formData.password}
          onChange={handleChange}
          required={!initialData.id}
          helperText={initialData.id ? "Leave blank to keep current password" : ""}
        />
        <TextField
          margin="dense"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          fullWidth
          value={formData.confirmPassword}
          onChange={handleChange}
          required={!initialData.id || !!formData.password}
          error={!!error}
        />
        <FormControl fullWidth margin="dense" required>
          <InputLabel>Role</InputLabel>
          <Select name="role" value={formData.role} label="Role" onChange={handleRoleChange}>
            <MenuItem value="Teacher">Teacher</MenuItem>
            <MenuItem value="School Admin">School Admin</MenuItem>
            <MenuItem value="Developer">Developer</MenuItem>
          </Select>
        </FormControl>

        {formData.role === 'School Admin' && isDev && (
          <FormControl fullWidth margin="dense" required>
            <InputLabel>School</InputLabel>
            <Select name="school_id" value={formData.school_id || ''} label="School" onChange={handleChange}>
              {schools.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {formData.role === 'Teacher' && isDev && (
          <FormControl fullWidth margin="dense">
            <InputLabel>Schools (optional)</InputLabel>
            <Select
              multiple
              name="school_ids"
              value={formData.school_ids || []}
              onChange={handleMultiChange}
              renderValue={(selected) => selected.map(id => {
                const s = schools.find(s => s.id === id);
                return s ? s.name : '';
              }).join(', ')}
            >
              {schools.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {error && <FormHelperText error sx={{ mt: 1 }}>{error}</FormHelperText>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {initialData.id ? 'Save Changes' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UserFormModal;