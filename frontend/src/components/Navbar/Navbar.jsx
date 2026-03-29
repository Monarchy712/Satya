import { useState, useEffect } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState(new Date());

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

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        {/* Logo */}
        <div className="navbar__brand">
          <div className="navbar__logo-mark">
            <span className="navbar__logo-icon">◈</span>
          </div>
          <div className="navbar__logo-text">
            <span className="navbar__title">SATYA</span>
            <span className="navbar__subtitle">Transparency Ledger</span>
          </div>
        </div>

        {/* Center: Just show Ledger */}
        <div className="navbar__center">
          <span className="navbar__ledger-label">LEDGER PORTAL</span>
        </div>

        {/* Right side */}
        <div className="navbar__right">
          <div className="navbar__clock">
            <span className="navbar__clock-label">IST</span>
            <span className="navbar__clock-time">{formatTime(time)}</span>
          </div>
          <div className="navbar__status-dot" title="System Online" />
        </div>
      </div>
    </nav>
  );
}
