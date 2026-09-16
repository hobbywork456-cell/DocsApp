import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { joinWithInviteToken } from '../../slices/groupSlice';
import { Box, Typography, CircularProgress, Button } from '@mui/material';

const InviteHandler = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!isAuthenticated) {
      // Store token in session storage and redirect to login
      sessionStorage.setItem('pendingInviteToken', token);
      navigate('/login');
      return;
    }

    const processInvite = async () => {
      const resultAction = await dispatch(joinWithInviteToken({ token }));
      if (joinWithInviteToken.fulfilled.match(resultAction)) {
        navigate('/home');
      } else {
        setError(resultAction.payload || 'Failed to join group with this link.');
      }
    };

    processInvite();
  }, [token, isAuthenticated, navigate, dispatch]);

  if (error) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-[100dvh] bg-pink-50 p-4">
        <Box className="p-8 bg-white rounded-3xl shadow-xl max-w-md text-center">
          <Typography variant="h5" className="font-black text-red-600 mb-2">
            Invalid Invite Link
          </Typography>
          <Typography variant="body2" className="text-gray-600 mb-6">
            {error}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/home')} sx={{ bgcolor: '#ff84ba', '&:hover': { bgcolor: '#e06b9e' }, borderRadius: '12px', textTransform: 'none', fontWeight: 'bold' }}>
            Go to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col items-center justify-center min-h-[100dvh] bg-pink-50">
      <CircularProgress sx={{ color: '#ff84ba', mb: 3 }} size={40} />
      <Typography variant="h6" className="font-bold text-gray-700">
        Processing Invite...
      </Typography>
    </Box>
  );
};

export default InviteHandler;
