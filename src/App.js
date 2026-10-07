import React, { useEffect, useState, useCallback, memo } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import CreateIssue from './components/CreateIssue';
import IssueList from './components/IssueList';
import TagMapUpdates from './components/TagMap';
import DashboardAnalytics from './components/DashboardAnalytics';
import EditProfileModal from './components/EditProfileModal';
import LanguageSelector from './components/LanguageSelector';

const TIMEOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout (300,000 ms)

// Clean Vector Mini Analog Clock Component (Refined Thinner Border & Larger Dial)
const MiniAnalogClock = ({ time = new Date() }) => {
  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secAngle = seconds * 6; // 360deg / 60s
  const minAngle = minutes * 6 + seconds * 0.1; // 360deg / 60m
  const hourAngle = hours * 30 + minutes * 0.5; // 360deg / 12h

  return (
    <svg width="44" height="44" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      {/* Outer Dial Face with Thinner Border */}
      <circle cx="50" cy="50" r="47" fill="#092540" stroke="#38bdf8" strokeWidth="1.5" />

      {/* Hour Markers (12, 3, 6, 9) */}
      <line x1="50" y1="8" x2="50" y2="15" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="50" x2="85" y2="50" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="92" x2="50" y2="85" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="50" x2="15" y2="50" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

      {/* Hour Hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="26"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 50 50)`}
      />

      {/* Minute Hand */}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="16"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${minAngle} 50 50)`}
      />

      {/* Second Hand (Red Accent) */}
      <line
        x1="50"
        y1="58"
        x2="50"
        y2="12"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${secAngle} 50 50)`}
      />

      {/* Center Pivot Pin */}
      <circle cx="50" cy="50" r="3" fill="#ffffff" />
    </svg>
  );
};

