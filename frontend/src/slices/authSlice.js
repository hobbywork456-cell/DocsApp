import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

const getInitialAuthState = () => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token) {
    return { user: null, token: null, isAuthenticated: false };
  }

  try {
    const decoded = jwtDecode(token);
    // If token has expired, clean storage and treat as logged out
    if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { user: null, token: null, isAuthenticated: false };
    }

    let user = null;
    try {
      user = storedUser ? JSON.parse(storedUser) : null;
    } catch {
      user = null;
    }

    if (!user) {
      user = { id: decoded.userId, role: decoded.role };
    } else if (!user.role && decoded.role) {
      user.role = decoded.role;
    }

    return {
      user,
      token,
      isAuthenticated: true,
    };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { user: null, token: null, isAuthenticated: false };
  }
};

export const fetchCurrentProfile = createAsyncThunk(
  'auth/fetchCurrentProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue({ isAuthError: true, message: 'No token' });
      const response = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        return rejectWithValue({ isAuthError: true, message: 'Session expired' });
      }
      return rejectWithValue({ isAuthError: false, message: error.response?.data?.message || 'Failed to fetch profile' });
    }
  }
);

const initialState = getInitialAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    updateCurrentUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCurrentProfile.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    });
    builder.addCase(fetchCurrentProfile.rejected, (state, action) => {
      if (action.payload?.isAuthError) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    });
  }
});

export const { loginSuccess, updateCurrentUser, logout } = authSlice.actions;
export default authSlice.reducer;

