import './FullScreenLoader.css';

export default function FullScreenLoader({ isVisible, text = 'Loading...' }) {
  if (!isVisible) return null;

  const isWalletAuth = text.toLowerCase().includes('authenticating wallet');
  const isLogout = text.toLowerCase().includes('securing session');

  return (
    <div className="fs-loader-overlay">
      <div className="fs-loader-card">
        {isWalletAuth ? (
          <div className="fs-loader-wallet-anim">
            <div className="fs-wallet-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12H7C7.55228 12 8 11.5523 8 11V8C8 7.44772 7.55228 7 7 7H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="13" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="fs-coin fs-coin-1">₿</div>
            <div className="fs-coin fs-coin-2">₿</div>
            <div className="fs-coin fs-coin-3">₿</div>
          </div>
        ) : isLogout ? (
          <div className="fs-loader-security-anim">
            <div className="fs-shield-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="fs-pulse-ring fs-pulse-1"></div>
            <div className="fs-pulse-ring fs-pulse-2"></div>
          </div>
        ) : (
          <div className="fs-loader-spinner"></div>
        )}
        <div className="fs-loader-text">{text}</div>
      </div>
    </div>
  );
}
