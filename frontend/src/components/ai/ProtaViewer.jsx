// frontend/src/components/ai/ProtaViewer.jsx
import React from 'react';
import {
  Box, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, useTheme,
  Divider,
} from '@mui/material';

const ProtaViewer = ({ documentContent }) => {
  const theme = useTheme();

  if (!documentContent) {
    return null; // Jangan tampilkan apa-apa jika tidak ada konten
  }

  // Logika untuk mem-parsing data dari JSON, sama seperti di GeneratorWizardPage
  const { document_structure: docStructure, DAFTAR_PROTA_UTAMA: itemsToRender = [] } = documentContent;
  const tableHeaders = ["Unit", "Alur Tujuan Pembelajaran", "Alokasi Waktu", "Semester"];

  return (
    <Box>
      {/* Bagian 1: Menampilkan Struktur Dokumen (Judul, Identitas, CP, dll.) */}
      {docStructure && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {docStructure.Judul || "Program Tahunan"}
          </Typography>

          <Box sx={{ mb: 3, p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Identitas Dokumen
            </Typography>
            {Object.entries(docStructure["Identitas Dokumen"] || {}).map(([key, val]) => (
              <Typography key={key} variant="body2" sx={{ display: 'flex' }}>
                <Box component="strong" sx={{ minWidth: '140px', mr: 1 }}>{key}</Box>: {val}
              </Typography>
            ))}
          </Box>

          {docStructure["Capaian Pembelajaran Umum"] && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Capaian Pembelajaran Umum</Typography>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                {docStructure["Capaian Pembelajaran Umum"]}
              </Typography>
            </Box>
          )}

          {Array.isArray(docStructure["Elemen Capaian Pembelajaran"]) && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Elemen Capaian Pembelajaran
              </Typography>
              {docStructure["Elemen Capaian Pembelajaran"].map((elemen, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {elemen.Elemen}
                  </Typography>
                  <Typography variant="body2">
                    {elemen.Deskripsi}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
          <Divider sx={{ my: 3 }} />
        </Box>
      )}

      {/* Bagian 2: Menampilkan Tabel Prota Utama */}
      {itemsToRender.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
              <TableRow>
                {tableHeaders.map((header) => (
                  <TableCell key={header} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {header.replace(/_/g, ' ')}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {itemsToRender.map((item, index) => (
                <TableRow key={index} sx={ item.Unit ? { backgroundColor: theme.palette.grey[100] } : {} }>
                  {tableHeaders.map((header) => (
                    <TableCell 
                      key={header} 
                      sx={{ 
                        fontWeight: item.Unit && header === 'Unit' ? 'bold' : 'normal',
                        whiteSpace: header === 'Alur Tujuan Pembelajaran' ? 'pre-wrap' : 'normal',
                        verticalAlign: 'top'
                      }}
                    >
                      {item[header] !== null && item[header] !== undefined ? String(item[header]) : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ProtaViewer;