import React, { useState } from 'react';
import axios from 'axios';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert } from '@mui/material';

function AiGenerator({ selectedClass, selectedSubject }) { // Accept props
  const [query, setQuery] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    // Check if class and subject are selected
    if (!selectedClass || !selectedSubject) {
      setError('Please select a Class and Subject first.');
      return;
    }
    if (!query) {
      setError('Please enter a prompt.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setGeneratedContent('');

    // Prepend the context to the user's query
    const fullQuery = `For Class ${selectedClass}, Subject ${selectedSubject}: ${query}`;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('http://localhost:5000/api/generate', 
        { query: fullQuery }, // Send the full query
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGeneratedContent(response.data.content);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        AI Content Generator
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter a prompt to generate educational content based on your uploaded documents.
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        fullWidth
        multiline
        rows={4}
        variant="outlined"
        label="Your Prompt"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Box sx={{ my: 2, position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleGenerate}
          disabled={isLoading}
        >
          Generate Content
        </Button>
        {isLoading && (
          <CircularProgress
            size={24}
            sx={{
              position: 'absolute',
              top: '50%',
              right: '50px', // Position relative to the button
              marginTop: '-12px',
              marginRight: '-12px',
            }}
          />
        )}
      </Box>

      {generatedContent && (
        <Paper elevation={2} sx={{ p: 3, mt: 2, whiteSpace: 'pre-wrap', backgroundColor: 'background.default', maxHeight: '40vh', overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>Generated Content:</Typography>
          <Typography variant="body1">{generatedContent}</Typography>
        </Paper>
      )}
    </Box>
  );
}

export default AiGenerator;