// frontend/src/components/Sidebar.jsx
import React, { useContext } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PsychologyAltOutlinedIcon from '@mui/icons-material/PsychologyAltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ExitToAppOutlinedIcon from '@mui/icons-material/ExitToAppOutlined';

import LogoImage from '../assets/logo.png';
import AuthContext from '../context/AuthContext';

const SidebarContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { text: 'Dashboard', icon: <SpaceDashboardOutlinedIcon />, path: '/dashboard', roles: ['Developer', 'School Admin', 'Teacher'] },
    { text: 'Docs', icon: <MenuBookOutlinedIcon />, path: '/docs', roles: ['Developer', 'School Admin', 'Teacher'] }, // <-- PERBAIKAN DI SINI
    { text: 'AI Tools', icon: <PsychologyAltOutlinedIcon />, path: '/ai/tools', roles: ['Developer', 'Teacher'] },
    { text: 'Reports', icon: <BarChartOutlinedIcon />, path: '#', roles: ['Developer', 'School Admin', 'Teacher'] },
    { text: 'School Management', icon: <SchoolOutlinedIcon />, path: '/schools', roles: ['Developer', 'School Admin'] },
    { text: 'Class Management', icon: <ClassOutlinedIcon />, path: '/classes', roles: ['Developer', 'School Admin', 'Teacher'] },
    { text: 'User Management', icon: <GroupOutlinedIcon />, path: '/users', roles: ['Developer', 'School Admin'] },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List>
        <ListItem sx={{ height: '100px', display: 'flex', justifyContent: 'center', p: 1 }}>
          <img src={LogoImage} alt="Gatra Sinau.AI Logo" style={{ maxHeight: '100%', maxWidth: '100%' }} />
        </ListItem>
        <Divider />
        {menuItems.map((item) =>
          user && item.roles.includes(user.role) ? (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: theme.shape.borderRadius,
                  mx: 1,
                  my: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.common.white,
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.common.white,
                    },
                  },
                  '&:hover': {
                    backgroundColor: `${theme.palette.primary.main}15`, // transparansi 9%
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ) : null
        )}
      </List>
      <Box sx={{ marginTop: 'auto' }}>
        <List>
          <Divider />
          <ListItem disablePadding>
            <ListItemButton
              onClick={logout}
              sx={{
                borderRadius: theme.shape.borderRadius,
                mx: 1,
                my: 0.5,
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: `${theme.palette.error.main}15`,
                  color: theme.palette.error.main,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.error.main,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <ExitToAppOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default SidebarContent;