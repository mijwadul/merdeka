import React from 'react';
import { Alert, AlertTitle, IconButton, Collapse } from '@mui/material';
import {
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  Close,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const iconMap = {
  success: <CheckCircleOutline fontSize="inherit" />,
  error: <ErrorOutline fontSize="inherit" />,
  info: <InfoOutlined fontSize="inherit" />,
};

const MotionCollapse = motion(Collapse);

function CustomAlert({ type = 'info', title, message, onClose, show }) {
  return (
    <MotionCollapse
      in={show}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Alert
        severity={type}
        icon={iconMap[type]}
        action={
          onClose && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <Close fontSize="inherit" />
            </IconButton>
          )
        }
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          mb: 2,
          alignItems: 'center'
        }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </MotionCollapse>
  );
}

export default CustomAlert;