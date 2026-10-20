import { createSlice } from '@reduxjs/toolkit';

export const PALETTES = {
  royal: {
    id: 'royal',
    name: 'Royal Amethyst & Gold',
    badge: 'Super Admin Executive',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primaryLight: '#a78bfa',
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    borderGlow: 'rgba(124, 58, 237, 0.45)',
    cardBg: '#1e1b4b',
    bodyBg: '#090919'
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Cobalt & Cyan',
    badge: 'High-Tech Ops',
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primaryLight: '#60a5fa',
    accent: '#06b6d4',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
    borderGlow: 'rgba(37, 99, 235, 0.45)',
    cardBg: '#0f172a',
    bodyBg: '#020617'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Matrix & Mint',
    badge: 'Enterprise Classic',
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#34d399',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    borderGlow: 'rgba(5, 150, 105, 0.45)',
    cardBg: '#064e3b',
    bodyBg: '#022c22'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Command & Amber',
    badge: 'Executive Alert',
    primary: '#e11d48',
    primaryDark: '#be123c',
    primaryLight: '#fb7185',
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
    borderGlow: 'rgba(225, 29, 72, 0.45)',
    cardBg: '#4c0519',
    bodyBg: '#1c0309'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Midnight Obsidian & Platinum',
    badge: 'Stealth Command',
    primary: '#475569',
    primaryDark: '#334155',
    primaryLight: '#94a3b8',
    accent: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #334155 0%, #0f172a 100%)',
    borderGlow: 'rgba(148, 163, 184, 0.35)',
    cardBg: '#1e293b',
    bodyBg: '#020617'
  }
};

export const applyPaletteToDom = (paletteId, isSuperAdmin = false) => {
  const p = PALETTES[paletteId] || PALETTES.royal;
  const root = document.documentElement;

  root.style.setProperty('--theme-palette-primary', p.primary);
  root.style.setProperty('--theme-palette-dark', p.primaryDark);
  root.style.setProperty('--theme-palette-light', p.primaryLight);
  root.style.setProperty('--theme-palette-accent', p.accent);
  root.style.setProperty('--theme-palette-gradient', p.gradient);
  root.style.setProperty('--theme-palette-glow', p.borderGlow);
  root.style.setProperty('--color-theme-main', p.primary);
  root.style.setProperty('--color-theme-main-dark', p.primaryDark);

  if (isSuperAdmin) {
    root.classList.add('superadmin-theme');
    document.body.classList.add('superadmin-body');
  } else {
    root.classList.remove('superadmin-theme');
    document.body.classList.remove('superadmin-body');
  }

  root.setAttribute('data-palette', paletteId);
};

const savedPalette = localStorage.getItem('app_palette') || 'royal';

const initialState = {
  isDarkMode: localStorage.getItem('theme') === 'dark' || false,
  activePalette: savedPalette,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setPalette: (state, action) => {
      const newPalette = action.payload;
      if (PALETTES[newPalette]) {
        state.activePalette = newPalette;
        localStorage.setItem('app_palette', newPalette);
        applyPaletteToDom(newPalette, document.documentElement.classList.contains('superadmin-theme'));
      }
    },
    initTheme: (state, action) => {
      const isSuperAdmin = action.payload?.isSuperAdmin || false;
      if (state.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      applyPaletteToDom(state.activePalette, isSuperAdmin);
    }
  },
});

export const { toggleTheme, setPalette, initTheme } = themeSlice.actions;
export default themeSlice.reducer;


