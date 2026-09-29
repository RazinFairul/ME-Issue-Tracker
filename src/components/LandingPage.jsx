import React, { useState, useEffect } from 'react';
import LiveDateTime from './LiveDateTime';
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
        position: 'relative'
      }}
    >
      {/* Top Bar DateTime Header */}
      <div 
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <LiveDateTime />
      </div>

      {/* Floating Login Button */}
      <button 
        className="animated-login-btn" 
        onClick={onGoToLogin}
        title="Click to Log In"
        aria-label="Log In"
      >
        LOGIN
      </button>
    </div>
  );
}