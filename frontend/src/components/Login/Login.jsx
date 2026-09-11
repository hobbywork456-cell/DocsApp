import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../slices/authSlice';
import { Box, Button, TextField, Typography, Container, Paper, Tabs, Tab } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:5000/api/auth';

const Login = () => {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = tab === 0 ? '/login' : '/register';
      const response = await axios.post(`${API_URL}${endpoint}`, { email, password });
      dispatch(loginSuccess(response.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <Box className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-[#fff0f6]">
      {/* Abstract Background Curves */}
      <Box 
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" 
        style={{ background: 'linear-gradient(135deg, #ff9ecc 0%, #ff84ba 100%)' }} 
      />
      <Box 
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" 
        style={{ background: 'linear-gradient(135deg, #ffb6d8 0%, #ff84ba 100%)' }} 
      />

      <Container maxWidth="sm" className="relative z-10">
        <Paper 
          elevation={0} 
          className="p-10 shadow-2xl glass-effect border-[4px] border-white/80"
          style={{ borderRadius: '3rem', boxShadow: '0 25px 50px -12px rgba(255, 132, 186, 0.25), inset 0 2px 6px rgba(255, 255, 255, 0.8)' }} // Curve and detailed edge design
        >
          <Box className="flex flex-col  items-center mb-6">
            <Box className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center shadow-lg mb-4" style={{ boxShadow: '0 8px 20px 0 rgba(255, 132, 186, 0.5)' }}>
              <MenuBookIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography variant="h3" component="h1" align="center" className="font-black gradient-text tracking-wide">
              DocsApp
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" className="mt-2 font-medium">
              Step into your creative space.
            </Typography>
          </Box>
          
          <Box className="border-3 border-white/80 rounded-[2.5rem] p-8 bg-white/40 backdrop-blur-md shadow-inner mt-2">
            <Tabs 
            value={tab} 
            onChange={(e, newValue) => setTab(newValue)} 
            variant="fullWidth" 
            className="mb-8"
            TabIndicatorProps={{ style: { backgroundColor: '#ff84ba', height: 4, borderRadius: '4px 4px 0 0' } }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1.1rem',
                borderRadius: '1rem 1rem 0 0',
                transition: 'all 0.3s ease',
              },
              '& .MuiTab-root.Mui-selected': {
                color: '#ff84ba',
                fontWeight: '900',
              }
            }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-8 mt-8">
            <TextField
              fullWidth
              label="Email Address"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                sx: { borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.7)', paddingLeft: '8px' }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#ff84ba' },
                  '&.Mui-focused fieldset': { borderColor: '#ff84ba', borderWidth: '2px' }
                }
              }}
            />
            <br /><br />
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                sx: { borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.7)', paddingLeft: '8px' }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#ff84ba' },
                  '&.Mui-focused fieldset': { borderColor: '#ff84ba', borderWidth: '2px' }
                }
              }}
            />
            <br /> <br />
            {error && (
              <Box className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
                <Typography color="error" variant="body2" className="font-bold">{error}</Typography>
              </Box>
            )}
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              className="mt-8 py-4 gradient-bg text-white font-black tracking-widest hover:opacity-90 transition-all hover:scale-[1.02]"
              style={{ borderRadius: '9999px' }}
              sx={{ textTransform: 'uppercase', boxShadow: '0 8px 25px -5px rgba(255, 132, 186, 0.6)' }}
            >
              {tab === 0 ? 'Sign In To DocsApp' : 'Join DocsApp'}
            </Button>
          </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
