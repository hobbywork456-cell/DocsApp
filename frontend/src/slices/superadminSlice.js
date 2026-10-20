import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { logout } from './authSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/superadmin`;

const getHeaders = (getState) => {
  const token = getState().auth.token;
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Fetch Super Admin Stats
export const fetchSuperAdminStats = createAsyncThunk(
  'superadmin/fetchStats',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/stats`, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to load stats');
    }
  }
);

// Fetch All Users with Storage details
export const fetchSuperAdminUsers = createAsyncThunk(
  'superadmin/fetchUsers',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/users`, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to load users');
    }
  }
);

// Fetch All Groups
export const fetchSuperAdminGroups = createAsyncThunk(
  'superadmin/fetchGroups',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/groups`, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to load groups');
    }
  }
);

// Fetch Tariff Settings
export const fetchSuperAdminTariff = createAsyncThunk(
  'superadmin/fetchTariff',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/tariff`, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to load tariff');
    }
  }
);

// Update Tariff Settings (Free MB, Price, Tiers, Currency)
export const updateSuperAdminTariff = createAsyncThunk(
  'superadmin/updateTariff',
  async (tariffData, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/tariff`, tariffData, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to update tariff settings');
    }
  }
);

// Update User Role (promote/demote)
export const updateUserRole = createAsyncThunk(
  'superadmin/updateUserRole',
  async ({ userId, role }, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/users/${userId}/role`, { role }, getHeaders(getState));
      return { userId, role, data: response.data };
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to update role');
    }
  }
);

// Update User Storage Quota Override
export const updateUserQuota = createAsyncThunk(
  'superadmin/updateUserQuota',
  async ({ userId, customStorageLimitMB }, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/users/${userId}/quota`, { customStorageLimitMB }, getHeaders(getState));
      return { userId, stats: response.data.stats };
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to update quota');
    }
  }
);

// Fetch All Subscriptions
export const fetchSuperAdminSubscriptions = createAsyncThunk(
  'superadmin/fetchSubscriptions',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/subscriptions`, getHeaders(getState));
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) dispatch(logout());
      return rejectWithValue(error.response?.data?.message || 'Failed to load subscriptions');
    }
  }
);

const superadminSlice = createSlice({
  name: 'superadmin',
  initialState: {
    stats: null,
    users: [],
    groups: [],
    tariff: null,
    subscriptions: [],
    loading: false,
    tariffUpdating: false,
    tariffSuccessMsg: null,
    error: null,
  },
  reducers: {
    clearSuperAdminMessages: (state) => {
      state.tariffSuccessMsg = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Stats
      .addCase(fetchSuperAdminStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSuperAdminStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchSuperAdminStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Users
      .addCase(fetchSuperAdminUsers.fulfilled, (state, action) => {
        state.users = action.payload;
      })
      // Groups
      .addCase(fetchSuperAdminGroups.fulfilled, (state, action) => {
        state.groups = action.payload;
      })
      // Tariff
      .addCase(fetchSuperAdminTariff.fulfilled, (state, action) => {
        state.tariff = action.payload;
      })
      // Update Tariff
      .addCase(updateSuperAdminTariff.pending, (state) => {
        state.tariffUpdating = true;
        state.tariffSuccessMsg = null;
        state.error = null;
      })
      .addCase(updateSuperAdminTariff.fulfilled, (state, action) => {
        state.tariffUpdating = false;
        state.tariffSuccessMsg = action.payload.message;
        state.tariff = action.payload.settings;
      })
      .addCase(updateSuperAdminTariff.rejected, (state, action) => {
        state.tariffUpdating = false;
        state.error = action.payload;
      })
      // Update User Role
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.userId.toString() === action.payload.userId.toString());
        if (index !== -1) {
          state.users[index].role = action.payload.role;
        }
      })
      // Update User Quota
      .addCase(updateUserQuota.fulfilled, (state, action) => {
        const index = state.users.findIndex(u => u.userId.toString() === action.payload.userId.toString());
        if (index !== -1) {
          state.users[index] = action.payload.stats;
        }
      })
      // Subscriptions
      .addCase(fetchSuperAdminSubscriptions.fulfilled, (state, action) => {
        state.subscriptions = action.payload;
      });
  }
});

export const { clearSuperAdminMessages } = superadminSlice.actions;
export default superadminSlice.reducer;
