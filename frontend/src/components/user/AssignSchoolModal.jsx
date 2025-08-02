import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Typography
} from '@mui/material';
import ConfirmationModal from '../common/ConfirmationModal';
import AuthContext from '../../context/AuthContext';

function AssignSchoolModal({ open, onClose }) {
  const { user } = useContext(AuthContext);
  const [teachers, setTeachers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('authToken');

  const fetchTeachers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allTeachers = res.data.filter(u => u.role === 'Teacher');
      setTeachers(allTeachers);
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schools', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(res.data);
    } catch (err) {
      console.error('Failed to fetch schools', err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTeachers();
      fetchSchools();
    }
  }, [open]);

  const handleAssign = async () => {
    const schoolIdToAssign = user.role === 'School Admin' ? user.school_id : selectedSchool;
    if (!selectedTeacher || !schoolIdToAssign) return;

    try {
      await axios.put(`http://localhost:5000/api/users/${selectedTeacher}/assign-schools`, {
        school_ids: [schoolIdToAssign]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign school');
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Assign Teacher</DialogTitle>
        <DialogContent>
          <TextField
            label="Search Teacher"
            fullWidth
            margin="dense"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Teacher</InputLabel>
            <Select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              label="Teacher"
            >
              {filteredTeachers.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.username} ({t.email})</MenuItem>
              ))}
            </Select>
          </FormControl>

          {user.role === 'Developer' && (
            <FormControl fullWidth margin="dense">
              <InputLabel>School</InputLabel>
              <Select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                label="School"
              >
                {schools.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            variant="contained"
            disabled={!selectedTeacher || (user.role === 'Developer' && !selectedSchool)}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleAssign}
        title="Confirm Assignment"
        message="Are you sure you want to assign this teacher to the selected school?"
      />
    </>
  );
}

export default AssignSchoolModal;