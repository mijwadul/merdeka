import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import LoginImage from '../assets/login.png';
import LogoImage from '../assets/logo.png';
import AuthContext from '../context/AuthContext';

function LoginPage() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext); // Use our context

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(loginIdentifier, password); // Call the context login function
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Gaya untuk TextField agar terlihat 3D (inset)
  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(5px)',
      boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.08)',
      '& fieldset': {
        border: '1px solid rgba(255, 255, 255, 0.4)', // Border halus
      },
      '&:hover fieldset': {
        borderColor: 'primary.main',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'primary.main',
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
        color: '#2E2E2E', // Warna label agar mudah terbaca
    },
     '& .MuiInputLabel-root.Mui-focused': {
        color: 'primary.main',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: `url(${LoginImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <Paper
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: { xs: '100%', sm: 500 },
          backgroundColor: 'transparent',
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <motion.div variants={itemVariants} style={{ marginBottom: '24px' }}>
              <Box
                sx={{
                  width: 200,
                  height: 200,
                  borderRadius: '50%', // Makes the container circular
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                }}
              >
                <img src={LogoImage} alt="Gatra Sinau.AI Logo" style={{ height: '150px' }} />
              </Box>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Typography component="h1" variant="h3" sx={{ fontWeight: 'bold', mb: 3 }}>
                LOGIN
              </Typography>
            </motion.div>
            <Box component="form" noValidate onSubmit={handleLogin} sx={{ width: '100%' }}>
              <motion.div variants={itemVariants}>
                <TextField 
                margin="normal" 
                required
                fullWidth
                label="Email or Username" 
                autoComplete="email" 
                autoFocus 
                value={loginIdentifier} 
                onChange={(e) => setLoginIdentifier(e.target.value)} 
                sx={textFieldSx} 
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal" 
                  required 
                  fullWidth 
                  name="password" 
                  label="Password" 
                  type="password" 
                  autoComplete="current-password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  sx={textFieldSx}
                />
              </motion.div>
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              {/* Efek 3D dan animasi pada tombol */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.98, y: 0 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.5,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', // Bayangan agar menonjol
                  }}
                >
                  Login
                </Button>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Paper>
    </Box>
  );
}

export default LoginPage;