import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { logout } from './authSlice';

const API_URL = `${import.meta.env.VITE_API_URL}/documents`;

export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (groupId, { getState, dispatch, rejectWithValue }) => {
    try {
      if (!groupId) return [];
      const token = getState().auth.token;
      const response = await axios.get(`${API_URL}?groupId=${encodeURIComponent(groupId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch documents');
    }
  }
);

export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async ({ title, content, groupId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.post(
        API_URL, 
        { title, content, groupId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to create document');
    }
  }
);

export const importDocumentContent = createAsyncThunk(
  'documents/importDocumentContent',
  async (file, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/import`, 
        formData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data; // { html: '...' }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to import document');
    }
  }
);

export const uploadImageFile = createAsyncThunk(
  'documents/uploadImageFile',
  async (file, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        `${API_URL}/upload-image`, 
        formData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data; // { url: '...' }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload image');
    }
  }
);

export const updateDocument = createAsyncThunk(
  'documents/updateDocument',
  async ({ id, title, content }, { getState, dispatch, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.put(
        `${API_URL}/${id}`, 
        { title, content }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        dispatch(logout());
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to update document');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id, { getState, dispatch, rejectWithValue }) => {
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
      return rejectWithValue(error.response?.data?.message || 'Failed to delete document');
    }
  }
);

export const uploadAttachment = createAsyncThunk(
  'documents/uploadAttachment',
  async ({ id, file }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `${API_URL}/${id}/attachments`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload attachment');
    }
  }
);

export const deleteAttachment = createAsyncThunk(
  'documents/deleteAttachment',
  async ({ id, attachmentId }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const response = await axios.delete(
        `${API_URL}/${id}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete attachment');
    }
  }
);

const documentSlice = createSlice({
  name: 'documents',
  initialState: {
    documents: [],
    openDocuments: [], // Array of document IDs up to 2
    status: 'idle',
    searchQuery: '',
    globalReadMode: false,
    error: null,
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
    clearOpenDocuments: (state) => {
      state.openDocuments = [];
    },
    setGlobalReadMode: (state, action) => {
      state.globalReadMode = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.status = 'loading';
        state.documents = [];
        state.openDocuments = [];
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.documents = action.payload;
        state.status = 'succeeded';
        // Clean openDocuments that don't exist in the fetched list
        const validIds = action.payload.map(d => d._id);
        state.openDocuments = state.openDocuments.filter(id => validIds.includes(id));
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
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
      })
      .addCase(uploadAttachment.fulfilled, (state, action) => {
        const index = state.documents.findIndex(doc => doc._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(deleteAttachment.fulfilled, (state, action) => {
        const index = state.documents.findIndex(doc => doc._id === action.payload._id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      });
  },
});

export const { 
  setOpenDocument, 
  addOpenDocument, 
  removeOpenDocument, 
  clearOpenDocuments,
  setSearchQuery,
  setGlobalReadMode 
} = documentSlice.actions;

export default documentSlice.reducer;
