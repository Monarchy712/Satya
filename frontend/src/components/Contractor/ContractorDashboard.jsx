import { useState, useEffect } from 'react';
import { 
  getTenderContract, 
  getSigner,
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import './ContractorDashboard.css';

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [myBids, setMyBids] = useState([]);
  const [myContracts, setMyContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [now] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    loadContractorData();
  }, []);

  async function loadContractorData() {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/tenders/list');
      if (!response.ok) throw new Error('Failed to load contractor data');
      const allTenders = await response.json();
      
      const myAddress = user.wallet.toLowerCase();
      
      // Filter for Bids vs Won Contracts
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

  const handleSubmitMilestone = async (tenderAddr, mIdx) => {
    setSubmittingId(`${tenderAddr}-${mIdx}`);
    try {
      const signer = await getSigner();
      const tender = getTenderContract(tenderAddr, signer);
      const tx = await tender.submitWorkForReview(BigInt(mIdx));
      await tx.wait();
      alert('Proof of Work Submitted! Signatories will be notified.');
      loadContractorData();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="contractor-dashboard">
      <div className="contractor-dashboard__container">
        <header className="contractor-header">
           <div>
             <h1 className="contractor-header__title">Industrial Contractor Workspace</h1>
             <p className="contractor-header__subtitle">Managing {myContracts.length} Registered State Contracts</p>
           </div>
        </header>

        {loading ? (
          <div className="app__loading-screen">
             <div className="app__spinner" />
             <p>Scanning Ledger Hub for Your Assets...</p>
          </div>
        ) : (
          <div className="contractor-dashboard__grid">
            
            {/* Section: Active Projects */}
            <section className="contractor-section">
              <h2 className="contractor-section__title">Won Projects & Execution</h2>
              {myContracts.length > 0 ? (
                <div className="contractor-contracts-list">
                  {myContracts.map(t => (
                    <div key={t.tender_address} className="contractor-card contractor-card--active">
                       <div className="contractor-card__header">
                          <div className={`contractor-card__tag contractor-card__tag--${t.status.toLowerCase()}`}>{t.status}</div>
                          <span className="contractor-card__addr">{t.tender_address.slice(0,20)}...</span>
                       </div>
                       
                       <div className="contractor-milestones">
                          {t.milestones.map((m, idx) => {
                            const isPending = m.status === 0;
                            const isSubmitted = m.status === 1;
                            const isCompleted = m.status === 2;
                            const hasTime = now < m.deadline;

                            return (
                              <div key={idx} className="contractor-milestone-row">
                                 <div className="contractor-milestone-info">
                                    <span className={`contractor-milestone-status contractor-milestone-status--${m.status === 2 ? 'done' : m.status === 1 ? 'wait' : 'todo'}`}>
                                      {m.status === 2 ? '✓' : m.status === 1 ? '…' : '○'}
                                    </span>
                                    <div style={{display:'flex', flexDirection:'column'}}>
                                       <strong>{m.name}</strong>
                                       <span style={{fontSize:'0.7rem', color:'var(--gray-500)'}}>Weight: {m.percentage}% | Due: {new Date(m.deadline * 1000).toLocaleDateString()}</span>
                                    </div>
                                 </div>
                                 
                                 {isPending && hasTime && (
                                   <button 
                                     className="contractor-milestone-btn" 
                                     disabled={submittingId === `${t.tender_address}-${idx}`}
                                     onClick={() => handleSubmitMilestone(t.tender_address, idx)}
                                   >
                                     Request Approval
                                   </button>
                                 )}
                                 {isSubmitted && <span className="contractor-milestone-indicator">Awaiting Signature</span>}
                                 {isCompleted && <span className="contractor-milestone-indicator" style={{color:'var(--status-completed)'}}>Compliant</span>}
                                 {isPending && !hasTime && <span className="contractor-milestone-indicator" style={{color:'var(--pink-600)'}}>Delayed</span>}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="contractor-empty">No active contracts assigned to this wallet. Visit Tenders to bid!</div>
              )}
            </section>

            {/* Section: My Bids Status */}
            <section className="contractor-section">
               <h2 className="contractor-section__title">Bid Envelope Status</h2>
               <div className="contractor-bids-list">
                 {myBids.map(t => {
                   const myBid = t.bids.find(b => b.bidder.toLowerCase() === user.wallet.toLowerCase());
                   const isWinning = t.contractor.toLowerCase() === user.wallet.toLowerCase();
                   
                   return (
                     <div key={t.tender_address} className="contractor-bid-item">
                        <div className="contractor-bid-info">
                           <strong>Asset: {t.tender_address.slice(0,10)}...</strong>
                           <span>Amount: <strong>{myBid?.amount} Wei</strong></span>
                        </div>
                        <div className={`contractor-bid-badge contractor-bid-badge--${isWinning ? 'won' : t.status === 'BIDDING' ? 'pending' : 'lost'}`}>
                          {isWinning ? 'WON' : t.status === 'BIDDING' ? 'PENDING' : 'LOST'}
                        </div>
                     </div>
                   );
                 })}
                 {myBids.length === 0 && <div className="contractor-empty">You haven't placed any bids yet.</div>}
               </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
