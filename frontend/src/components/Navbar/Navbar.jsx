import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FullScreenLoader from '../UI/FullScreenLoader';
import './Navbar.css';

export default function Navbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await new Promise(r => setTimeout(r, 800));
    onLogout();
    setIsLoggingOut(false);
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const isActive = (path) => location.pathname === path;

  // Role-based link logic
  const showAdminLink = user?.role === 'super_admin' || user?.role === 'admin';
  const showSignatoryLink = user?.role === 'signatory';
  const showContractorLink = user?.role === 'contractor';

  return (
    <>
    <FullScreenLoader isVisible={isLoggingOut} text="Securing Session..." />
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <div className="navbar__brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="navbar__logo-mark">
            <span className="navbar__logo-icon">◈</span>
          </div>
          <div className="navbar__logo-text">
            <span className="navbar__title">SATYA</span>
            <span className="navbar__subtitle">Transparency Ledger</span>
          </div>
        </div>

        {/* Center: Nav Links */}
        <div className="navbar__center">
          <div className="navbar__nav-links">
            <button
              className={`navbar__nav-link ${isActive('/') ? 'navbar__nav-link--active' : ''}`}
              onClick={() => navigate('/')}
            >
              Ledger
            </button>
            <button
              className={`navbar__nav-link ${isActive('/tenders') ? 'navbar__nav-link--active' : ''}`}
              onClick={() => navigate('/tenders')}
            >
              Tenders
            </button>

            {/* Dynamic Context-Aware Dashboard Links */}
            {showAdminLink && (
              <button
                className={`navbar__nav-link navbar__nav-link--admin ${isActive('/admin') ? 'navbar__nav-link--active' : ''}`}
                onClick={() => navigate('/admin')}
              >
                <span className="navbar__nav-link-icon">🏛️</span>
                Governance
              </button>
            )}

            {showSignatoryLink && (
              <button
                className={`navbar__nav-link navbar__nav-link--admin ${isActive('/signatory-portal') ? 'navbar__nav-link--active' : ''}`}
                onClick={() => navigate('/signatory-portal')}
                style={{borderColor: 'var(--status-ongoing)', color: 'var(--status-ongoing)'}}
              >
                <span className="navbar__nav-link-icon">🖋️</span>
                Signing
              </button>
            )}

            {showContractorLink && (
              <button
                className={`navbar__nav-link navbar__nav-link--admin ${isActive('/contractor') ? 'navbar__nav-link--active' : ''}`}
                onClick={() => navigate('/contractor')}
                style={{borderColor: '#4ecdc4', color: '#4ecdc4'}}
              >
                <span className="navbar__nav-link-icon">🏗️</span>
                Dashboard
              </button>
            )}

            {user?.role === 'committee' && (
              <button
                className={`navbar__nav-link ${isActive('/oversight') ? 'navbar__nav-link--active' : ''}`}
                onClick={() => navigate('/oversight')}
              >
                Oversight
              </button>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="navbar__right">
          {user ? (
            <div className="navbar__user">
              <span className="navbar__user-name">{user.name || user.role}</span>
              <button className="navbar__logout-btn" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          ) : (
            <button
              className="navbar__login-btn"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          )}
          <div className="navbar__clock">
            <span className="navbar__clock-label">IST</span>
            <span className="navbar__clock-time">{formatTime(time)}</span>
          </div>
          <div className="navbar__status-dot" title="System Online" />
        </div>
      </div>
    </nav>
    </>
  );
}
