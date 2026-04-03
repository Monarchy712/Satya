import { useState, useEffect } from 'react';
import './LoadingOverlay.css';

/**
 * LoadingOverlay — A premium, theme-aware loading overlay with animated progress
 * and contextual messages. Replaces all ugly plain-text loading states.
 *
 * @param {boolean} active      — Whether the overlay is visible
 * @param {string}  context     — Context key for descriptive messages:
 *   'blockchain', 'ledger', 'contractor', 'admin', 'oversight',
 *   'tenders', 'auth', 'signing', 'deploying', 'submitting', 'generic'
 * @param {string}  [message]   — Optional override message
 * @param {boolean} [inline]    — If true, renders inline instead of fixed overlay
 * @param {string}  [variant]   — 'light' (default) or 'dark'
 */

const CONTEXT_MESSAGES = {
  blockchain: [
    'Syncing with the blockchain…',
    'Querying smart contract state…',
    'Verifying on-chain data integrity…',
    'Fetching truth from decentralized ledger…',
  ],
  ledger: [
    'Loading contractor data…',
    'Reconciling ledger entries…',
    'Aggregating project portfolios…',
    'Unifying on-chain records…',
  ],
  contractor: [
    'Syncing on-chain assets…',
    'Loading active contracts & milestones…',
    'Fetching bid registry data…',
    'Reconciling infrastructure pipeline…',
  ],
  admin: [
    'Scanning governance records…',
    'Loading tender vault data…',
    'Syncing administrative state…',
    'Fetching project governance data…',
  ],
  oversight: [
    'Loading committee workspace…',
    'Scanning for pending authorizations…',
    'Verifying signatory roles…',
    'Fetching milestone review queue…',
  ],
  tenders: [
    'Coordinating decentralized ledger states…',
    'Syncing tender marketplace data…',
    'Fetching active bidding windows…',
    'Loading infrastructure project catalog…',
  ],
  auth: [
    'Authenticating identity…',
    'Verifying credentials…',
    'Securing your session…',
  ],
  signing: [
    'Recording signature on-chain…',
    'Awaiting blockchain confirmation…',
    'Transmitting approval to network…',
  ],
  deploying: [
    'Deploying contract to network…',
    'Awaiting blockchain confirmation…',
    'Writing governance parameters…',
    'Contract deployment in progress…',
  ],
  submitting: [
    'Transmitting to approval pipeline…',
    'Submitting deliverables for review…',
    'Recording submission metadata…',
  ],
  generic: [
    'Loading…',
    'Please wait…',
    'Processing request…',
  ],
};

export default function LoadingOverlay({
  active,
  context = 'generic',
  message,
  inline = false,
  variant = 'light',
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const messages = CONTEXT_MESSAGES[context] || CONTEXT_MESSAGES.generic;

  // Animate in
  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress(0);
      setMessageIndex(0);
    } else {
      // Fade out
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [active]);

  // Cycle messages
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [active, messages.length]);

  // Simulate progress
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev; // Never reach 100 (we don't know when it'll finish)
        const increment = Math.random() * 8 + 2;
        return Math.min(prev + increment, 92);
      });
    }, 600);
    return () => clearInterval(interval);
  }, [active]);

  if (!visible) return null;

  const currentMessage = message || messages[messageIndex];
  const isDark = variant === 'dark';

  if (inline) {
    return (
      <div className={`lo-inline ${isDark ? 'lo-inline--dark' : ''} ${active ? 'lo-inline--active' : 'lo-inline--exit'}`}>
        <div className="lo-inline__content">
          <div className="lo-spinner">
            <svg className="lo-spinner__svg" viewBox="0 0 50 50">
              <circle className="lo-spinner__track" cx="25" cy="25" r="20" fill="none" strokeWidth="3" />
              <circle className="lo-spinner__fill" cx="25" cy="25" r="20" fill="none" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="lo-spinner__pulse" />
          </div>
          <div className="lo-inline__text-group">
            <p className="lo-inline__message" key={messageIndex}>{currentMessage}</p>
            <div className="lo-inline__progress-track">
              <div className="lo-inline__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`lo-overlay ${isDark ? 'lo-overlay--dark' : ''} ${active ? 'lo-overlay--active' : 'lo-overlay--exit'}`}>
      <div className="lo-card">
        {/* Decorative top accent */}
        <div className="lo-card__accent" />

        {/* Logo mark */}
        <div className="lo-card__logo">
          <span className="lo-card__logo-icon">◈</span>
        </div>

        {/* Spinner */}
        <div className="lo-spinner lo-spinner--lg">
          <svg className="lo-spinner__svg" viewBox="0 0 50 50">
            <circle className="lo-spinner__track" cx="25" cy="25" r="20" fill="none" strokeWidth="2.5" />
            <circle className="lo-spinner__fill" cx="25" cy="25" r="20" fill="none" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="lo-spinner__pulse" />
        </div>

        {/* Message */}
        <p className="lo-card__message" key={messageIndex}>{currentMessage}</p>

        {/* Progress bar */}
        <div className="lo-card__progress-track">
          <div className="lo-card__progress-fill" style={{ width: `${progress}%` }} />
          <div className="lo-card__progress-glow" style={{ left: `${progress}%` }} />
        </div>

        {/* Status hint */}
        <p className="lo-card__hint">Satya Transparency Protocol</p>
      </div>
    </div>
  );
}
