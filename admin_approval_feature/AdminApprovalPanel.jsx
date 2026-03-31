import { useState, useEffect } from 'react';
// These imports are placeholders. Depending on where this file is moved, you may need to adjust the paths.
// import { connectMetaMask, isMetaMaskInstalled } from '../../utils/metamask';
// import { getMilestoneDetails, approveMilestone } from './api_extensions'; 
import './AdminApprovalPanel.css';

export default function AdminApprovalPanel({ milestoneId = 1, onApprovalSuccess }) {
  // --- States ---
  const [walletAddress, setWalletAddress] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Mock Data Layer --- 
  // In live usage, you would call `getMilestoneDetails(milestoneId)`
  useEffect(() => {
    const fetchMilestone = async () => {
      try {
        setLoading(true);
        // Simulating API Fetch
        setTimeout(() => {
          setMilestone({
            milestoneId: milestoneId,
            name: "Foundation & Framing Phase",
            deadline: new Date(Date.now() + 864000000).toISOString(),
            completionPercent: 100,
            status: "UNDER_REVIEW",
            tenderAddress: "0x7a2...4fA9",
            admins: [
              "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", // Add your dev wallet here for testing
              "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
            ]
          });
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error(err);
        setToast({ type: 'error', text: 'Failed to load milestone data.' });
        setLoading(false);
      }
    };
    fetchMilestone();
  }, [milestoneId]);

  // --- Handlers ---
  const handleConnectWallet = async () => {
    try {
      // If `utils/metamask.js` is accessible:
      // const address = await connectMetaMask();
      
      // Standalone fallback if metamask import breaks during testing:
      if (!window.ethereum) throw new Error("MetaMask not found.");
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0].toLowerCase());
    } catch (err) {
      setToast({ type: 'error', text: err.message || "Failed to connect wallet." });
    }
  };

  const handleApprove = async () => {
    if (!walletAddress || !isAdmin || milestone?.status !== 'UNDER_REVIEW') return;
    
    try {
      setApproving(true);
      setToast(null);

      // In live usage: 
      // await approveMilestone(milestone.milestoneId, walletAddress);

      // Simulating network request to smart contract
      await new Promise(r => setTimeout(r, 2000));
      
      setMilestone(prev => ({ ...prev, status: 'APPROVED' }));
      setToast({ type: 'success', text: 'Approval submitted successfully to the blockchain.' });
      
      if (onApprovalSuccess) {
        onApprovalSuccess();
      }
    } catch (err) {
      setToast({ type: 'error', text: err.message || "Approval failed." });
    } finally {
      setApproving(false);
    }
  };

  // --- Derived State Computations ---
  const isAdmin = milestone && walletAddress && 
                  milestone.admins.map(a => a.toLowerCase()).includes(walletAddress);

  const shortenAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // --- Early Returns ---
  if (loading) {
    return (
      <div className="admin-panel admin-panel--loading">
        <p>Loading Admin Data...</p>
      </div>
    );
  }

  if (!milestone) return null;

  // Render Lockout if wallet connected but not admin
  if (walletAddress && !isAdmin) {
    return (
      <div className="admin-panel">
        <div className="admin-panel__auth-error">
          <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🚫</span>
          Access Denied. Your wallet address is not authorized for this milestone.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* HEADER */}
      <header className="admin-panel__header">
        <h2 className="admin-panel__title">Admin Approval</h2>
        {walletAddress ? (
          <div className="admin-panel__wallet-status" title={walletAddress}>
            🟢 Connected: {shortenAddress(walletAddress)}
          </div>
        ) : (
          <button className="admin-panel__btn-connect" onClick={handleConnectWallet}>
            Connect Wallet
          </button>
        )}
      </header>

      {/* MILESTONE INFO */}
      <section className="admin-panel__info">
        <div className="admin-panel__info-item">
          <span className="admin-panel__info-label">Milestone</span>
          <span className="admin-panel__info-value">{milestone.name}</span>
        </div>
        <div className="admin-panel__info-item">
          <span className="admin-panel__info-label">Status</span>
          <div>
            <span className={`admin-panel__badge admin-panel__badge--${milestone.status.toLowerCase()}`}>
              {milestone.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="admin-panel__info-item">
          <span className="admin-panel__info-label">Completion</span>
          <span className="admin-panel__info-value">{milestone.completionPercent}%</span>
        </div>
        <div className="admin-panel__info-item">
          <span className="admin-panel__info-label">Deadline</span>
          <span className="admin-panel__info-value">
            {new Date(milestone.deadline).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </span>
        </div>
      </section>

      {/* ADMINS REQUIREMENT LIST */}
      <section className="admin-panel__admins">
        <div className="admin-panel__admins-title">Required Signatures</div>
        <div className="admin-panel__admin-list">
          {milestone.admins.map((addr, idx) => (
            <span key={addr} className="admin-panel__admin-item">
              {idx === 0 ? "Authority" : idx === 1 ? "Auditor" : "Reviewer"}: {shortenAddress(addr)}
            </span>
          ))}
        </div>
      </section>

      {/* ACTIONS */}
      <section className="admin-panel__actions">
        <button 
          className="admin-panel__btn-approve"
          disabled={!walletAddress || !isAdmin || milestone.status !== 'UNDER_REVIEW' || approving}
          onClick={handleApprove}
        >
          {approving ? (
            <span className="spinner"></span>
          ) : (
            milestone.status === 'APPROVED' ? 'Approved ✓' : 'Approve Milestone'
          )}
        </button>
        
        {/* Tooltip explaining disabled state */}
        {(!walletAddress || !isAdmin) && milestone.status === 'UNDER_REVIEW' && (
          <span className="admin-panel__tooltip">Only listed admins can approve this step.</span>
        )}
        {milestone.status !== 'UNDER_REVIEW' && milestone.status !== 'APPROVED' && (
          <span className="admin-panel__tooltip">Milestone must clearly be under review to be approved.</span>
        )}
      </section>

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className={`admin-panel__toast admin-panel__toast--${toast.type}`}>
          {toast.text}
        </div>
      )}

      {/* META TIMESTAMP */}
      <div className="admin-panel__timestamp">
        Last synced: {new Date().toLocaleTimeString('en-IN')}
      </div>
    </div>
  );
}
