import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { logout } from './authSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/subscription`;

// Fetch tariff & pricing configuration (free MB, price per 50MB, tiers, storage boosters)
export const fetchTariff = createAsyncThunk(
  'subscription/fetchTariff',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { tariffLastFetched } = getState().subscription;
      // Debounce: If fetched in the last 30s, reuse current tariff
      if (tariffLastFetched && Date.now() - tariffLastFetched < 30000) {
        return getState().subscription.tariff;
      }
      const response = await axios.get(`${API_URL}/tariff`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tariff details');
    }
  }
);

// Fetch Razorpay public configuration
export const fetchRazorpayConfig = createAsyncThunk(
  'subscription/fetchRazorpayConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/razorpay-config`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Razorpay config');
    }
  }
);

// Fetch user's own storage usage across all groups they created
export const fetchStorageUsage = createAsyncThunk(
  'subscription/fetchStorageUsage',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_URL}/usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch storage usage');
    }
  }
);

// Fetch storage usage for a specific active group
export const fetchGroupStorageUsage = createAsyncThunk(
  'subscription/fetchGroupStorageUsage',
  async (groupId, { getState, dispatch, rejectWithValue }) => {
    try {
      if (!groupId) return null;
      const token = getState().auth.token;
      if (!token) return rejectWithValue('Not authenticated');
      const response = await axios.get(`${API_URL}/group-usage/${encodeURIComponent(groupId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch group storage');
    }
  }
);

// Create Razorpay Order
export const createRazorpayOrder = createAsyncThunk(
  'subscription/createRazorpayOrder',
  async ({ planId, isStoragePack = false, storageMB, price }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        `${API_URL}/create-order`,
        { planId, isStoragePack, storageMB, price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to initiate Razorpay payment order');
    }
  }
);

// Verify Razorpay Payment Signature
export const verifyRazorpayPayment = createAsyncThunk(
  'subscription/verifyRazorpayPayment',
  async (paymentData, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        `${API_URL}/verify-payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Payment signature verification failed');
    }
  }
);

// Direct / Simulated Subscribe fallback
export const subscribePlan = createAsyncThunk(
  'subscription/subscribePlan',
  async ({ planId, paymentMethod }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        `${API_URL}/subscribe`,
        { planId, paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Subscription activation failed');
    }
  }
);

// Fetch subscription purchase history
export const fetchSubscriptionHistory = createAsyncThunk(
  'subscription/fetchSubscriptionHistory',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription history');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
    tariff: {
      freeStorageMB: 50,
      warningThresholdPercent: 80,
      currency: 'INR',
      currencySymbol: '₹',
      pricePer50MB: 99,
      tiers: [],
      boosters: []
    },
    tariffLastFetched: null,
    razorpayConfig: {
      keyId: '',
      isLive: false,
      currency: 'INR',
      currencySymbol: '₹'
    },
    userStats: null,
    groupStats: null,
    history: [],
    loading: false,
    subscribing: false,
    paymentProcessing: false,
    subscribeSuccess: null,
    error: null,
    isModalOpen: false,
  },
  reducers: {
    setSubscriptionModalOpen: (state, action) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.subscribeSuccess = null;
        state.error = null;
        state.paymentProcessing = false;
      }
    },
    clearSubscriptionError: (state) => {
      state.error = null;
      state.subscribeSuccess = null;
    },
    setPaymentProcessing: (state, action) => {
      state.paymentProcessing = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Tariff
      .addCase(fetchTariff.fulfilled, (state, action) => {
        state.tariff = action.payload;
        state.tariffLastFetched = Date.now();
      })
      // Razorpay Config
      .addCase(fetchRazorpayConfig.fulfilled, (state, action) => {
        state.razorpayConfig = action.payload;
      })
      // Storage usage
      .addCase(fetchStorageUsage.pending, (state) => {
        if (!state.userStats) state.loading = true;
      })
      .addCase(fetchStorageUsage.fulfilled, (state, action) => {
        state.loading = false;
        state.userStats = action.payload;
      })
      .addCase(fetchStorageUsage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Group storage usage
      .addCase(fetchGroupStorageUsage.fulfilled, (state, action) => {
        state.groupStats = action.payload;
      })
      // Verify Razorpay Payment
      .addCase(verifyRazorpayPayment.pending, (state) => {
        state.paymentProcessing = true;
        state.subscribeSuccess = null;
        state.error = null;
      })
      .addCase(verifyRazorpayPayment.fulfilled, (state, action) => {
        state.paymentProcessing = false;
        state.subscribing = false;
        state.subscribeSuccess = action.payload.message;
        state.userStats = action.payload.stats;
        if (action.payload.subscription) {
          state.history.unshift(action.payload.subscription);
        }
      })
      .addCase(verifyRazorpayPayment.rejected, (state, action) => {
        state.paymentProcessing = false;
        state.subscribing = false;
        state.error = action.payload;
      })
      // Direct subscribe plan
      .addCase(subscribePlan.pending, (state) => {
        state.subscribing = true;
        state.subscribeSuccess = null;
        state.error = null;
      })
      .addCase(subscribePlan.fulfilled, (state, action) => {
        state.subscribing = false;
        state.subscribeSuccess = action.payload.message;
        state.userStats = action.payload.stats;
        if (action.payload.subscription) {
          state.history.unshift(action.payload.subscription);
        }
      })
      .addCase(subscribePlan.rejected, (state, action) => {
        state.subscribing = false;
        state.error = action.payload;
      })
      // Subscription history
      .addCase(fetchSubscriptionHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  }
});

export const { 
  setSubscriptionModalOpen, 
  clearSubscriptionError, 
  setPaymentProcessing 
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
