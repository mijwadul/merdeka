import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl
} from '@mui/material';

function SchoolFormModal({ open, onClose, onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState({ name: '', address: '', level: '' });

  useEffect(() => {
    setFormData({
      name: initialData.name || '',
      address: initialData.address || '',
      level: initialData.level || ''
    });
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} component="form" onSubmit={handleSubmit} fullWidth maxWidth="xs">
      <DialogTitle>{initialData.id ? 'Edit School' : 'Add New School'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="School Name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <TextField
          margin="dense"
          name="address"
          label="Address"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={formData.address}
          onChange={handleChange}
        />

        <FormControl fullWidth margin="dense" required>
          <InputLabel id="level-label">School Level</InputLabel>
          <Select
            labelId="level-label"
            name="level"
            value={formData.level}
            onChange={handleChange}
            label="School Level"
          >
            <MenuItem value="SD/MI">SD/MI</MenuItem>
            <MenuItem value="SMP/MTs">SMP/MTs</MenuItem>
            <MenuItem value="SMA/MA">SMA/MA</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {initialData.id ? 'Save Changes' : 'Create School'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SchoolFormModal;