// Self-contained Clock Badge (Isolates the 1-second interval so App does not re-render)
const HeaderClockBadge = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Exact 12-Hour Format Calculation
  const rawHours = time.getHours() % 12 || 12;
  const hours12 = String(rawHours).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {/* 1. Standalone Circular Analog Clock Badge (Larger Face, Thinner Border) */}
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#0d3b66',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(13, 59, 102, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          flexShrink: 0
        }}
      >
        <MiniAnalogClock time={time} />
      </div>

      {/* 2. Standalone Rectangular Digital Time & Date Badge (12-Hour Format) */}
      <div
        style={{
          backgroundColor: '#0d3b66',
          borderRadius: '12px',
          padding: '7px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(13, 59, 102, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          lineHeight: 1.15
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.6px' }}>
          {`${hours12}:${minutes}:${seconds}`}{' '}
          <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>
            {ampm}
          </span>
        </div>
        <div style={{ fontSize: '10.5px', color: '#cbd5e1', fontWeight: 'bold', marginTop: '3px', letterSpacing: '0.5px' }}>
          {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  // Dynamic Orientation Detection: Portrait vs Landscape
  const checkIsPortrait = () => {
    return window.innerHeight > window.innerWidth || window.innerWidth <= 768;
  };

  const [isPortrait, setIsPortrait] = useState(checkIsPortrait());

  useEffect(() => {
    const handleOrientationOrResize = () => {
      setIsPortrait(checkIsPortrait());
    };

    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);

    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, []);

  // Capture issueId parameter upon initial mount and persist safely
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const targetIssueId = searchParams.get('issueId');
    if (targetIssueId) {
      localStorage.setItem('open_issue_id', targetIssueId);
    }
  }, []);

  // Detect password recovery mode from email reset links
  const [isRecoveryMode, setIsRecoveryMode] = useState(
    window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery')
  );

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('me_last_active_time');
    localStorage.removeItem('open_issue_id');
    await supabase.auth.signOut();
    window.location.hash = '';
    setActiveTab('home');
    setShowAuthModal(false);
    setIsRecoveryMode(false);
    setUserProfile(null);
    setSession(null);
  }, []);

  // Strict 5-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!session) return;

    let timeoutId;

    const triggerTimeout = () => {
      handleLogout();
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      localStorage.setItem('me_last_active_time', String(Date.now()));
      timeoutId = setTimeout(triggerTimeout, TIMEOUT_DURATION_MS);
    };

    const lastActive = localStorage.getItem('me_last_active_time');
    if (lastActive && Date.now() - parseInt(lastActive, 10) > TIMEOUT_DURATION_MS) {
      triggerTimeout();
      return;
    }

    resetTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, handleLogout]);

  // URL Hash Navigation & Deep Link Handler
  useEffect(() => {
    const handleHashChange = () => {
      if (isRecoveryMode) return;

      const searchParams = new URLSearchParams(window.location.search);
      const urlIssueId = searchParams.get('issueId');
      if (urlIssueId) {
        localStorage.setItem('open_issue_id', urlIssueId);
      }

      const pendingIssueId = urlIssueId || localStorage.getItem('open_issue_id');
      const currentHash = window.location.hash.replace('#/', '').replace('#', '');

      if (!session) {
        if (pendingIssueId || currentHash === 'login') {
          setShowAuthModal(true);
        } else {
          setShowAuthModal(false);
        }
        return;
      }

      if (pendingIssueId) {
        window.history.replaceState(null, '', `/?issueId=${pendingIssueId}#/list`);
        setActiveTab('list');
        return;
      }

      if (!currentHash || currentHash === '' || currentHash === 'login') {
        window.history.replaceState(null, '', '#/home');
        setActiveTab('home');
      } else {
        const validTabs = ['home', 'create', 'list', 'analytics', 'tagmap'];
        if (validTabs.includes(currentHash)) {
          setActiveTab(currentHash);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [session, isRecoveryMode]);

  const navigateTo = (tabName) => {
    window.location.hash = `#/${tabName}`;
    setActiveTab(tabName);
  };

  const handleBackNavigation = () => {
    navigateTo('home');
  };

  const openLogin = () => {
    window.location.hash = '#/login';
    setShowAuthModal(true);
  };

  const closeLogin = () => {
    window.location.hash = '';
    setShowAuthModal(false);
  };

  const fetchProfile = async (currentUser) => {
    if (!currentUser) return;
    try {
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const metadataStaffId = currentUser.user_metadata?.staff_id;
      if (!data && metadataStaffId) {
        const { data: byStaffId } = await supabase
          .from('profiles')
          .select('*')
          .eq('staff_id', metadataStaffId)
          .maybeSingle();
        data = byStaffId;
      }

      if (!data && currentUser.email) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', currentUser.email)
          .maybeSingle();
        data = byEmail;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Fetch profile exception:', err);
    }
  };

  // Supabase Auth Initialization & Realtime Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
        setLoading(false);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const urlIssueId = searchParams.get('issueId');
      if (urlIssueId) {
        localStorage.setItem('open_issue_id', urlIssueId);
      }

      const targetIssueId = urlIssueId || localStorage.getItem('open_issue_id');

      if (session) {
        const lastActive = localStorage.getItem('me_last_active_time');
        if (lastActive && Date.now() - parseInt(lastActive, 10) > TIMEOUT_DURATION_MS) {
          handleLogout();
          setLoading(false);
          return;
        }

        setSession(session);
        fetchProfile(session.user);

        if (targetIssueId) {
          window.history.replaceState(null, '', `/?issueId=${targetIssueId}#/list`);
          setActiveTab('list');
        } else {
          const currentHash = window.location.hash.replace('#/', '').replace('#', '');
          if (!currentHash || currentHash === 'login') {
            window.history.replaceState(null, '', '#/home');
            setActiveTab('home');
          }
        }
      } else {
        if (targetIssueId) {
          setShowAuthModal(true);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        return;
      }

      if (event === 'SIGNED_IN' || (session && !isRecoveryMode)) {
        localStorage.setItem('me_last_active_time', String(Date.now()));
        setSession(session);
        fetchProfile(session.user);
        setShowAuthModal(false);

        const searchParams = new URLSearchParams(window.location.search);
        const urlIssueId = searchParams.get('issueId');
        if (urlIssueId) {
          localStorage.setItem('open_issue_id', urlIssueId);
        }

        const targetIssueId = urlIssueId || localStorage.getItem('open_issue_id');

        if (targetIssueId) {
          window.history.replaceState(null, '', `/?issueId=${targetIssueId}#/list`);
          setActiveTab('list');
        } else {
          const currentHash = window.location.hash.replace('#/', '').replace('#', '');
          if (!currentHash || currentHash === 'login') {
            window.history.replaceState(null, '', '#/home');
            setActiveTab('home');
          }
        }
      } else if (!session) {
        setUserProfile(null);
        setSession(null);
        window.location.hash = '';
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isRecoveryMode, handleLogout]);

  const handleIssueCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
    navigateTo('list');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9' }}>
        <p style={{ fontWeight: 'bold', color: '#0d3b66' }}>Loading session...</p>
      </div>
    );
  }

  // 1. PASSWORD RECOVERY MODE
  if (isRecoveryMode) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', padding: '40px 20px' }}>
        <Auth 
          forceRecoveryMode={true} 
          onPasswordResetComplete={() => {
            setIsRecoveryMode(false);
            handleLogout();
          }} 
        />
        <LanguageSelector />
      </div>
    );
  }

  // 2. UNAUTHENTICATED STATE
  if (!session) {
    if (showAuthModal) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f4f6f9', padding: '20px' }}>
          <button
            onClick={closeLogin}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              border: '1px solid #0d3b66',
              background: '#fff',
              color: '#0d3b66',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}
          >
            ⬅️ Back to Homepage
          </button>
          <Auth onLoginSuccess={() => {
            localStorage.setItem('me_last_active_time', String(Date.now()));
            setShowAuthModal(false);
            const pendingIssueId = localStorage.getItem('open_issue_id');
            if (pendingIssueId) {
              window.history.replaceState(null, '', `/?issueId=${pendingIssueId}#/list`);
              setActiveTab('list');
            }
          }} />
          <LanguageSelector />
        </div>
      );
    }
    return (
      <>
        <LandingPage onGoToLogin={openLogin} />
        <LanguageSelector />
      </>
    );
  }

  // 3. AUTHENTICATED DASHBOARD
  const displayName = 
    userProfile?.full_name || 
    session.user?.user_metadata?.full_name || 
    session.user?.user_metadata?.name || 
    'USER';

  const staffIdDisplay = 
    userProfile?.staff_id || 
    session.user?.user_metadata?.staff_id || 
    'STAFF';

  const currentAvatarUrl = 
    userProfile?.avatar_url || 
    session.user?.user_metadata?.avatar_url;

  return (
    <div className={`dashboard-container ${isPortrait ? 'is-portrait' : 'is-landscape'}`}>
      {/* Top Navigation Bar with Separated Analog Circle & Digital Date-Time Box */}
      <div 
        className="top-nav" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '10px' 
        }}
      >
        <div>
          <button className="exit-btn" onClick={handleLogout}>
            <span style={{ fontSize: '18px' }}>🚪</span> Logout
          </button>
        </div>

        {/* Isolated Clock Badge (App will NOT re-render on each tick) */}
        <HeaderClockBadge />

        <div>
          {activeTab === 'home' ? (
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0d3b66',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              <span>✏️</span> Edit Profile
            </button>
          ) : (
            <button 
              className="back-btn" 
              onClick={handleBackNavigation}
            >
              ⬅️ Back to Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === 'home' && (
        <div className={`dashboard-grid ${isPortrait ? 'portrait-layout' : 'landscape-layout'}`}>
          <div className="hero-card">
            <div className="hero-title">
              {/* Proton Logo Positioned Above Manufacturing Engineering */}
              <div style={{ marginBottom: '12px' }}>
                <img 
                  src={`${process.env.PUBLIC_URL}/proton-logo.png`} 
                  alt="Proton Logo" 
                  style={{ height: '55px', width: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} 
                />
              </div>
              <h1>Manufacturing Engineering</h1>
              <h2>SMART</h2>
              <h2 style={{ whiteSpace: 'nowrap' }}>TRACKING DATA</h2>
              <h3>R.A.Z.I.N</h3>
            </div>

            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div 
                className="avatar" 
                style={{ 
                  width: '65px', 
                  height: '80px', 
                  borderRadius: '6px', 
                  overflow: 'hidden', 
                  backgroundColor: '#e2e8f0', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: '2px solid rgba(255,255,255,0.6)', 
                  flexShrink: 0 
                }}
              >
                {currentAvatarUrl ? (
                  <img 
                    src={currentAvatarUrl} 
                    alt="Staff Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '32px' }}>👤</span>
                )}
              </div>

              <div className="welcome-text">
                <div className="welcome-title">Welcome,</div>
                <div className="user-name notranslate" translate="no">{displayName}</div>
                <div className="staff-id-text notranslate" translate="no">({staffIdDisplay})</div>
              </div>
            </div>
          </div>

          <div className="menu-card card-list" onClick={() => navigateTo('list')}>
            <div className="card-overlay">
              <h3>List of Issues</h3>
            </div>
          </div>

          <div className="menu-card card-create" onClick={() => navigateTo('create')}>
            <div className="card-overlay">
              <h3>Add New Issue</h3>
            </div>
          </div>

          <div className="menu-card card-dashboard" onClick={() => navigateTo('analytics')}>
            <div className="card-overlay">
              <h3>Dashboard Analytics</h3>
            </div>
          </div>

          <div className="menu-card card-escalate" onClick={() => navigateTo('tagmap')}>
            <div className="card-overlay">
              <h3>TagMap Updates</h3>
            </div>
          </div>
        </div>
      )}

      {/* View: Create Issue Form */}
      {activeTab === 'create' && (
        <div>
          <CreateIssue 
            userProfile={{ id: session.user.id, department: userProfile?.department || 'ME', staff_id: staffIdDisplay }} 
            onBackToDashboard={handleBackNavigation}
            onIssueCreated={handleIssueCreated} 
          />
        </div>
      )}

      {/* View: Issue List Table */}
      {activeTab === 'list' && (
        <div>
          <IssueList 
            onBackToDashboard={handleBackNavigation}
            userProfile={{ id: session.user.id }} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {/* View: Dashboard Analytics */}
      {activeTab === 'analytics' && (
        <div>
          <DashboardAnalytics onBack={handleBackNavigation} />
        </div>
      )}

      {/* View: TagMap Updates Table */}
      {activeTab === 'tagmap' && (
        <div>
          <TagMapUpdates onBack={handleBackNavigation} />
        </div>
      )}

      {/* Modal Edit Profile */}
      {showProfileModal && (
        <EditProfileModal
          user={session.user}
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(updated) => {
            setUserProfile(updated);
            if (session?.user?.user_metadata) {
              session.user.user_metadata.avatar_url = updated.avatar_url;
              session.user.user_metadata.full_name = updated.full_name;
              session.user.user_metadata.staff_id = updated.staff_id;
            }
          }}
        />
      )}

      {/* Footer (Stacked Layout) */}
      <div 
        className="footer" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginTop: '20px', 
          fontSize: '12px', 
          color: '#64748b' 
        }}
      >
        <div style={{ marginBottom: '4px', fontWeight: '500', letterSpacing: '0.5px' }}>
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>R</strong>eal-Cause ·{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>A</strong>nalysis & ·{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>Z</strong>ero ·{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>I</strong>ssue Resolution ·{' '}
          <strong style={{ fontWeight: '800', color: '#0d3b66' }}>N</strong>etwork
        </div>
        <div>
          <span>©</span> Developed by Razi ME
        </div>
      </div>

      {/* Floating Bottom-Right Searchable Language Selector */}
      <LanguageSelector />
    </div>
  );
}