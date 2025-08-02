// frontend/src/components/dashboard/SummaryCard.jsx
import React from 'react';
import { Box, Paper, Typography, Avatar } from '@mui/material';

function SummaryCard({ icon, value, label }) {
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', mb: 2 }}>
      <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>{icon}</Avatar>
      <Box>
        <Typography variant="h6" component="div">{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  );
}

export default SummaryCard;