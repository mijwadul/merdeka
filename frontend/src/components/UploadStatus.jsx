import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography } from '@mui/material';
import ProgressStatus from './ProgressStatus'; // Import the new component

function UploadStatus() {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/uploads/status');
        setUploads(response.data);
      } catch (error) {
        console.error("Failed to fetch upload statuses:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Don't render the component if there's nothing to show
  if (uploads.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Processing Status</Typography>
      {uploads.map((upload) => (
        <Box key={upload.id} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
            {upload.filename}
          </Typography>
          <ProgressStatus 
            statusStage={upload.status}
            progress={upload.progress}
            mode={upload.status === 'extracting' ? 'determinate' : 'indeterminate'}
          />
        </Box>
      ))}
    </Box>
  );
}

export default UploadStatus;