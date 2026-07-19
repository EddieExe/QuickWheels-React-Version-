import { useTheme } from '../context/ThemeContext';

/**
 * Theme Toggle Button
 * Switches between dark and light mode
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}