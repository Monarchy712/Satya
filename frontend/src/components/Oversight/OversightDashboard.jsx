import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getProvider,
  getSigner,
  getFactoryContract,
  getTenderContract,
  signMilestoneApproval,
  TENDER_STATUS,
  MILESTONE_STATUS,
} from '../../utils/contracts';
import LoadingOverlay from '../UI/LoadingOverlay';
import './OversightDashboard.css';

export default function OversightDashboard() {
  const { user, token } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.wallet) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const provider = getProvider();
      const factory = getFactoryContract(provider);

      // Get all tenders this user is involved in (on-chain via getUserTenders)
      const userTenderAddresses = await factory.getUserTenders(user.wallet);

      if (!userTenderAddresses || userTenderAddresses.length === 0) {
        setTenders([]);
        setLoading(false);
        return;
      }

      const results = [];

      for (const tAddr of userTenderAddresses) {
        try {
          const tender = getTenderContract(tAddr, provider);

          // Get user info from this tender
          const [involved, roleName, currentMilestoneId, milestoneStatus] =
            await tender.getUserInfo(user.wallet);

          if (!involved) continue;

          // Skip if role is Government or Contractor (not a committee member on this tender)
          if (roleName === 'Government' || roleName === 'Contractor' || roleName === 'None') continue;

          const statusNum = await tender.tenderStatus();
          const tenderStatusStr = TENDER_STATUS[Number(statusNum)];

          // Only show ACTIVE tenders (those with milestones to review)
          if (tenderStatusStr !== 'ACTIVE') continue;

          const mIdx = Number(currentMilestoneId);
          const milestone = await tender.milestones(mIdx);
          const mStatusNum = Number(milestone.status);

          // Check if this user already signed
          const alreadySigned = await tender.hasUserSigned(mIdx, user.wallet);

          // Get signature count from backend
          let sigCount = 0;
          try {
            const res = await fetch(
              `http://localhost:8000/api/committee/signatures?tender_address=${tAddr}&milestone_id=${mIdx}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
              const data = await res.json();
              sigCount = data.count;
            }
          } catch {
            // Backend may not have data yet, that's fine
          }

          results.push({
            address: tAddr,
            role: roleName,
            tenderStatus: tenderStatusStr,
            currentMilestone: mIdx,
            milestoneName: milestone.name,
            milestoneStatus: MILESTONE_STATUS[mStatusNum] || 'UNKNOWN',
            milestoneStatusNum: mStatusNum,
            milestonePercentage: Number(milestone.percentage),
            alreadySigned,
            sigCount,
          });
        } catch (err) {
          console.error(`Error loading tender ${tAddr}:`, err);
        }
      }

      setTenders(results);
    } catch (err) {
      console.error('Failed to load oversight data:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSign(tenderAddr, milestoneId) {
    setSigning(true);
    setToast('');
    setError('');
    try {
      // 1. Get signer from MetaMask
      const signer = await getSigner();

      // 2. Sign the EIP-712 typed data off-chain
      const signature = await signMilestoneApproval(signer, tenderAddr, milestoneId);

      // 3. Send signature to backend for accumulation
      const res = await fetch('http://localhost:8000/api/committee/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tender_address: tenderAddr,
          milestone_id: milestoneId,
          signature: signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signing failed');

      if (data.executed) {
        setToast(`✅ Milestone executed on-chain! All 4 signatures collected.`);
      } else {
        setToast(`✅ Signature recorded (${data.count}/4)`);
      }

      // Reload data to reflect new state
      loadData();
    } catch (err) {
      const reason = err.reason || err.message || 'Unknown error';
      setError(`Signing failed: ${reason}`);
    } finally {
      setSigning(false);
    }
  }

  // Pretty role name mapping
  const formatRole = (role) => {
    const map = {
      OnSiteEngineer: 'On-Site Engineer',
      ComplianceOfficer: 'Compliance Officer',
      FinancialAuditor: 'Financial Auditor',
      SanctioningAuthority: 'Sanctioning Authority',
    };
    return map[role] || role;
  };

  return (
    <div className="oversight-view">
      <LoadingOverlay active={signing} context="signing" variant="dark" />

      <header className="oversight-view__header">
        <h1>Oversight Committee Portal</h1>
        <div className="oversight-view__badge">
          Role: {formatRole(user?.name || 'Committee Member')}
        </div>
      </header>

      {error && (
        <div className="oversight-view__error" onClick={() => setError('')}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <LoadingOverlay active={true} context="oversight" inline={true} variant="dark" />
      ) : (
        <div className="oversight-view__container">
          <section className="oversight-view__list">
            <h2>Pending Milestone Reviews</h2>
            {tenders.length === 0 ? (
              <div className="oversight-view__empty">
                <span className="oversight-view__empty-icon">✓</span>
                <p>No tenders require your attention at this time.</p>
              </div>
            ) : (
              tenders.map((t) => (
                <div
                  key={t.address + t.currentMilestone}
                  className={`oversight-card ${t.alreadySigned ? 'oversight-card--signed' : ''}`}
                >
                  <div className="oversight-card__info">
                    <h3 className="oversight-card__address">
                      {t.address.slice(0, 8)}...{t.address.slice(-6)}
                    </h3>
                    <div className="oversight-card__milestone">
                      Milestone #{t.currentMilestone + 1}:{' '}
                      <strong>{t.milestoneName}</strong>
                    </div>
                    <div className="oversight-card__meta">
                      <span className="oversight-card__role">
                        Your Role: <strong>{formatRole(t.role)}</strong>
                      </span>
                      <span className={`oversight-card__status oversight-card__status--${t.milestoneStatus.toLowerCase().replace('_', '-')}`}>
                        {t.milestoneStatus}
                      </span>
                      <span className="oversight-card__sigs">
                        Signatures: {t.sigCount}/4
                      </span>
                    </div>
                  </div>

                  <div className="oversight-card__action">
                    {t.alreadySigned ? (
                      <div className="oversight-card__status oversight-card__status--signed">
                        Signature Recorded ✓
                      </div>
                    ) : t.milestoneStatusNum === 1 ? (
                      <button
                        className="oversight-card__btn"
                        onClick={() => handleSign(t.address, t.currentMilestone)}
                        disabled={signing}
                      >
                        🖋️ Sign & Approve
                      </button>
                    ) : (
                      <div className="oversight-card__status oversight-card__status--waiting">
                        Awaiting Submission
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          <aside className="oversight-view__rules">
            <h3>EIP-712 Signing Protocol</h3>
            <ul>
              <li>Your signature is cryptographically tied to this milestone and contract.</li>
              <li>Once 4/4 committee members sign, the milestone is automatically executed on-chain.</li>
              <li>Funds are released to the contractor upon successful execution.</li>
              <li>Each member can only sign once per milestone — no duplicates.</li>
            </ul>
            <p className="oversight-view__note">
              Signatures are stored off-chain until all 4 are collected, then verified and executed trustlessly on the blockchain.
            </p>
          </aside>
        </div>
      )}

      {toast && (
        <div className="oversight-view__toast" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </div>
  );
}
