import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { logout } from './authSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/groups`;

export const fetchMyGroups = createAsyncThunk(
  'groups/fetchMyGroups',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/my-groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch groups');
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async ({ name, groupId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        API_URL,
        { name, groupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to create group');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async ({ groupId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        `${API_URL}/join`,
        { groupId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.group;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to join group');
    }
  }
);

export const fetchGroupMembers = createAsyncThunk(
  'groups/fetchGroupMembers',
  async (groupId, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}/${encodeURIComponent(groupId)}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch members');
    }
  }
);

export const removeGroupMember = createAsyncThunk(
  'groups/removeGroupMember',
  async ({ groupId, userId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.delete(
        `${API_URL}/${encodeURIComponent(groupId)}/members/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to remove member');
    }
  }
);

export const deleteGroup = createAsyncThunk(
  'groups/deleteGroup',
  async ({ groupId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.delete(
        `${API_URL}/${encodeURIComponent(groupId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { ...response.data, groupId };
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to delete group');
    }
  }
);

const groupSlice = createSlice({
  name: 'groups',
  initialState: {
    groups: [],
    activeGroupId: localStorage.getItem('activeGroupId') || null,
    currentGroupMembers: [],
    isCurrentUserAdmin: false,
    membersLoading: false,
    status: 'idle',
    actionLoading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    setActiveGroupId: (state, action) => {
      state.activeGroupId = action.payload;
      if (action.payload) {
        localStorage.setItem('activeGroupId', action.payload);
      } else {
        localStorage.removeItem('activeGroupId');
      }
    },
    clearGroupFeedback: (state) => {
      state.error = null;
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchMyGroups
      .addCase(fetchMyGroups.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.groups = action.payload;
        // Verify activeGroupId exists in groups, else default to first group or null
        const exists = action.payload.some((g) => g.groupId === state.activeGroupId);
        if (!exists) {
          state.activeGroupId = action.payload.length > 0 ? action.payload[0].groupId : null;
          if (state.activeGroupId) {
            localStorage.setItem('activeGroupId', state.activeGroupId);
          } else {
            localStorage.removeItem('activeGroupId');
          }
        }
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // createGroup
      .addCase(createGroup.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.groups.unshift(action.payload);
        state.activeGroupId = action.payload.groupId;
        localStorage.setItem('activeGroupId', action.payload.groupId);
        state.successMessage = `Group "${action.payload.name}" created successfully!`;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // joinGroup
      .addCase(joinGroup.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.actionLoading = false;
        const index = state.groups.findIndex((g) => g.groupId === action.payload.groupId);
        if (index !== -1) {
          state.groups[index] = action.payload;
        } else {
          state.groups.unshift(action.payload);
        }
        state.activeGroupId = action.payload.groupId;
        localStorage.setItem('activeGroupId', action.payload.groupId);
        state.successMessage = `Successfully joined "${action.payload.name}"!`;
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // fetchGroupMembers
      .addCase(fetchGroupMembers.pending, (state) => {
        state.membersLoading = true;
      })
      .addCase(fetchGroupMembers.fulfilled, (state, action) => {
        state.membersLoading = false;
        state.currentGroupMembers = action.payload.members || [];
        state.isCurrentUserAdmin = !!action.payload.isCurrentUserAdmin;
      })
      .addCase(fetchGroupMembers.rejected, (state, action) => {
        state.membersLoading = false;
        state.error = action.payload;
      })

      // removeGroupMember
      .addCase(removeGroupMember.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.currentGroupMembers = action.payload.members || [];
        state.successMessage = action.payload.message;
      })
      .addCase(removeGroupMember.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // deleteGroup
      .addCase(deleteGroup.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.groups = state.groups.filter(g => g.groupId !== action.payload.groupId);
        if (state.activeGroupId === action.payload.groupId) {
          state.activeGroupId = state.groups.length > 0 ? state.groups[0].groupId : null;
          if (state.activeGroupId) {
            localStorage.setItem('activeGroupId', state.activeGroupId);
          } else {
            localStorage.removeItem('activeGroupId');
          }
        }
        state.currentGroupMembers = [];
        state.isCurrentUserAdmin = false;
        state.successMessage = action.payload.message;
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setActiveGroupId, clearGroupFeedback } = groupSlice.actions;
export default groupSlice.reducer;
