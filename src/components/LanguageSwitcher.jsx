import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Language Switcher Component
 * Allows users to switch between languages
 */
export default function LanguageSwitcher() {
  const { language, changeLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages[language];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: isOpen ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          fontFamily: 'Quicksand, sans-serif',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }}
      >
        <span>{currentLang?.flag || '🌐'}</span>
        <span>{currentLang?.name || 'Language'}</span>
        <span style={{ fontSize: '10px', marginLeft: '2px' }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: 'absolute',
            top: '44px',
            right: '0',
            minWidth: '180px',
            background: 'linear-gradient(135deg, #1a1a2e, #12122a)',
            border: '1px solid rgba(76,227,247,0.15)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}>
            {Object.values(languages).map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: language === lang.code ? 'rgba(76,227,247,0.1)' : 'transparent',
                  color: language === lang.code ? '#4ce3f7' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: language === lang.code ? '700' : '500',
                  fontFamily: 'Quicksand, sans-serif',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (language !== lang.code) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== lang.code) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                <span>{lang.name}</span>
                {language === lang.code && (
                  <span style={{ marginLeft: 'auto', color: '#4ce3f7', fontSize: '12px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}