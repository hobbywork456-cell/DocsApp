import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LogoutIcon from '@mui/icons-material/Logout';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../slices/authSlice';
import './Navbar.css';

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="bg-white/60 backdrop-blur-md border-b border-white/80 pt-1 pb-1">
      <Toolbar>
        <MenuBookIcon sx={{ color: '#ff84ba', mr: 1 }} />
        <Typography variant="h6" noWrap component="div" sx={{ display: { xs: 'none', sm: 'block' } }} className="font-black gradient-text tracking-wide text-xl">
          DocsApp
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box className="px-4 py-1.5 rounded-full bg-white/80 border border-pink-200 mr-4">
            <Typography variant="caption" className="font-semibold text-gray-600">
              {user?.email}
            </Typography>
          </Box>
          <Button 
            variant="text" 
            startIcon={<LogoutIcon />} 
            onClick={handleLogout}
            sx={{ color: '#e06b9e', '&:hover': { backgroundColor: 'rgba(224, 107, 158, 0.1)' }, textTransform: 'none', fontWeight: 'bold' }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
