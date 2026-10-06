import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import SEO from '../SEO/SEO';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password/${token}`, { password });
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <SEO title="Reset Password" />
      <Paper elevation={0} className="w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-center">
        <Typography variant="h5" className="font-extrabold mb-2 dark:text-white">
          Reset Your Password
        </Typography>
        <Typography variant="body2" className="text-gray-500 mb-6">
          Enter your new password below.
        </Typography>

        {message && (
          <Box className="bg-green-50 p-3 rounded-lg border border-green-200 text-green-700 mb-4">
            {message}
          </Box>
        )}
        
        {error && (
          <Box className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-700 mb-4">
            {error}
          </Box>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField 
            fullWidth 
            label="New Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            variant="outlined"
          />
          <TextField 
            fullWidth 
            label="Confirm New Password" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            variant="outlined"
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || !password || !confirmPassword}
            className="mt-2 py-3 bg-gradient-to-r from-[#60a5fa] to-[#427c36] text-white"
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ResetPassword;
