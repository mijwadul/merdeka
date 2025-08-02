import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  CircularProgress, Grid, Chip
} from '@mui/material';
import axios from 'axios';

function SearchDocs() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await axios.get(`http://localhost:5000/api/query-documents?q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan pencarian.");
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        🔍 Pencarian Dokumen Kurikulum
      </Typography>

      <Typography variant="body1" gutterBottom>
        Ketik pertanyaan atau topik yang ingin kamu cari dari dokumen yang telah di-embed:
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <TextField
          label="Contoh: Tujuan pembelajaran IPA kelas 7"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={handleSearch} variant="contained" color="success">
          Cari
        </Button>
      </Box>

      {loading && <CircularProgress sx={{ my: 4 }} />}

      {!loading && results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Hasil Pencarian:
          </Typography>

          <Grid container spacing={2}>
            {results.map((item, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Chip
                      label={item.metadata?.source || 'Unknown'}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`${(item.score * 100).toFixed(1)}% match`}
                      size="small"
                      color="success"
                    />
                  </Box>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    {item.metadata?.file_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {item.content.slice(0, 400)}...
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}

export default SearchDocs