import React, { useState, useEffect } from 'react';

export default function LiveDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Tarikh: Contoh "Tue, 29 Sep 2026"
  const formattedDate = currentDateTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Format Jam: Contoh "11:25:40 AM"
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#f1f5f9',
        border: '1px solid #cbd5e1',
        padding: '6px 14px',
        borderRadius: '20px',
        color: '#0d3b66',
        fontSize: '13px',
        fontWeight: 'bold',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        whiteSpace: 'nowrap'
      }}
    >
      <span>🗓️ {formattedDate}</span>
      <span style={{ color: '#94a3b8' }}>|</span>
      <span style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '13px' }}>
        ⏰ {formattedTime}
      </span>
    </div>
  );
}