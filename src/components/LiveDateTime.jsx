import React, { useState, useEffect } from 'react';

export default function LiveDateTime() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format 12-Jam bersama AM / PM
  const rawHours = currentDateTime.getHours();
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours12 = rawHours % 12 || 12; // Menukarkan 0 ke 12 untuk tengah malam
  const hours = String(hours12).padStart(2, '0');
  const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');
  const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

  // Format Tarikh: DD/MM/YYYY
  const day = String(currentDateTime.getDate()).padStart(2, '0');
  const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
  const year = currentDateTime.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  return (
    <div
      style={{
        backgroundColor: '#0d3b66',
        color: '#ffffff',
        padding: '6px 14px',
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
      {/* Baris Atas: Jam 12-Jam & AM/PM */}
      <span
        style={{
          fontSize: '16px',
          fontWeight: '800',
          letterSpacing: '0.8px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px'
        }}
      >
        <span>{`${hours}:${minutes}:${seconds}`}</span>
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#93c5fd' }}>
          {ampm}
        </span>
      </span>

      {/* Baris Bawah: Tarikh DD/MM/YYYY */}
      <span
        style={{
          fontSize: '11px',
          fontWeight: '500',
          color: '#cbd5e1',
          letterSpacing: '0.5px',
          marginTop: '3px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {formattedDate}
      </span>
    </div>
  );
}