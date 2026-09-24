import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import documentReducer from './slices/documentSlice';
import groupReducer from './slices/groupSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentReducer,
    groups: groupReducer,
    theme: themeReducer,
  },
});
