import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getSigner, getTenderContract, submitDispute } from '../../utils/contracts';
import LoadingOverlay from '../UI/LoadingOverlay';
import './ContractorDashboard.css';

export default function ContractorDashboard() {
  const { user, token } = useAuth();
  const [myBids, setMyBids] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now] = useState(Math.floor(Date.now() / 1000));
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [report, setReport] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState({ show: false, tenderAddr: '', mIdx: null });
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    loadContractorData();
  }, []);

  async function loadContractorData() {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/tenders/list');
      const allTenders = response.data;
      
      const myAddress = user.wallet.toLowerCase();
      
      const bids = allTenders.filter(t => t.bids.some(b => b.bidder.toLowerCase() === myAddress));
      const contracts = allTenders.filter(t => t.contractor.toLowerCase() === myAddress);
      
      setMyBids(bids);
      setMyContracts(contracts);
    } catch (err) {
      console.error('[Contractor] Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const openSubmissionModal = (tenderAddr, mIdx, mName) => {
    setSelectedTask({ tenderAddr, mIdx, mName });
    setShowModal(true);
  };

  const handleSubmitMilestone = async () => {
    if (!selectedTask || submitting) return;
    setSubmitting(true);
    
    try {
      // Submit milestone directly on-chain via MetaMask
      const signer = await getSigner();
      const tender = getTenderContract(selectedTask.tenderAddr, signer);
      
      const tx = await tender.submitMilestone(BigInt(selectedTask.mIdx));
      await tx.wait();

      alert('Phase successfully submitted for oversight review on-chain!');
      setShowModal(false);
      setReport('');
      loadContractorData();
    } catch (err) {
      const reason = err.reason || err.message || 'Unknown error';
      alert(`Submission failed: ${reason}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason || submitting) return;
    setSubmitting(true);
    try {
      const signer = await getSigner();
      await submitDispute(signer, showDisputeModal.tenderAddr, showDisputeModal.mIdx, disputeReason);
      alert('Conflict raised successfully! Jury is established.');
      setShowDisputeModal({ show: false, tenderAddr: '', mIdx: null });
      setDisputeReason('');
      loadContractorData();
    } catch (err) {
      alert(`Raise dispute failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contractor-dashboard">
      <div className="contractor-dashboard__container">
        
        <header className="contractor-header">
           <div className="contractor-header__info">
             <h1 className="contractor-header__title">Infrastructure Ledger</h1>
             <p className="contractor-header__subtitle">
               Authorized Contractor: <span style={{color: 'var(--contractor-accent)', fontFamily: 'JetBrains Mono'}}>{user?.wallet.slice(0,12)}...</span>
             </p>
           </div>
           <div className="contractor-stats">
              <div className="contractor-view__badge">PROJECTS: {myContracts.length}</div>
           </div>
        </header>

        {loading ? (
          <LoadingOverlay active={true} context="contractor" inline={true} />
        ) : (
          <div className="contractor-dashboard__grid">
            
            <section className="contractor-section">
              <h2 className="contractor-section__title">
                <span style={{fontSize:'1.2rem'}}>🏗️</span> Active Execution Pipeline
              </h2>
              
              {myContracts.length > 0 ? (
                <div className="contractor-contracts-list">
                  {myContracts.map(t => (
                    <div 
                      key={t.tender_address} 
                      className={`contractor-card ${t.status === 'COMPLETED' ? 'contractor-card--completed' : ''}`}
                    >
                       <div className="contractor-card__top" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--c-text)', margin: 0, paddingRight: '16px', lineHeight: 1.2 }}>
                              {t.tender_name || 'Active Project'}
                            </h3>
                            <div className={`contractor-card__tag contractor-card__tag--${t.status.toLowerCase()}`}>
                              {t.status}
                            </div>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span className="contractor-card__addr">{t.tender_address}</span>
                          </div>
                       </div>
                       
                       {(t.tender_description || t.created_by_dept || t.latitude != null) && (
                         <div className="contractor-card__metadata" style={{ marginBottom: '24px' }}>
                           {t.tender_description && (
                             <p className="contractor-card__desc" style={{ fontSize: '0.85rem', color: 'var(--c-text-dim)', marginBottom: '12px', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                               {t.tender_description}
                             </p>
                           )}
                           <div className="contractor-card__pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                             {t.created_by_dept && (
                               <span className="contractor-card__pill" style={{ background: 'var(--gray-50)', border: '1px solid var(--c-border)', color: 'var(--c-text-dim)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                 🏛️ {t.created_by_dept}
                               </span>
                             )}
                             {t.latitude != null && t.longitude != null && (
                               <span className="contractor-card__pill" style={{ background: 'var(--gray-50)', border: '1px solid var(--c-border)', color: 'var(--c-text-dim)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                 📍 {Number(t.latitude).toFixed(4)}, {Number(t.longitude).toFixed(4)}
                               </span>
                             )}
                           </div>
                         </div>
                       )}
                       
                       <div className="contractor-milestones">
                          {t.milestones.map((m, idx) => {
                            const isPending = m.status === 0;
                            const isSubmitted = m.status === 1;
                            const isCompleted = m.status === 2;
                            const hasTime = now < m.deadline;

                            return (
                              <div key={idx} className="contractor-milestone-row">
                                 <div className="contractor-milestone-info">
                                    <span className={`contractor-milestone-status contractor-milestone-status--${isCompleted ? 'done' : isSubmitted ? 'wait' : 'todo'}`}>
                                      {isCompleted ? '✓' : isSubmitted ? '…' : idx + 1}
                                    </span>
                                    <div>
                                       <div style={{fontWeight:'700', fontSize: '0.95rem'}}>{m.name}</div>
                                       <div style={{fontSize:'0.75rem', color:'var(--contractor-text-dim)', marginTop: '4px'}}>
                                         Weight: {m.percentage}% | Deadline: {new Date(m.deadline * 1000).toLocaleDateString()}
                                       </div>
                                    </div>
                                 </div>
                                 
                                 {isPending && idx === t.current_milestone && !t.dispute?.reason && (
                                   <div style={{ display: 'flex', gap: '10px' }}>
                                     <button 
                                       className="contractor-milestone-btn"
                                       onClick={() => openSubmissionModal(t.tender_address, idx, m.name)}
                                     >
                                       Apply for Approval
                                     </button>
                                     <button 
                                       className="contractor-milestone-btn"
                                       style={{ backgroundColor: 'transparent', color: 'var(--pink-500)', border: '1px solid var(--pink-500)' }}
                                       onClick={() => setShowDisputeModal({ show: true, tenderAddr: t.tender_address, mIdx: idx })}
                                     >
                                       Raise Conflict
                                     </button>
                                   </div>
                                 )}
                                 {t.dispute?.reason && idx === t.current_milestone && (
                                   <span className="contractor-milestone-indicator" style={{color: 'var(--pink-500)'}}>Active Conflict Under Review</span>
                                 )}
                                 {isSubmitted && <span className="contractor-milestone-indicator" style={{color: 'var(--status-review)'}}>Oversight Review</span>}
                                 {isCompleted && <span className="contractor-milestone-indicator" style={{color: 'var(--status-approved)'}}>Phase Finalized</span>}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="contractor-empty">
                  <h3>No Active Assets</h3>
                  <p>You currently have no won contracts. Check the Tenders Portal to place bids.</p>
                </div>
              )}
            </section>

            <aside className="contractor-sidebar">
               <section className="contractor-section">
                  <h2 className="contractor-section__title">
                    <span style={{fontSize:'1.2rem'}}>📂</span> Bid Registry
                  </h2>
                  <div className="contractor-bids-list">
                    {myBids.map(t => {
                      const isWinning = t.contractor.toLowerCase() === user.wallet.toLowerCase();
                      return (
                        <div key={t.tender_address} className="contractor-bid-item">
                           <div className="contractor-bid-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ fontSize: '0.9rem', color: 'var(--c-text)', lineHeight: 1.2 }}>
                                {t.tender_name ? t.tender_name.slice(0,25) + (t.tender_name.length > 25 ? '...' : '') : t.tender_address.slice(0,14) + '...'}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--c-text-dim)', fontFamily: 'var(--font-mono)' }}>
                                {t.tender_address.slice(0, 6)}...{t.tender_address.slice(-4)}
                              </span>
                           </div>
                           <div className={`contractor-bid-badge contractor-bid-badge--${isWinning ? 'won' : t.status === 'BIDDING' ? 'pending' : 'lost'}`}>
                             {isWinning ? 'WON' : t.status === 'BIDDING' ? 'PENDING' : 'LOST'}
                           </div>
                        </div>
                      );
                    })}
                    {myBids.length === 0 && <div className="contractor-empty" style={{padding:'20px'}}>No bids recorded.</div>}
                  </div>
               </section>
            </aside>

          </div>
        )}

        {/* Submission Modal */}
        {showModal && (
          <div className="contractor-modal-overlay" onClick={() => !submitting && setShowModal(false)}>
            <div className="contractor-modal" onClick={e => e.stopPropagation()}>
              {/* Accent strip */}
              <div className="contractor-modal__accent" />

              <h2 className="contractor-modal__title">Authorized Work Submission</h2>
              <p className="contractor-modal__desc">
                Requesting multi-signature approval for phase: <br/>
                <strong style={{color: 'var(--contractor-accent)'}}>{selectedTask?.mName}</strong>
              </p>
              
              <label className="contractor-modal__label">
                NOTE TO APPROVAL COMMITTEE
              </label>
              <textarea 
                className="contractor-modal__textarea" 
                rows="3"
                placeholder="Add any notes, context, or references for the oversight committee reviewing this milestone…"
                value={report}
                onChange={(e) => setReport(e.target.value)}
              />

              <div className="contractor-modal__file-wrapper">
                <label className="contractor-modal__label">
                  UPLOAD PROOF / DOCUMENTS (OPTIONAL)
                </label>
                <input 
                  type="file" 
                  className="contractor-modal__file-input" 
                  onChange={(e) => console.log('File selected (UI only):', e.target.files[0])}
                />
              </div>

              <div className="contractor-modal__actions">
                <button className="contractor-modal__btn contractor-modal__btn--secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button className="contractor-modal__btn contractor-modal__btn--primary" onClick={handleSubmitMilestone} disabled={submitting}>
                  {submitting ? 'Transmitting…' : 'Authorize Submission'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {showDisputeModal.show && (
          <div className="contractor-modal-overlay" onClick={() => !submitting && setShowDisputeModal({show:false, tenderAddr:'', mIdx:null})}>
            <div className="contractor-modal" onClick={e => e.stopPropagation()}>
              <div className="contractor-modal__accent" style={{ background: 'var(--pink-500)' }} />
              <h2 className="contractor-modal__title" style={{ color: 'var(--pink-500)' }}>Initiate Conflict Arbitration</h2>
              <p className="contractor-modal__desc">
                Raising a conflict will trigger a decentralized arbitration process from randomized administration pools.
              </p>
              <textarea 
                className="contractor-modal__textarea" 
                rows="4"
                placeholder="State the reason for this dispute..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <div className="contractor-modal__actions">
                <button className="contractor-modal__btn contractor-modal__btn--secondary" onClick={() => setShowDisputeModal({show:false, tenderAddr:'', mIdx:null})} disabled={submitting}>
                  Cancel
                </button>
                <button className="contractor-modal__btn contractor-modal__btn--primary" style={{ background: 'var(--pink-500)' }} onClick={handleRaiseDispute} disabled={submitting || !disputeReason}>
                  {submitting ? 'Transmitting…' : 'Submit Conflict'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full-screen overlay for submission */}
        <LoadingOverlay active={submitting} context="submitting" />

      </div>
    </div>
  );
}
