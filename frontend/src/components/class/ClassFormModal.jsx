// ClassFormModal.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';

function ClassFormModal({ open, onClose, onSubmit, schools = [], initialData = {} }) {
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    grade_level: '',
    parallel_class: '',
    school_id: '',
    subject_id: '',
    teacher_id: '',
    new_subject_name: ''
  });

  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const fetchFormData = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await axios.get('http://localhost:5000/api/classes/form-data', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.subjects) setSubjects(res.data.subjects);

      if (!formData.school_id && res.data.school?.id) {
        setFormData(prev => ({ ...prev, school_id: res.data.school.id }));
      }

      if (res.data.teachers) setTeachers(res.data.teachers);
    } catch (err) {
      console.error('Failed to fetch form data:', err);
    }
  };

  const fetchTeachersForDeveloper = async (schoolId) => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await axios.get(`http://localhost:5000/api/schools/${schoolId}/details-for-class`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.teachers) setTeachers(res.data.teachers);
    } catch (err) {
      console.error('Failed to fetch school details:', err);
    }
  };

  useEffect(() => {
    if (open) {
      const defaultSchoolId = initialData.school_id || (user?.role === 'School Admin' ? user.school_id : '');

      setFormData({
        grade_level: initialData.grade_level || '',
        parallel_class: initialData.parallel_class || '',
        school_id: defaultSchoolId,
        subject_id: initialData.subject_id || '',
        teacher_id: initialData.teacher_id || '',
        new_subject_name: ''
      });

      fetchFormData();

      if (user?.role === 'Developer' && defaultSchoolId) {
        fetchTeachersForDeveloper(defaultSchoolId);
      }
    }
  }, [initialData, open, user]);

  useEffect(() => {
    if (user?.role === 'Developer' && formData.school_id) {
      fetchTeachersForDeveloper(formData.school_id);
    }
  }, [formData.school_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };

    if (formData.subject_id === 'Others' && formData.new_subject_name.trim()) {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.post('http://localhost:5000/api/subjects', {
          name: formData.new_subject_name
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        dataToSubmit.subject_id = res.data.id;
      } catch (err) {
        alert('Gagal menambahkan mata pelajaran baru.');
        return;
      }
    }

    delete dataToSubmit.new_subject_name;
    onSubmit(dataToSubmit);
  };

  return (
    <Dialog open={open} onClose={onClose} component="form" onSubmit={handleSubmit} fullWidth maxWidth="xs">
      <DialogTitle>{initialData.id ? 'Edit Class' : 'Add New Class'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="grade_level"
          label="Grade Level (e.g., 7, 8, 10)"
          type="number"
          fullWidth
          variant="outlined"
          value={formData.grade_level}
          onChange={handleChange}
          required
        />
        <TextField
          margin="dense"
          name="parallel_class"
          label="Parallel Class (e.g., A, B)"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.parallel_class}
          onChange={handleChange}
          required
        />

        {user?.role === 'Developer' && (
          <FormControl fullWidth margin="dense" required>
            <InputLabel>School</InputLabel>
            <Select
              name="school_id"
              value={formData.school_id}
              onChange={handleChange}
              label="School"
            >
              {schools.map(school => (
                <MenuItem key={school.id} value={school.id}>{school.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth margin="dense" required>
          <InputLabel>Subject</InputLabel>
          <Select
            name="subject_id"
            value={formData.subject_id}
            onChange={handleChange}
            label="Subject"
          >
            {subjects.map(subject => (
              <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
            ))}
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>

        {formData.subject_id === 'Others' && (
          <TextField
            margin="dense"
            name="new_subject_name"
            label="New Subject Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.new_subject_name}
            onChange={handleChange}
            required
          />
        )}

        <FormControl fullWidth margin="dense" required>
          <InputLabel>Teacher</InputLabel>
          <Select
            name="teacher_id"
            value={formData.teacher_id}
            onChange={handleChange}
            label="Teacher"
          >
            {teachers.map((teacher) => (
              <MenuItem key={teacher.id} value={teacher.id}>{teacher.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {initialData.id ? 'Save Changes' : 'Create Class'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ClassFormModal;