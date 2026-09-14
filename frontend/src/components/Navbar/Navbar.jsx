import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Tooltip } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LogoutIcon from '@mui/icons-material/Logout';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DescriptionIcon from '@mui/icons-material/Description';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../slices/authSlice';
import './Navbar.css';

const Navbar = ({ mobileView, onToggleMobileView, hasOpenDocuments }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="bg-white/60 backdrop-blur-md border-b border-white/80 pt-0.5 sm:pt-1 pb-0.5 sm:pb-1">
      <Toolbar className="px-3 sm:px-6 min-h-[52px] sm:min-h-[64px]">
        <Box className="flex items-center">
          <MenuBookIcon sx={{ color: '#ff84ba', mr: 1, fontSize: { xs: 24, sm: 28 } }} />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            className="font-black gradient-text tracking-wide text-lg sm:text-xl"
          >
            DocsApp
          </Typography>
        </Box>

        {/* Mobile View Switcher when documents are open */}
        {hasOpenDocuments && (
          <Box className="flex md:hidden ml-2 sm:ml-4 bg-white/70 rounded-full p-0.5 border border-pink-200 shadow-sm">
            <Button
              size="small"
              onClick={() => onToggleMobileView && onToggleMobileView('sidebar')}
              startIcon={<LibraryBooksIcon sx={{ fontSize: 14 }} />}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontSize: '0.72rem',
                fontWeight: 700,
                px: 1.25,
                py: 0.25,
                minWidth: 'auto',
                bgcolor: mobileView === 'sidebar' ? '#ff84ba' : 'transparent',
                color: mobileView === 'sidebar' ? 'white' : '#6b7280',
                boxShadow: mobileView === 'sidebar' ? '0 2px 6px rgba(255,132,186,0.3)' : 'none',
                '&:hover': {
                  bgcolor: mobileView === 'sidebar' ? '#e06b9e' : 'rgba(255,132,186,0.1)'
                }
              }}
            >
              Library
            </Button>
            <Button
              size="small"
              onClick={() => onToggleMobileView && onToggleMobileView('editor')}
              startIcon={<DescriptionIcon sx={{ fontSize: 14 }} />}
              sx={{
                borderRadius: '9999px',
                textTransform: 'none',
                fontSize: '0.72rem',
                fontWeight: 700,
                px: 1.25,
                py: 0.25,
                minWidth: 'auto',
                bgcolor: mobileView === 'editor' ? '#ff84ba' : 'transparent',
                color: mobileView === 'editor' ? 'white' : '#6b7280',
                boxShadow: mobileView === 'editor' ? '0 2px 6px rgba(255,132,186,0.3)' : 'none',
                '&:hover': {
                  bgcolor: mobileView === 'editor' ? '#e06b9e' : 'rgba(255,132,186,0.1)'
                }
              }}
            >
              Doc
            </Button>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {/* User Email: full chip on desktop, compact avatar on mobile */}
          <Box className="hidden sm:block px-4 py-1.5 rounded-full bg-white/80 border border-pink-200">
            <Typography variant="caption" className="font-semibold text-gray-600">
              {user?.email}
            </Typography>
          </Box>
          <Tooltip title={user?.email || 'User'}>
            <Box className="sm:hidden w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff84ba] to-[#ff9ecc] text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </Box>
          </Tooltip>

          <Button 
            variant="text" 
            startIcon={<LogoutIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />} 
            onClick={handleLogout}
            sx={{ 
              color: '#e06b9e', 
              '&:hover': { backgroundColor: 'rgba(224, 107, 158, 0.1)' }, 
              textTransform: 'none', 
              fontWeight: 'bold',
              minWidth: { xs: 'auto', sm: '64px' },
              px: { xs: 0.8, sm: 2 }
            }}
          >
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
