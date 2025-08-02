import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Link,
  Typography,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  TextField
} from '@mui/material';
import axios from 'axios';
function Retriever() {
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [jenisDokumen, setJenisDokumen] = useState('CP');
  const [mapel, setMapel] = useState('');
  const [kelas, setKelas] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/found-documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat daftar dokumen.");
    }
    setIsLoading(false);
  };

  const handleCrawl = async () => {
    setIsCrawling(true);
    try {
      const res = await axios.post('http://localhost:5000/api/crawl-documents');
      console.log(res.data);
      await fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Gagal mengambil dokumen. Periksa server.");
    }
    setIsCrawling(false);
  };

  const handleEmbed = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/embed-documents', {
        ids: selectedIds,
      });
      console.log(res.data);
      alert("Embed selesai");
    } catch (err) {
      console.error(err);
      alert("Gagal embed dokumen.");
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const query = `${jenisDokumen} ${mapel} kelas ${kelas} site:kemdikbud.go.id filetype:pdf`;
      const res = await axios.get(`http://localhost:5000/api/search-documents?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Gagal mencari melalui Google Dorking.");
    }
    setIsSearching(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddToList = async (url) => {
  try {
    const res = await axios.post('http://localhost:5000/api/add-document', { url });
    if (res.data && res.data.id) {
      alert("Berhasil ditambahkan.");
      fetchDocuments(); // refresh list
    } else {
      alert("Gagal menambahkan.");
    }
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat menambahkan dokumen.");
  }
};


  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={handleCrawl}
          disabled={isCrawling}
          startIcon={isCrawling && <CircularProgress size={18} />}
        >
          {isCrawling ? 'Crawling...' : 'Crawl Dokumen'}
        </Button>

        <FormControl size="small">
          <InputLabel>Jenis</InputLabel>
          <Select value={jenisDokumen} label="Jenis" onChange={(e) => setJenisDokumen(e.target.value)}>
            <MenuItem value="CP">CP</MenuItem>
            <MenuItem value="ATP">ATP</MenuItem>
            <MenuItem value="Prota">Prota</MenuItem>
            <MenuItem value="Promes">Promes</MenuItem>
            <MenuItem value="Modul Ajar">Modul Ajar</MenuItem>
          </Select>
        </FormControl>

        <TextField size="small" label="Mapel" value={mapel} onChange={(e) => setMapel(e.target.value)} />
        <TextField size="small" label="Kelas" value={kelas} onChange={(e) => setKelas(e.target.value)} />
        <Button onClick={handleSearch} disabled={isSearching} variant="outlined">
          {isSearching ? <CircularProgress size={18} /> : 'Cari Template'}
        </Button>
      </Box>

      {searchResults.map((doc, idx) => (
  <Box key={idx} sx={{ my: 1 }}>
    <Link href={doc.url} target="_blank" rel="noopener noreferrer">
      {doc.title || doc.file_name}
    </Link>
    <Button
      size="small"
      variant="text"
      onClick={() => handleAddToList(doc.url)}
      sx={{ ml: 1 }}
    >
      Tambahkan ke daftar
    </Button>
  </Box>
))}


      {isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Memuat data...</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  {doc.file_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sumber: {doc.source}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', mt: 1 }}>
                  {doc.url}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <Checkbox
                    checked={selectedIds.includes(doc.id)}
                    onChange={() => toggleSelection(doc.id)}
                  />
                  <Typography variant="body2">Pilih untuk embed</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {selectedIds.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Button variant="outlined" color="primary" onClick={handleEmbed}>
            Proses Embed ({selectedIds.length} dokumen)
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default Retriever;