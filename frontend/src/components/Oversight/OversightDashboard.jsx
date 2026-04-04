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
  ROLE_NAMES,
  submitDispute,
  castDisputeVote,
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

  // Handle dispute raising
  const [showDisputeModal, setShowDisputeModal] = useState({ show: false, tenderAddr: '', milestoneId: null });
  const [disputeReason, setDisputeReason] = useState('');

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

          // Get role name (returns "None", "OnSiteEngineer", etc.)
          const roleName = await tender.getRoleName(user.wallet);

          // Get status and current milestone
          const statusNum = await tender.tenderStatus();
          const tenderStatusStr = TENDER_STATUS[Number(statusNum)] || "VOID";

          // Show ACTIVE or COMPLETED or VOID tenders for Oversight / Dispute
          if (tenderStatusStr !== 'ACTIVE' && tenderStatusStr !== 'COMPLETED' && tenderStatusStr !== 'VOID') continue;

          const mIdxBigInt = await tender.currentMilestone();
          const mIdx = Number(mIdxBigInt);

          // Get milestone details (struct returns name, percentage, deadline, status)
          const milestone = await tender.milestones(mIdx);
          const mStatusNum = Number(milestone.status);

          // Check if this user already signed (mapping: hasSigned[id][user])
          const onchainSigned = await tender.hasSigned(mIdx, user.wallet);

          let offchainSigned = false;
          try {
            const hasSignedRes = await fetch(
              `http://localhost:8000/api/committee/has-signed?tender_address=${tAddr}&milestone_id=${mIdx}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (hasSignedRes.ok) {
              offchainSigned = await hasSignedRes.json();
            }
          } catch {
            // Ignore
          }

          const alreadySigned = onchainSigned || offchainSigned;

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
            // Backend may not have data yet
          }

          // Get balance + DB metadata from backend
          let balance = '0';
          let tenderName = null, tenderDesc = null, createdByDept = null, lat = null, lng = null;
          try {
            const bres = await fetch(`http://localhost:8000/api/tenders/${tAddr}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (bres.ok) {
              const bdata = await bres.json();
              if (bdata.total_funds) {
                balance = ethers.formatEther(bdata.total_funds);
              }
              tenderName      = bdata.tender_name        || null;
              tenderDesc      = bdata.tender_description || null;
              createdByDept   = bdata.created_by_dept    || null;
              lat             = bdata.latitude           ?? null;
              lng             = bdata.longitude          ?? null;
            }
          } catch (err) {
            console.error(`Failed to fetch backend data for ${tAddr}:`, err);
          }

          // --- DISPUTE FETCHING LOGIC ---
          let disputeObj = null;
          try {
            const dState = await tender.dispute();
            if (dState[1] !== "") { // Has reason
               let isVoter = false;
               let hasVoted = false;
               if (!dState[4]) {
                  // Active dispute
                  hasVoted = await tender.hasVoted(user.wallet);
                  if (hasVoted) {
                    isVoter = true;
                  } else {
                    try {
                      await tender.vote.staticCall(true, { gasLimit: 300000 });
                      isVoter = true; // No revert means they can vote
                    } catch (e) {
                      if (e.message && e.message.includes("Already voted")) isVoter = true;
                      else isVoter = false;
                    }
                  }
               }
               disputeObj = {
                 milestoneId: Number(dState[0]),
                 reason: dState[1],
                 votesForGov: Number(dState[2]),
                 votesForContractor: Number(dState[3]),
                 votesForNone: Number(dState[4]),
                 resolved: dState[5],
                 isVoter,
                 hasVoted
               };
            }
          } catch(err) {
            console.error("Dispute check failed", err);
          }
          // --- END DISPUTE FETCHING ---

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
            balance,
            tenderName,
            tenderDesc,
            createdByDept,
            lat,
            lng,
            dispute: disputeObj
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
      } else if (data.count >= 4) {
        setError(`⚠️ Signatures collected, but on-chain execution failed: ${data.error || 'Check wallet/gas'}`);
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

  async function handleExecute(tenderAddr, milestoneId) {
    setSigning(true);
    setToast('');
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/committee/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tender_address: tenderAddr,
          milestone_id: milestoneId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Execution failed');

      setToast(`✅ Milestone executed successfully!`);
      loadData();
    } catch (err) {
      setError(`Execution failed: ${err.message}`);
    } finally {
      setSigning(false);
    }
  }

  async function handleRaiseDispute() {
    if (!disputeReason) return;
    setSigning(true);
    setToast('');
    setError('');
    const { tenderAddr, milestoneId } = showDisputeModal;
    try {
      const signer = await getSigner();
      await submitDispute(signer, tenderAddr, milestoneId, disputeReason);
      setToast('Dispute raised successfully! Jury has been established.');
      setShowDisputeModal({ show: false, tenderAddr: '', milestoneId: null });
      setDisputeReason('');
      loadData();
    } catch(err) {
      setError(`Failed to raise dispute: ${err.message}`);
    } finally {
      setSigning(false);
    }
  }

  async function handleVote(tenderAddr, choice) {
    setSigning(true);
    setToast('');
    setError('');
    try {
      const signer = await getSigner();
      await castDisputeVote(signer, tenderAddr, choice);
      setToast('Vote cast successfully!');
      loadData();
    } catch(err) {
      setError(`Failed to vote: ${err.message}`);
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
                  className={`oversight-card ${
                    t.tenderStatus === 'COMPLETED' ? 'oversight-card--completed' : 
                    t.alreadySigned ? 'oversight-card--signed' : ''
                  }`}
                >
                  <div className="oversight-card__info">
                    <h3 className="oversight-card__address">
                      {t.tenderName || <>{t.address.slice(0, 8)}...{t.address.slice(-6)}</>}
                    </h3>
                    {(t.tenderDesc || t.createdByDept || t.lat != null) && (
                      <div style={{display:'flex', flexWrap:'wrap', gap:'6px', margin:'6px 0 10px'}}>
                        {t.tenderDesc && (
                          <p style={{width:'100%', fontSize:'0.78rem', opacity:0.75, margin:'0 0 4px', lineHeight:'1.5'}}>
                            {t.tenderDesc}
                          </p>
                        )}
                        {t.createdByDept && (
                          <span style={{fontSize:'0.7rem', background:'rgba(255,255,255,0.08)', padding:'2px 9px', borderRadius:'20px', opacity:0.85}}>
                            🏛️ {t.createdByDept}
                          </span>
                        )}
                        {t.lat != null && t.lng != null && (
                          <span style={{fontSize:'0.7rem', background:'rgba(255,255,255,0.08)', padding:'2px 9px', borderRadius:'20px', opacity:0.85}}>
                            📍 {Number(t.lat).toFixed(4)}, {Number(t.lng).toFixed(4)}
                          </span>
                        )}
                      </div>
                    )}
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
                      <div className="oversight-card__progress">
                        <div className="oversight-card__progress-label">
                          <span>Signatures Collected</span>
                          <strong>{t.sigCount}/4</strong>
                        </div>
                        <div className="oversight-card__progress-track">
                          <div 
                            className="oversight-card__progress-fill"
                            style={{ 
                              width: `${(t.sigCount / 4) * 100}%`,
                              background: t.sigCount >= 4 ? 'var(--status-completed)' : 'var(--pink-600)'
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="oversight-card__balance" style={{color: Number(t.balance) > 0 ? '#2ecc71' : '#e74c3c'}}>
                        Contract Balance: {t.balance} ETH
                      </div>
                    </div>
                  </div>

                  <div className="oversight-card__action">
                    {t.tenderStatus === 'COMPLETED' ? (
                      <div className="oversight-card__status oversight-card__status--signed" style={{ color: '#2ecc71', textShadow: '0 0 10px rgba(46, 204, 113, 0.5)' }}>
                        PROJECT COMPLETED ✓
                      </div>
                    ) : t.tenderStatus === 'VOID' ? (
                       <div className="oversight-card__status oversight-card__status--waiting" style={{ color: 'var(--pink-500)', borderColor: 'var(--pink-500)' }}>
                         Tender Voided (Dispute Resolved)
                       </div>
                    ) : t.dispute ? (
                       <div className="oversight-dispute-panel" style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'rgba(255,0,0,0.1)', border: '1px solid var(--pink-600)', borderRadius: '6px' }}>
                          <h4 style={{ color: 'var(--pink-500)', marginBottom: '8px' }}>🚨 Active Dispute</h4>
                          <p style={{ fontSize: '0.8rem', marginBottom: '10px' }}><strong>Reason:</strong> {t.dispute.reason}</p>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', marginBottom: '10px', flexWrap: 'wrap' }}>
                            <span><strong>Gov Votes:</strong> {t.dispute.votesForGov}</span>
                            <span><strong>Contractor Votes:</strong> {t.dispute.votesForContractor}</span>
                            <span><strong>Neutral Votes:</strong> {t.dispute.votesForNone}</span>
                          </div>
                          <p style={{fontSize:'0.7rem', color:'var(--pink-400)', marginBottom:'10px'}}>
                            <strong>Rule:</strong> First 3 votes from the committee pool will resolve the dispute.
                          </p>
                          {!t.dispute.resolved && !t.dispute.hasVoted && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              <button className="oversight-card__btn" style={{ flex: 1, backgroundColor: '#3498db', borderColor: '#3498db', fontSize: '0.72rem', padding: '10px 5px' }} onClick={() => handleVote(t.address, 0)} disabled={signing}>
                                Vote Government <br/><small>(Refund Gov)</small>
                              </button>
                              <button className="oversight-card__btn oversight-card__btn--execute" style={{ flex: 1, fontSize: '0.72rem', padding: '10px 5px' }} onClick={() => handleVote(t.address, 1)} disabled={signing}>
                                Vote Contractor <br/><small>(Final Payout)</small>
                              </button>
                              <button className="oversight-card__btn" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'var(--gray-500)', fontSize: '0.72rem', padding: '10px 5px' }} onClick={() => handleVote(t.address, 2)} disabled={signing}>
                                Neutral / Dismiss <br/><small>(Continue Project)</small>
                              </button>
                            </div>
                          )}
                          {!t.dispute.resolved && t.dispute.hasVoted && (
                             <div className="oversight-card__status oversight-card__status--signed">Vote Submitted ✓</div>
                          )}
                          {t.dispute.resolved && (
                             <div className="oversight-card__status oversight-card__status--signed">Dispute Resolved</div>
                          )}
                       </div>
                    ) : t.milestoneStatusNum === 1 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        {t.sigCount >= 4 ? (
                          <button
                            className="oversight-card__btn oversight-card__btn--execute"
                            onClick={() => handleExecute(t.address, t.currentMilestone)}
                            disabled={signing}
                          >
                            ⚙️ Execute On-Chain
                          </button>
                        ) : t.alreadySigned ? (
                          <div className="oversight-card__status oversight-card__status--approved">
                            Successful ✓
                          </div>
                        ) : (
                          <button
                            className="oversight-card__btn"
                            onClick={() => handleSign(t.address, t.currentMilestone)}
                            disabled={signing}
                          >
                            Sign & Approve
                          </button>
                        )}
                        {(t.role === 'Government') && (
                          <button
                             className="oversight-card__btn"
                             onClick={() => setShowDisputeModal({ show: true, tenderAddr: t.address, milestoneId: t.currentMilestone })}
                             style={{ backgroundColor: 'transparent', color: 'var(--pink-500)', border: '1px solid var(--pink-500)' }}
                             disabled={signing}
                          >
                            Raise Dispute
                          </button>
                        )}
                      </div>
                    ) : t.milestoneStatusNum === 2 ? (
                      <div className="oversight-card__status oversight-card__status--signed">
                        Phase Finalized ✓
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <div className="oversight-card__status oversight-card__status--waiting">
                          Awaiting Submission
                        </div>
                        {(t.role === 'Government' || t.role === 'Contractor') && (
                          <button
                             className="oversight-card__btn"
                             onClick={() => setShowDisputeModal({ show: true, tenderAddr: t.address, milestoneId: t.currentMilestone })}
                             style={{ backgroundColor: 'transparent', color: 'var(--pink-500)', border: '1px solid var(--pink-500)' }}
                             disabled={signing}
                          >
                            Raise Dispute
                          </button>
                        )}
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

      {showDisputeModal.show && (
        <div className="admin-modal">
          <div className="admin-modal__content">
            <h3>Raise Dispute</h3>
            <p style={{fontSize:'0.85rem', color:'var(--gray-300)', marginBottom:'15px'}}>
              This will trigger a decentralized arbitration process from randomized administration pools.
            </p>
            <textarea
              className="admin-form__input"
              rows={4}
              placeholder="State the reason for this dispute..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              style={{ width: '100%', marginBottom: '15px' }}
            />
            <div className="admin-modal__actions">
              <button className="admin-header__back" onClick={() => setShowDisputeModal({ show: false, tenderAddr: '', milestoneId: null })}>Cancel</button>
              <button className="admin-denied__btn" onClick={handleRaiseDispute} disabled={!disputeReason || signing}>Submit Dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
