import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default dark
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  function toggleTheme() {
    setIsDark(prev => !prev);
  }

  const theme = {
    isDark,
    toggleTheme,
    colors: isDark ? DARK_THEME : LIGHT_THEME,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

// ── Theme Colors ────────────────────────────────────────────
const DARK_THEME = {
  bg: '#0a0a14',
  surface: '#0c0c16',
  card: 'linear-gradient(135deg, #1a1a2e, #12122a)',
  cardSolid: '#1a1a2e',
  border: 'rgba(255,255,255,0.06)',
  borderHi: 'rgba(76,227,247,0.3)',
  text: '#fff',
  textSec: 'rgba(255,255,255,0.5)',
  textMut: 'rgba(255,255,255,0.3)',
  cyan: '#4ce3f7',
  blue: '#0400ff',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f59e0b',
  purple: '#a855f7',
  gold: '#fbbf24',
  headerBg: 'rgba(10,10,20,0.8)',
  inputBg: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
  shadow: '0 20px 60px rgba(0,0,0,0.5)',
};

const LIGHT_THEME = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  card: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
  cardSolid: '#ffffff',
  border: 'rgba(0,0,0,0.08)',
  borderHi: 'rgba(4,0,255,0.3)',
  text: '#1a1a2e',
  textSec: 'rgba(0,0,0,0.55)',
  textMut: 'rgba(0,0,0,0.3)',
  cyan: '#0891b2',
  blue: '#0400ff',
  green: '#16a34a',
  red: '#dc2626',
  orange: '#d97706',
  purple: '#7c3aed',
  gold: '#f59e0b',
  headerBg: 'rgba(255,255,255,0.9)',
  inputBg: 'rgba(0,0,0,0.03)',
  inputBorder: 'rgba(0,0,0,0.12)',
  shadow: '0 4px 20px rgba(0,0,0,0.08)',
};