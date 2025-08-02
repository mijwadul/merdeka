import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  CircularProgress, Divider, Chip, ListItemButton
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import DocsImage from '../assets/docs.png'; 

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

function DocsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get('http://localhost:5000/api/docs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDocuments(res.data);
      } catch (err) {
        setError('Failed to load documents.');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchDocs();
    }
  }, [user]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error" sx={{ p: 3 }}>{error}</Typography>;
  }

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
            <Box>
                <Typography variant="h1" gutterBottom>My Documents</Typography>
                <Typography variant="h5" color="text.secondary">
                A list of documents you have generated with AI.
                </Typography>
            </Box>
            <Box
                component="img"
                src={DocsImage}
                alt="Documents illustration"
                sx={{ height: { xs: 180, md: 220 }, maxWidth: { xs: '70%', md: 'auto' } }}
            />
        </Box>
        
        <Paper>
          <List>
            {documents.length > 0 ? (
              documents.map((doc, index) => (
                <React.Fragment key={doc.id}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => navigate(`/docs/${doc.id}`)}>
                      <ListItemText
                        primary={doc.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              Created at: {new Date(doc.created_at).toLocaleString()}
                            </Typography>
                            <br />
                            <Chip label={doc.document_type} size="small" sx={{ mr: 1, mt: 1 }} />
                            <Chip label={doc.subject} size="small" sx={{ mt: 1 }} />
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < documents.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="You don't have any saved documents yet." />
              </ListItem>
            )}
          </List>
        </Paper>
      </Box>
    </motion.div>
  );
}

export default DocsPage;