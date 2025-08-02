// frontend/src/components/dashboard/ActivityItem.jsx
import React from 'react';
import { Box, Typography, Avatar } from '@mui/material';

function ActivityItem({ icon, color, text, time }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Avatar sx={{ bgcolor: `${color}.main`, width: 32, height: 32, mr: 2 }}>
        {icon}
      </Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2">{text}</Typography>
        <Typography variant="caption" color="text.secondary">{time}</Typography>
      </Box>
    </Box>
  );
}

export default ActivityItem;