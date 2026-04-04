import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FullScreenLoader from '../UI/FullScreenLoader';
import './Navbar.css';

const AADHAAR_PEOPLE = [
  { name: "Aanya Sharma", dob: "12/08/1990", address: "New Delhi, DL", fullAadhaar: "9342 5678 7836", maskedAadhaar: "•••• 7836" },
  { name: "Rahul Verma", dob: "05/03/1985", address: "Mumbai, MH", fullAadhaar: "4521 8934 1256", maskedAadhaar: "•••• 1256" },
  { name: "Priya Patel", dob: "22/11/1992", address: "Ahmedabad, GJ", fullAadhaar: "7845 1290 3476", maskedAadhaar: "•••• 3476" },
  { name: "Amit Singh", dob: "15/06/1988", address: "Lucknow, UP", fullAadhaar: "3214 6789 5432", maskedAadhaar: "•••• 5432" },
  { name: "Sneha Reddy", dob: "09/09/1995", address: "Hyderabad, TS", fullAadhaar: "6543 2189 0987", maskedAadhaar: "•••• 0987" },
  { name: "Vikram Malhotra", dob: "30/01/1982", address: "Chandigarh, CH", fullAadhaar: "9876 5432 1098", maskedAadhaar: "•••• 1098" },
  { name: "Neha Gupta", dob: "18/04/1991", address: "Pune, MH", fullAadhaar: "1234 5678 9012", maskedAadhaar: "•••• 9012" },
  { name: "Rohan Das", dob: "25/12/1989", address: "Kolkata, WB", fullAadhaar: "5678 9012 3456", maskedAadhaar: "•••• 3456" },
  { name: "Kavita Rathi", dob: "07/07/1994", address: "Jaipur, RJ", fullAadhaar: "3456 7890 1234", maskedAadhaar: "•••• 1234" },
  { name: "Suresh Pillai", dob: "14/02/1986", address: "Chennai, TN", fullAadhaar: "9012 3456 7890", maskedAadhaar: "•••• 7890" }
];

// --- Profile Widget (Moved outside to prevent remounting on Navbar re-renders) ---
const AadhaarProfile = ({ user }) => {
  const selectedPerson = useMemo(() => {
    if (!user) return AADHAAR_PEOPLE[0];
    const userString = JSON.stringify(user);
    let hash = 0;
    for (let i = 0; i < userString.length; i++) {
        hash = userString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AADHAAR_PEOPLE[Math.abs(hash) % AADHAAR_PEOPLE.length];
  }, [user]);

  const fullAadhaar = selectedPerson.fullAadhaar;
  const maskedAadhaar = selectedPerson.maskedAadhaar;
  const roleName = user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Citizen';
  const details = selectedPerson;

  return (
    <div className="aadhaar-profile">
      <div className="aadhaar-profile__trigger">
        <img 
          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${details.name}&backgroundColor=ffe4e6`} 
          alt="Profile Avatar" 
          className="aadhaar-profile__avatar" 
        />
        <div className="aadhaar-profile__text">
          <span className="aadhaar-profile__role">{roleName}</span>
          <div className="aadhaar-profile__number-clipper">
             <span className="aadhaar-profile__text-masked">{maskedAadhaar}</span>
             <span className="aadhaar-profile__text-full">{fullAadhaar}</span>
          </div>
        </div>
      </div>
      <div className="aadhaar-profile__dropdown-wrapper">
        <div className="aadhaar-profile__dropdown">
          <div className="aadhaar-profile__dropdown-header">
             <h4>UIDAI Portal</h4>
             <span className="aadhaar-profile__verified-badge">✓ Verified</span>
          </div>
          <div className="aadhaar-profile__dropdown-body">
             <div className="aadhaar-profile__field">
               <span className="aadhaar-profile__label">Full Name</span>
               <span className="aadhaar-profile__value">{details.name}</span>
             </div>
             <div className="aadhaar-profile__field">
               <span className="aadhaar-profile__label">Date of Birth</span>
               <span className="aadhaar-profile__value">{details.dob}</span>
             </div>
             <div className="aadhaar-profile__field">
               <span className="aadhaar-profile__label">Registered Address</span>
               <span className="aadhaar-profile__value">{details.address}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Navbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();


  const handleLogoutClick = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    // Simulate security cleanup
    await new Promise(r => setTimeout(r, 1200));
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
              <AadhaarProfile user={user} />
              <div className="navbar__logout-group">
                {showLogoutConfirm ? (
                  <div className="navbar__logout-confirm-pop">
                    <span>End Session?</span>
                    <button className="navbar__confirm-btn" onClick={handleLogoutClick}>Yes</button>
                    <button className="navbar__cancel-btn" onClick={() => setShowLogoutConfirm(false)}>No</button>
                  </div>
                ) : (
                  <button className="navbar__logout-btn" onClick={() => setShowLogoutConfirm(true)}>
                    Logout
                  </button>
                )}
              </div>
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
