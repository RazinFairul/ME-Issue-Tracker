import React, { useState, useEffect, useRef } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'tl', name: 'Filipino / Tagalog', native: 'Filipino' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'my', name: 'Burmese', native: 'မြန်မာ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' }
];

// Dapatkan bahasa semasa daripada kuki googtrans jika wujud
const getInitialLanguage = () => {
  const match = document.cookie.match(/(^|;\s*)googtrans=([^;]+)/);
  if (match && match[2]) {
    const parts = decodeURIComponent(match[2]).split('/');
    const currentCode = parts[parts.length - 1];
    if (currentCode) return currentCode;
  }
  return 'en';
};

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState(getInitialLanguage());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (langCode) => {
    setSelectedLang(langCode);
    setIsOpen(false);
    setSearch('');

    // 1. Simpan kuki rasmi Google Translate (Domain semasa + Host)
    const hostname = window.location.hostname;
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    if (hostname !== 'localhost') {
      document.cookie = `googtrans=/en/${langCode}; domain=.${hostname}; path=/;`;
    }

    // 2. Trigger select dropdown Google jika sedia ada
    const selectEl = document.querySelector('.goog-te-combo');
    if (selectEl) {
      selectEl.value = langCode;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Muat semula pantas untuk memastikan keseluruhan skrin diterjemahkan pada klik pertama
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const filteredLanguages = LANGUAGES.filter((item) => {
    const query = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.native.toLowerCase().includes(query) ||
      item.code.toLowerCase().includes(query)
    );
  });

  const currentLangObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0];

  return (
    <div
      ref={dropdownRef}
      className="notranslate"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 999999,
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            right: '0',
            width: '280px',
            maxHeight: '360px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0d3b66' }}>
                🌐 Select Language
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            
            <input
              type="text"
              autoFocus
              placeholder="🔍 Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #94a3b8',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
            {filteredLanguages.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                No language found.
              </div>
            ) : (
              filteredLanguages.map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: selectedLang === lang.code ? '#e0f2fe' : 'transparent',
                    color: selectedLang === lang.code ? '#0284c7' : '#1e293b',
                    fontWeight: selectedLang === lang.code ? 'bold' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedLang !== lang.code) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLang !== lang.code) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{lang.name}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{lang.native}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0d3b66',
          color: '#ffffff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '30px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '13px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
        }}
      >
        <span style={{ fontSize: '16px' }}>🌐</span>
        <span>{currentLangObj.name}</span>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>▲</span>
      </button>
    </div>
  );
}