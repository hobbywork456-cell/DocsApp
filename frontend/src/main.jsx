import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider, useSelector } from 'react-redux';
import { store } from './store';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// "Calm Kit" palette: sage primary, moss/mist tints, ivory surfaces, charcoal text.
// Dark mode keeps the same family: deep charcoal-sage surfaces, warm off-white text, a lighter sage accent.
// The soft card surfaces live in index.css
const buildTheme = (dark) => {
  const c = dark
    ? { ink: '#ece8e1', muted: '#b9b2a7', paper: '#232824', bg: '#181c19', track: '#3a413b', line: 'rgba(236, 232, 225, 0.12)', outlinedBg: '#2a302b' }
    : { ink: '#262b27', muted: '#6b6f69', paper: '#faf8f4', bg: '#f4efe8', track: '#d9d3ca', line: 'rgba(120, 108, 92, 0.14)', outlinedBg: '#faf8f4' };
  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: dark
        ? { main: '#8fa896', light: '#b3c6b6', dark: '#687f6e', contrastText: '#141815' }
        : { main: '#687f6e', light: '#a7b8a7', dark: '#566a5b', contrastText: '#ffffff' },
      secondary: { main: '#c9bdaf', contrastText: '#262b27' },
      success: dark ? { main: '#8fa896', contrastText: '#141815' } : { main: '#687f6e', contrastText: '#ffffff' },
      text: { primary: c.ink, secondary: c.muted },
      background: { default: c.bg, paper: c.paper },
      divider: c.line
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 }
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 14 },
          outlined: { backgroundColor: c.outlinedBg, borderColor: c.line, color: c.ink }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: { '&.Mui-checked': { color: '#ffffff' }, '&.Mui-checked + .MuiSwitch-track': { backgroundColor: dark ? '#8fa896' : '#687f6e', opacity: 1 } },
          thumb: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' },
          track: { backgroundColor: c.track, opacity: 1, borderRadius: 12 }
        }
      },
      MuiCheckbox: { styleOverrides: { root: { color: dark ? '#8a8378' : '#a59a8c', '&.Mui-checked': { color: dark ? '#8fa896' : '#687f6e' } } } },
      MuiLinearProgress: { styleOverrides: { root: { backgroundColor: c.track, borderRadius: 8 }, bar: { borderRadius: 8 } } },
      MuiTab: { styleOverrides: { root: { '&.Mui-selected': { color: c.ink } } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: dark ? '#8fa896' : '#687f6e', height: 3, borderRadius: 3 } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.75rem' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } }
    }
  });
};

function ThemedApp() {
  const isDarkMode = useSelector((state) => state.theme.isDarkMode);
  const theme = useMemo(() => buildTheme(isDarkMode), [isDarkMode]);
  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemedApp />
    </Provider>
  </React.StrictMode>,
)
