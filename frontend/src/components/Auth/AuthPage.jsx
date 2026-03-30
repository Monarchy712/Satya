import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sendAadhaarOTP, verifyAadhaarOTP, walletConnect, walletVerify } from '../../utils/api';
import { isMetaMaskInstalled, connectMetaMask, signMessage } from '../../utils/metamask';
import FullScreenLoader from '../UI/FullScreenLoader';
import './AuthPage.css';

const STEPS = { AADHAAR: 'aadhaar', OTP: 'otp', WALLET: 'wallet', WALLET_SIGNING: 'wallet_signing' };

export default function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── State ──
  const [step, setStep] = useState(STEPS.AADHAAR);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletMode, setWalletMode] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletRole, setWalletRole] = useState('');
  const [walletMessage, setWalletMessage] = useState('');
  
  const [pageLoadingVisible, setPageLoadingVisible] = useState(false);
  const [pageLoadingText, setPageLoadingText] = useState('Loading...');

  // ── Aadhaar format helper ──
  const formatAadhaar = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const cleaned = aadhaar.replace(/\s/g, '');
    if (cleaned.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setError('');
    
    setPageLoadingText('Sending OTP...');
    setPageLoadingVisible(true);
    
    await new Promise(r => setTimeout(r, 800));

    try {
      await sendAadhaarOTP(cleaned);
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message);
    } finally {
      setPageLoadingVisible(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError('OTP must be 4 digits');
      return;
    }
    setError('');
    
    setPageLoadingText('Verifying Identity...');
    setPageLoadingVisible(true);
    
    await new Promise(r => setTimeout(r, 800));

    try {
      const cleaned = aadhaar.replace(/\s/g, '');
      const res = await verifyAadhaarOTP(cleaned, otp);
      login(res.access_token, { role: res.role, name: res.name });
      navigate('/');
    } catch (err) {
      setError(err.message);
      setPageLoadingVisible(false);
    }
  };

  const handleWalletConnect = async (mode) => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install the MetaMask browser extension.');
      return;
    }
    setError('');
    setWalletMode(mode);
    setLoading(true);
    try {
      const address = await connectMetaMask();
      setWalletAddress(address);
      const res = await walletConnect(address);
      setWalletRole(res.role);
      setWalletMessage(res.message);
      setStep(STEPS.WALLET_SIGNING);
    } catch (err) {
      setError(err.message);
      setStep(STEPS.AADHAAR);
    } finally {
      setLoading(false);
    }
  };

  // ── MetaMask Sign & Verify ──
  const handleWalletSign = async () => {
    setError('');
    
    setPageLoadingText('Authenticating Wallet...');
    setPageLoadingVisible(true);
    
    await new Promise(r => setTimeout(r, 800));

    try {
      const signature = await signMessage(walletMessage);
      const res = await walletVerify(walletAddress, signature);
      login(res.access_token, {
        role: res.role,
        name: res.name,
        access_level: res.access_level,
        wallet: walletAddress,
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
      setPageLoadingVisible(false);
    }
  };

  // ── Back to Aadhaar ──
  const handleBack = () => {
    setStep(STEPS.AADHAAR);
    setError('');
    setWalletAddress('');
    setWalletMode(null);
    setOtp('');
  };

  return (
    <>
    <FullScreenLoader isVisible={pageLoadingVisible} text={pageLoadingText} />
    <div className="auth-page">
      <button className="auth-back-home" onClick={() => navigate('/')}>
        ← Back to Home
      </button>
      <div className="auth-container">
        {/* Header / Graphic Left Side */}
        <div className="auth-header">
          <div className="auth-header__graphic">
            {/* Animated Geometry */}
            <svg className="auth-header__svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              {/* Outer dashed spinning ring */}
              <circle className="auth-ring auth-ring--outer" cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="10 10" />
              {/* Middle solid ring spinning opposite */}
              <circle className="auth-ring auth-ring--middle" cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="30 15" />
              {/* Inner sunburst */}
              <path className="auth-ring auth-ring--inner" fill="none" stroke="currentColor" strokeWidth="3" d="M100 20 L100 40 M100 160 L100 180 M20 100 L40 100 M160 100 L180 100 M43 43 L57 57 M143 143 L157 157 M157 43 L143 57 M43 157 L57 143" />
            </svg>
            <h1 className="auth-header__title">सत्य</h1>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* ── Aadhaar Step ── */}
          {step === STEPS.AADHAAR && (
            <div className="auth-step auth-step--fade-in">
              <h2 className="auth-step__title">Sign in with Aadhaar</h2>
              <p className="auth-step__desc">
                Enter your 12-digit Aadhaar number to receive a one-time password
              </p>

              <div className="auth-input-group">
                <label className="auth-label">Aadhaar Number</label>
                <input
                  id="aadhaar-input"
                  className="auth-input"
                  type="text"
                  placeholder="XXXX XXXX XXXX"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                  maxLength={14}
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                id="send-otp-btn"
                className="auth-btn auth-btn--primary"
                onClick={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-btn__spinner" />
                ) : (
                  <>Send OTP</>
                )}
              </button>

              <div className="auth-divider">
                <span>or verify as</span>
              </div>

              {/* ── Bottom-right wallet buttons ── */}
              <div className="auth-wallet-btns">
                <button
                  id="contractor-login-btn"
                  className="auth-btn auth-btn--wallet"
                  onClick={() => handleWalletConnect('contractor')}
                  disabled={loading}
                >
                  <span className="auth-btn__wallet-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M14 4H2V12H14V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M11 8.5C11 8.776 10.776 9 10.5 9C10.224 9 10 8.776 10 8.5C10 8.224 10.224 8 10.5 8C10.776 8 11 8.224 11 8.5Z" fill="currentColor"/>
                      <path d="M2 4L8 1L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Contractor
                </button>
                <button
                  id="admin-login-btn"
                  className="auth-btn auth-btn--wallet auth-btn--wallet-admin"
                  onClick={() => handleWalletConnect('admin')}
                  disabled={loading}
                >
                  <span className="auth-btn__wallet-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L2 4V7.5C2 11 4.5 13.5 8 15C11.5 13.5 14 11 14 7.5V4L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Admin
                </button>
              </div>
            </div>
          )}

          {/* ── OTP Step ── */}
          {step === STEPS.OTP && (
            <div className="auth-step auth-step--fade-in">
              <button className="auth-back" onClick={handleBack}>← Back</button>
              <h2 className="auth-step__title">Enter OTP</h2>
              <p className="auth-step__desc">
                A one-time password has been sent to the mobile number linked with your Aadhaar
              </p>

              <div className="auth-input-group">
                <label className="auth-label">One-Time Password</label>
                <input
                  id="otp-input"
                  className="auth-input auth-input--otp"
                  type="text"
                  placeholder="• • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                id="verify-otp-btn"
                className="auth-btn auth-btn--primary"
                onClick={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? <span className="auth-btn__spinner" /> : <>Verify & Sign In</>}
              </button>
            </div>
          )}

          {/* ── Wallet Signing Step ── */}
          {step === STEPS.WALLET_SIGNING && (
            <div className="auth-step auth-step--fade-in">
              <button className="auth-back" onClick={handleBack}>← Back</button>
              <div className={`auth-step__badge auth-step__badge--${walletRole}`}>
                <span className="auth-step__badge-icon">{walletRole === 'admin' ? '🛡️' : '🏗️'}</span>
                {walletRole === 'admin' ? 'Admin Verification' : 'Contractor Verification'}
              </div>
              <h2 className="auth-step__title">Sign Message</h2>
              <p className="auth-step__desc">
                Wallet connected! Sign the verification message in MetaMask to prove ownership.
              </p>

              <div className="auth-wallet-info">
                <div className="auth-wallet-info__label">Connected Wallet</div>
                <div className="auth-wallet-info__address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <div className="auth-wallet-info__role">
                  Detected role: <strong>{walletRole}</strong>
                </div>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                id="sign-message-btn"
                className="auth-btn auth-btn--primary auth-btn--metamask"
                onClick={handleWalletSign}
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-btn__spinner" />
                ) : (
                  <>
                    <span className="auth-btn__fox">🦊</span>
                    Sign with MetaMask
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
