import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Pastel mint & white with ink-black text; the glass surfaces live in index.css
const muiTheme = createTheme({
  palette: {
    primary: { main: '#5cc28f', light: '#a8e6c3', dark: '#1f8a5b', contrastText: '#0b1410' },
    secondary: { main: '#1f8a5b', contrastText: '#ffffff' },
    success: { main: '#1f8a5b' },
    text: { primary: '#0b1410', secondary: '#4b5650' },
    background: { default: '#f6fbf8', paper: '#ffffff' },
    divider: 'rgba(11, 20, 16, 0.08)'
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 }
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiTab: { styleOverrides: { root: { '&.Mui-selected': { color: '#0b1410' } } } },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: '#5cc28f', height: 3, borderRadius: 3 } } }
  }
});

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)
