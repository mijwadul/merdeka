import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper,
  Avatar, useTheme, Button
} from '@mui/material';
import { motion } from 'framer-motion';

import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SearchIcon from '@mui/icons-material/Search';
import CreateIcon from '@mui/icons-material/Create';
import AssessmentIcon from '@mui/icons-material/Assessment';

import AIToolsImage from '../../assets/AI.png';

const pageVariants = {
  initial: { opacity: 0, rotateY: -90 },
  in: { opacity: 1, rotateY: 0 },
  out: { opacity: 0, rotateY: 90 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

function AITools() {
  const navigate = useNavigate();
  const theme = useTheme();

  const tools = [
    {
      title: 'Document Retriever',
      description: 'Fetch and embed curriculum documents from official sources.',
      icon: <LibraryBooksIcon fontSize="large" />,
      path: '/aitools/retriever',
    },
    {
      title: 'Curriculum Search',
      description: 'Find CP, ATP, and others via Google Search API.',
      icon: <SearchIcon fontSize="large" />,
      path: '/aitools/search',
    },
    {
      title: 'Document Generator',
      description: 'Automatically create RPP, Teaching Modules, CP, etc.',
      icon: <CreateIcon fontSize="large" />,
      path: '/aitools/generator',
    },
    {
      title: 'Automatic Evaluation (Coming Soon)',
      description: 'Input scores and let AI analyze learning results.',
      icon: <AssessmentIcon fontSize="large" />,
      path: '#',
    },
  ];

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ position: 'absolute', width: '100%' }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
            textAlign: { xs: 'center', md: 'left' }
          }}
        >
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography variant="h1">AI Tools</Typography>
            <Typography variant="h5" color="text.secondary">
              Accelerate your teaching tasks with intelligent tools.
            </Typography>
          </Box>
          <Box
            component="img"
            src={AIToolsImage}
            alt="AI Tools illustration"
            sx={{ height: { xs: 220, md: 300 }, maxWidth: { xs: '80%', md: 'auto' } }}
          />
        </Box>

        <Grid container spacing={3}>
          {tools.map((tool, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: '100%',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: 6,
                  },
                  cursor: tool.path !== '#' ? 'pointer' : 'default',
                }}
                onClick={() => tool.path !== '#' && navigate(tool.path)}
              >
                <Avatar
                  sx={{
                    bgcolor: theme.palette.primary.main,
                    width: 56,
                    height: 56,
                    mb: 2,
                  }}
                >
                  {tool.icon}
                </Avatar>
                <Typography variant="h6">{tool.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {tool.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </motion.div>
  );
}

export default AITools;