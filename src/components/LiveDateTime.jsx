import React, { useState, useEffect } from 'react';

export default function LiveDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Jam: 11:59:37 (24-hour atau format digital tebal)
  const hours = String(currentDateTime.getHours()).padStart(2, '0');
  const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // Format Tarikh: 29/09/2026
  const day = String(currentDateTime.getDate()).padStart(2, '0');
  const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
  const year = currentDateTime.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  return (
    <div
      style={{
        backgroundColor: '#0d3b66',
        color: '#ffffff',
        padding: '5px 16px',
        borderRadius: '8px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        lineHeight: 1.15,
        userSelect: 'none'
      }}
    >
      {/* Baris Atas: Masa Besar & Tebal */}
      <span
        style={{
          fontSize: '18px',
          fontWeight: '800',
          letterSpacing: '1px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {formattedTime}
      </span>

      {/* Baris Bawah: Tarikh DD/MM/YYYY */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#cbd5e1',
          letterSpacing: '0.5px',
          marginTop: '2px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {formattedDate}
      </span>
    </div>
  );
}