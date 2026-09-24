import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../../slices/authSlice';
import { Box, Button, TextField, Typography, Container, Paper, Tabs, Tab } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import axios from 'axios';
import SEO from '../SEO/SEO';
import './Login.css';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

const Login = () => {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = tab === 0 ? '/login' : '/register';
      const response = await axios.post(`${API_URL}${endpoint}`, { email, password });
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

  return (
    <Box component="main" id="login-main-section" className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#fffafc]">
      <SEO 
        title={tab === 0 ? 'Sign In' : 'Create Free Account'} 
        description={tab === 0 
          ? 'Sign in to DocsApp to access your personal document library, rich text notes, and version history.' 
          : 'Create your free DocsApp account to start writing, organizing notes, and exporting documents to PDF.'} 
      />
      {/* Abstract Background Curves */}
      <Box 
        aria-hidden="true"
        className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" 
        style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #427c36 100%)' }} 
      />
      <Box 
        aria-hidden="true"
        className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" 
        style={{ background: 'linear-gradient(135deg, #ffb6d8 0%, #427c36 100%)' }} 
      />

      <Container maxWidth="sm" className="relative z-10">
        <Paper 
          elevation={0} 
          className="p-6 sm:p-12 shadow-xl border border-green-100 rounded-3xl bg-white/90 backdrop-blur-md"
          style={{ boxShadow: '0 25px 50px -12px rgba(134, 239, 172, 0.15)' }}
        >
          <Box className="flex flex-col items-center mb-8">
            <Box className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4 shadow-sm border border-green-50" style={{ boxShadow: '0 8px 20px 0 rgba(134, 239, 172, 0.2)' }}>
              <MenuBookIcon sx={{ color: '#427c36', fontSize: { xs: 32, sm: 40 } }} />
            </Box>
            <Typography variant="h4" component="h1" align="center" className="font-extrabold text-gray-800 tracking-tight text-3xl sm:text-4xl mb-1">
              DocsApp
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" className="text-gray-500 font-medium">
              Step into your creative space.
            </Typography>
          </Box>
          
          <Box className="mt-4">
            <Tabs 
            id="auth-tabs"
            value={tab} 
            onChange={(e, newValue) => setTab(newValue)} 
            variant="fullWidth" 
            className="mb-8"
            aria-label="Sign in or registration switch"
            slotProps={{ indicator: { style: { backgroundColor: '#427c36', height: 3, borderRadius: '3px 3px 0 0' } } }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1.05rem',
                transition: 'all 0.3s ease',
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#427c36',
                fontWeight: '800',
              }
            }}
          >
            <Tab id="tab-login" label="Login" aria-controls="auth-panel" />
            <Tab id="tab-register" label="Register" aria-controls="auth-panel" />
          </Tabs>

          <form id="auth-form" onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <TextField
              id="auth-email-input"
              fullWidth
              label="Email Address"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              slotProps={{ htmlInput: { 'aria-label': 'Email Address', id: 'auth-email-input' },
              input: { sx: { borderRadius: '12px', backgroundColor: '#fafafa' } }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#427c36' },
                  '&.Mui-focused fieldset': { borderColor: '#427c36', borderWidth: '2px' }
                }
              }}
            />
            
            <TextField
              id="auth-password-input"
              fullWidth
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              slotProps={{ htmlInput: { 'aria-label': 'Password', id: 'auth-password-input' },
              input: { sx: { borderRadius: '12px', backgroundColor: '#fafafa' } }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#427c36' },
                  '&.Mui-focused fieldset': { borderColor: '#427c36', borderWidth: '2px' }
                }
              }}
            />
            
            {error && (
              <Box id="auth-error-message" role="alert" className="bg-red-50 p-3 rounded-xl border border-red-100 text-center mt-4">
                <Typography color="error" variant="body2" className="font-bold">{error}</Typography>
              </Box>
            )}
            
            <Button
              id="auth-submit-button"
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              className="mt-8 py-3.5 bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white font-bold tracking-wide hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              style={{ borderRadius: '12px' }}
              sx={{ textTransform: 'none', fontSize: '1.1rem' }}
            >
              {tab === 0 ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
