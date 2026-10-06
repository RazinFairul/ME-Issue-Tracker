import React, { useState, useEffect } from 'react';
import './LandingPage.css';

export default function LandingPage({ onGoToLogin }) {
  // Determine whether to display the portrait/mobile layout (Mobile & Tablet/iPad Portrait)
  const checkIsPortraitOrMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;

    // Use mobile layout if width <= 1024px in portrait orientation, or standard phone width (<= 768px)
    return (isPortrait && width <= 1024) || width <= 768;
  };

  const [isMobile, setIsMobile] = useState(checkIsPortraitOrMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsPortraitOrMobile());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const bgImage = isMobile
    ? `${process.env.PUBLIC_URL}/HomepageMobile.png`
    : `${process.env.PUBLIC_URL}/Homepage.png`;

  return (
    <div 
      className="embed-landing-container"
      style={{
        backgroundImage: `url(${bgImage})`,
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between'
      }}
    >
      {/* Floating Login Button */}
      <div style={{ flex: 1, position: 'relative' }}>
        <button 
          className="animated-login-btn" 
          onClick={onGoToLogin}
          title="Click to Log In"
          aria-label="Log In"
        >
          LOGIN
        </button>
      </div>

      {/* Footer Text Overlay */}
      <footer style={{ textAlign: 'center', padding: '15px 10px', fontSize: '12px', color: '#64748b', zIndex: 10 }}>
        <div style={{ marginBottom: '4px', fontWeight: '500', letterSpacing: '0.5px' }}>
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>R</strong>eal Cause .{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>A</strong>nalysis & .{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>Z</strong>ero .{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>I</strong>ssue Resolution .{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>N</strong>etwork
        </div>
        <div>
          © Developed by Razin ME
        </div>
      </footer>
    </div>
  );
}