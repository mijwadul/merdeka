// frontend/src/theme.js

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3949AB', // Indigo 600
    },
    secondary: {
      main: '#B3E5FC', // Light Blue 100
    },
    success: {
      main: '#00C853', // Green A700
    },
    warning: {
      main: '#FFC107', // Amber 500
    },
    background: {
      default: '#F9FAFB', // Cool Gray 50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2E2E2E', // Slate Gray 800
      secondary: '#616161', // Gray 700
    },
  },

  typography: {
    fontFamily: [
      '"Poppins"',
      '"Roboto"',
      '"Helvetica"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 600, fontSize: '2.5rem' },
    h2: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 500, fontSize: '1.75rem' },
    h4: { fontWeight: 500, fontSize: '1.5rem' },
    h5: { fontWeight: 500, fontSize: '1.25rem' },
    h6: { fontWeight: 500, fontSize: '1rem' },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 500 },
  },

  shape: {
    borderRadius: 12,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme;
