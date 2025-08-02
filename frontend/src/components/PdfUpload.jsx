import React, { useState } from 'react';
import axios from 'axios';
import { Button, Input, Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { motion } from 'framer-motion';

function PdfUpload() {
  // State is now an empty array to hold multiple files
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleFileChange = (event) => {
    // event.target.files is a FileList, convert it to an array
    setSelectedFiles(Array.from(event.target.files));
    setMessage('');
    setIsError(false);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Please select one or more files first.');
      setIsError(true);
      return;
    }

    const formData = new FormData();
    // Append each file to the FormData object with the same key 'files'
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:5000/api/upload/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessage(response.data.message);
      setIsError(false);
    } catch (error) {
      setMessage(error.response ? error.response.data.error : 'An unexpected error occurred.');
      setIsError(true);
    }
  };

  return (
    <Box sx={{ p: 4, border: '1px dashed grey', borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Upload PDFs
      </Typography>
      
      <Input
        type="file"
        onChange={handleFileChange}
        sx={{ display: 'none' }}
        id="file-upload-input"
        inputProps={{ accept: '.pdf', multiple: true }} // Add multiple attribute
      />
      <label htmlFor="file-upload-input">
        <Button variant="contained" component="span">
          Choose Files
        </Button>
      </label>

      {selectedFiles.length > 0 && (
        <List dense>
          {selectedFiles.map((file, index) => (
            <ListItem key={index}>
              <ListItemText primary={file.name} />
            </ListItem>
          ))}
        </List>
      )}
      
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={handleFileUpload} disabled={selectedFiles.length === 0}>
          Upload
        </Button>
      </Box>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Typography sx={{ mt: 2, color: isError ? 'red' : 'green' }}>
            {message}
          </Typography>
        </motion.div>
      )}
    </Box>
  );
}

export default PdfUpload;