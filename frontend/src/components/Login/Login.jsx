import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../slices/authSlice';
import { Box, Button, TextField, Typography, Container, Paper, Tabs, Tab, IconButton, InputAdornment, Divider, useMediaQuery, useTheme } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import GoogleIcon from '@mui/icons-material/Google';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../SEO/SEO';
import './Login.css';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

const Login = () => {
  const [tab, setTab] = useState(0); // 0 = login, 1 = register
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (e, newValue) => {
    setTab(newValue);
    setError('');
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event) => event.preventDefault();

  const handleSubmit = async (e, currentTab) => {
    e.preventDefault();
    setError('');
    
    if (currentTab === 1 && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const endpoint = currentTab === 0 ? '/login' : '/register';
      const payload = currentTab === 0 
        ? { email, password } 
        : { firstName, lastName, email, password };
        
      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      dispatch(loginSuccess(response.data));

      const pendingToken = sessionStorage.getItem('pendingInviteToken');
      if (pendingToken) {
        sessionStorage.removeItem('pendingInviteToken');
        navigate(`/invite/${pendingToken}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleGoogleAuth = () => {
    alert('Google Authentication flow goes here!');
  };

  const sharedTextFieldProps = {
    sx: {
      '& .MuiOutlinedInput-root': {
        '&:hover fieldset': { borderColor: '#427c36' },
        '&.Mui-focused fieldset': { borderColor: '#427c36', borderWidth: '2px' }
      }
    },
    slotProps: { 
      input: { className: 'rounded-xl bg-gray-50 dark:bg-gray-700/50 dark:text-white dark:border-gray-600' }
    }
  };

  const renderLoginForm = (isDesktop = false) => (
    <Box className="w-full h-full flex flex-col justify-center px-6 sm:px-14 py-8">
      {!isDesktop && (
        <Box className="flex flex-col items-center mb-6">
          <MenuBookIcon className="text-[#427c36] dark:text-green-400 mb-2" sx={{ fontSize: 40 }} />
          <Typography variant="h5" className="font-extrabold text-gray-800 dark:text-white">Welcome Back</Typography>
        </Box>
      )}
      {isDesktop && (
        <Typography variant="h4" className="font-extrabold text-gray-800 dark:text-white mb-2 text-center">Sign In</Typography>
      )}
      
      <form onSubmit={(e) => handleSubmit(e, 0)} className="flex flex-col gap-4 mt-4 max-w-sm mx-auto w-full">
        <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required {...sharedTextFieldProps} />
        
        <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required {...sharedTextFieldProps} 
          slotProps={{ input: { ...sharedTextFieldProps.slotProps.input, endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" className="dark:text-gray-400">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )}}} 
        />
        
        <Box className="flex justify-end -mt-2">
          <Button variant="text" size="small" sx={{ textTransform: 'none', color: '#427c36', fontWeight: 600 }} onClick={() => alert("Forgot password flow goes here")}>
            Forgot password?
          </Button>
        </Box>

        {error && tab === 0 && (
          <Box className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-100 dark:border-red-800 text-center">
            <Typography color="error" variant="body2" className="font-bold dark:text-red-400">{error}</Typography>
          </Box>
        )}
        
        <Button fullWidth variant="contained" size="large" type="submit" className="mt-2 py-3.5 bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white font-bold tracking-wide hover:opacity-90 shadow-md" style={{ borderRadius: '12px' }} sx={{ textTransform: 'none', fontSize: '1.1rem' }}>
          Sign In
        </Button>
        
        <Box className="mt-3 flex items-center">
          <Divider className="flex-grow dark:border-gray-700" />
          <Typography variant="body2" className="px-4 text-gray-500 dark:text-gray-400 font-medium">OR</Typography>
          <Divider className="flex-grow dark:border-gray-700" />
        </Box>

        <Button fullWidth variant="outlined" size="large" startIcon={<GoogleIcon style={{ color: '#EA4335' }} />} onClick={handleGoogleAuth} className="mt-2 py-3 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}>
          Sign in with Google
        </Button>
      </form>
    </Box>
  );

  const renderRegisterForm = (isDesktop = false) => (
    <Box className="w-full h-full flex flex-col justify-center px-6 sm:px-14 py-8">
      {!isDesktop && (
        <Box className="flex flex-col items-center mb-6">
          <MenuBookIcon className="text-[#427c36] dark:text-green-400 mb-2" sx={{ fontSize: 40 }} />
          <Typography variant="h5" className="font-extrabold text-gray-800 dark:text-white">Create Account</Typography>
        </Box>
      )}
      {isDesktop && (
        <Typography variant="h4" className="font-extrabold text-gray-800 dark:text-white mb-2 text-center">Sign Up</Typography>
      )}

      <form onSubmit={(e) => handleSubmit(e, 1)} className="flex flex-col gap-4 mt-2 max-w-sm mx-auto w-full">
        <Box className="flex gap-3">
          <TextField fullWidth label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required {...sharedTextFieldProps} />
          <TextField fullWidth label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required {...sharedTextFieldProps} />
        </Box>
        <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required {...sharedTextFieldProps} />
        
        <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required {...sharedTextFieldProps}
          slotProps={{ input: { ...sharedTextFieldProps.slotProps.input, endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end" className="dark:text-gray-400">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )}}} 
        />
        
        <TextField fullWidth label="Confirm Password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required {...sharedTextFieldProps} />

        {error && tab === 1 && (
          <Box className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-100 dark:border-red-800 text-center">
            <Typography color="error" variant="body2" className="font-bold dark:text-red-400">{error}</Typography>
          </Box>
        )}
        
        <Button fullWidth variant="contained" size="large" type="submit" className="mt-2 py-3.5 bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white font-bold tracking-wide hover:opacity-90 shadow-md" style={{ borderRadius: '12px' }} sx={{ textTransform: 'none', fontSize: '1.1rem' }}>
          Register
        </Button>
      </form>
    </Box>
  );

  return (
    <Box component="main" className="min-h-screen relative flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">
      <SEO title={tab === 0 ? 'Sign In' : 'Create Free Account'} description="Authenticate to DocsApp" />
      
      {/* Background Orbs */}
      <Box className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob dark:opacity-20" style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)' }} />
      <Box className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 dark:opacity-20" style={{ background: 'linear-gradient(135deg, #a7f3d0 0%, #427c36 100%)' }} />

      {/* MOBILE LAYOUT */}
      {isMobile ? (
        <Container maxWidth="sm" className="relative z-10 w-full">
          <Paper elevation={0} className="w-full shadow-2xl border border-gray-200 dark:border-gray-800 rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl overflow-hidden">
            <Tabs value={tab} onChange={handleTabChange} variant="fullWidth" sx={{ '& .MuiTab-root': { textTransform: 'none', fontSize: '1rem', fontWeight: 600, color: 'text.secondary' }, '& .Mui-selected': { color: '#427c36' } }} slotProps={{ indicator: { style: { backgroundColor: '#427c36' } } }}>
              <Tab label="Login" />
              <Tab label="Register" />
            </Tabs>
            <Box className="relative w-full">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, x: tab === 0 ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tab === 0 ? 30 : -30 }} transition={{ duration: 0.2 }} className="w-full">
                  {tab === 0 ? renderLoginForm(false) : renderRegisterForm(false)}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Paper>
        </Container>
      ) : (
        /* DESKTOP 3D SLIDING LAYOUT */
        <Box className="relative z-10 w-[900px] h-[650px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex">
          
          {/* Left Side: Sign In Form */}
          <Box className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-700 ease-in-out ${tab === 0 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
            {renderLoginForm(true)}
          </Box>

          {/* Right Side: Sign Up Form */}
          <Box className={`absolute top-0 right-0 w-1/2 h-full transition-all duration-700 ease-in-out ${tab === 1 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
            {renderRegisterForm(true)}
          </Box>

          {/* Sliding Overlay Panel */}
          <motion.div 
            className="absolute top-0 left-0 w-1/2 h-full z-20 shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-gradient-to-br from-[#60a5fa] to-[#427c36] flex items-center justify-center overflow-hidden"
            animate={{ x: tab === 1 ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            style={{ 
              borderTopRightRadius: tab === 0 ? '0' : '24px', 
              borderBottomRightRadius: tab === 0 ? '0' : '24px', 
              borderTopLeftRadius: tab === 1 ? '0' : '24px', 
              borderBottomLeftRadius: tab === 1 ? '0' : '24px' 
            }}
          >
            {/* Absolute positioning guarantees 100% perfect center alignment */}
            
            {/* Overlay Welcome Content (Visible when tab=1, panel on left) */}
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white"
              animate={{ 
                x: tab === 1 ? 0 : -80,
                opacity: tab === 1 ? 1 : 0,
                pointerEvents: tab === 1 ? 'auto' : 'none'
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <MenuBookIcon sx={{ fontSize: 60, mb: 3 }} />
              <Typography variant="h3" className="font-extrabold mb-4">Welcome Back!</Typography>
              <Typography variant="body1" className="mb-8 opacity-90 max-w-[300px]">
                To keep connected with your workspace, please login with your personal info.
              </Typography>
              <Button variant="outlined" size="large" onClick={() => switchTab(0)} sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, borderRadius: '30px', px: 6, py: 1.5, textTransform: 'none', fontSize: '1.1rem', fontWeight: 700 }}>
                Sign In
              </Button>
            </motion.div>

            {/* Overlay Hello Content (Visible when tab=0, panel on right) */}
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white"
              animate={{ 
                x: tab === 0 ? 0 : 80,
                opacity: tab === 0 ? 1 : 0,
                pointerEvents: tab === 0 ? 'auto' : 'none'
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <MenuBookIcon sx={{ fontSize: 60, mb: 3 }} />
              <Typography variant="h3" className="font-extrabold mb-4">Hello, Friend!</Typography>
              <Typography variant="body1" className="mb-8 opacity-90 max-w-[300px]">
                Enter your personal details and start your journey with DocsApp today.
              </Typography>
              <Button variant="outlined" size="large" onClick={() => switchTab(1)} sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, borderRadius: '30px', px: 6, py: 1.5, textTransform: 'none', fontSize: '1.1rem', fontWeight: 700 }}>
                Sign Up
              </Button>
            </motion.div>

          </motion.div>
        </Box>
      )}
    </Box>
  );
};

export default Login;
