import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { logout } from './authSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/documents`;

export const fetchDocuments = createAsyncThunk('documents/fetchDocuments', async (_, { getState, dispatch, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      dispatch(logout());
    }
    return rejectWithValue(error.response?.data);
  }
});

export const createDocument = createAsyncThunk('documents/createDocument', async (docData, { getState, dispatch, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const response = await axios.post(API_URL, docData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      dispatch(logout());
    }
    return rejectWithValue(error.response?.data);
  }
});

export const updateDocument = createAsyncThunk('documents/updateDocument', async ({ id, title, content }, { getState, dispatch, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    const response = await axios.put(`${API_URL}/${id}`, { title, content }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      dispatch(logout());
    }
    return rejectWithValue(error.response?.data);
  }
});

export const deleteDocument = createAsyncThunk('documents/deleteDocument', async (id, { getState, dispatch, rejectWithValue }) => {
  try {
    const token = getState().auth.token;
    await axios.delete(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return id;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      dispatch(logout());
    }
    return rejectWithValue(error.response?.data);
  }
});

const documentSlice = createSlice({
  name: 'documents',
  initialState: {
    documents: [],
    openDocuments: [], // Array of document IDs up to 2
    status: 'idle',
    searchQuery: '',
  },
  reducers: {
    setOpenDocument: (state, action) => {
      state.openDocuments = [action.payload];
    },
    addOpenDocument: (state, action) => {
      const docId = action.payload;
      if (!state.openDocuments.includes(docId)) {
        if (state.openDocuments.length >= 2) {
          state.openDocuments.shift(); // Remove oldest if at max
        }
        state.openDocuments.push(docId);
      }
    },
    removeOpenDocument: (state, action) => {
      state.openDocuments = state.openDocuments.filter(id => id !== action.payload);
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.documents = action.payload;
        state.status = 'succeeded';
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload);
        state.openDocuments = [action.payload._id];
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex(doc => doc._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(doc => doc._id !== action.payload);
        state.openDocuments = state.openDocuments.filter(id => id !== action.payload);
      });
  },
});

export const { setOpenDocument, addOpenDocument, removeOpenDocument, setSearchQuery } = documentSlice.actions;
export default documentSlice.reducer;
