import React from 'react';
import { Box, LinearProgress, Typography, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function ProgressStatus({ statusStage, progress = 0, mode = 'indeterminate' }) {
  const statusLabels = {
    pending: 'Queued for processing...',
    extracting: 'Extracting text with OCR...',
    indexing: 'Indexing for AI...',
    done: 'Processing Complete!',
    failed: 'An error occurred during processing.',
  };

  const currentLabel = statusLabels[statusStage] || 'Initializing...';
  const isProcessing = statusStage === 'extracting' || statusStage === 'indexing';

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.07)',
          mb: 1.5,
        }}
      >
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <Typography variant="body1" component="div">{currentLabel}</Typography>
          {isProcessing && (
            <LinearProgress
              variant={mode}
              value={mode === 'determinate' ? progress : undefined}
              sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
            />
          )}
        </Box>
        <Box>
          {statusStage === 'done' && <Chip icon={<CheckCircleIcon />} label="Done" color="success" />}
          {statusStage === 'failed' && <Chip icon={<ErrorIcon />} label="Failed" color="error" />}
          {isProcessing && <Typography variant="caption">{`${progress}%`}</Typography>}
        </Box>
      </Box>
    </motion.div>
  );
}

export default ProgressStatus;