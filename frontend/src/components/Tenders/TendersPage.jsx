import { useState, useEffect } from 'react';
import { 
  getTenderContract, 
  getSigner, 
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import LoadingOverlay from '../UI/LoadingOverlay';
import './TendersPage.css';

export default function TendersPage() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTender, setExpandedTender] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  
  // -- Sync Status --
  const [syncStatus, setSyncStatus] = useState('FETCHING...');

  useEffect(() => {
    loadTenders();
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadTenders() {
    setLoading(true);
    setSyncStatus('Fetching from Blockchain...');
    try {
      const response = await fetch('http://localhost:8000/api/tenders/list');
      if (!response.ok) throw new Error('Backend aggregation failed');
      const data = await response.json();
      
      setTenders(data.map(t => ({
        address: t.tender_address,
        status: t.status,
        biddingEndTime: Number(t.bidding_end_time),
        bidCount: t.bids.length,
        bids: t.bids
      })));
      
      setSyncStatus(`Synced ${data.length} Assets`);
    } catch (err) {
      console.error('[Satya] Sync error:', err);
      setSyncStatus('Sync Error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaceBid(tenderAddr) {
    if (!bidAmount) return;
    
    // Safety check for expiration before signing
    const tenderData = tenders.find(t => t.address === tenderAddr);
    if (tenderData && now >= tenderData.biddingEndTime) {
      setTxStatus('❌ Bidding window has closed.');
      return;
    }

    setBidding(true);
    setTxStatus('Awaiting Signature...');
    try {
      const signer = await getSigner();
      const tender = getTenderContract(tenderAddr, signer);
      
      // Submit bid to blockchain
      const tx = await tender.placeBid(BigInt(bidAmount));
      setTxStatus('🚀 Transaction sent! Waiting for confirmation...');
      await tx.wait();
      
      setTxStatus('✅ Bid successfully recorded on-chain!');
      setBidAmount('');
      loadTenders();
    } catch (err) {
      console.error('[Tenders] Bid error:', err);
      // More user-friendly revert messages
      let msg = err.message;
      if (msg.includes('reverted')) msg = 'Execution reverted (Check if already bid or deadline passed)';
      setTxStatus(`❌ Failed: ${msg}`);
    } finally {
      setBidding(false);
    }
  }

  // --- Sorting & Categorization ---
  const activeTenders = tenders.filter(t => t.status === 'BIDDING' && now < t.biddingEndTime);
  const expiredTenders = tenders.filter(t => t.status === 'BIDDING' && now >= t.biddingEndTime);
  const otherTenders = tenders.filter(t => t.status !== 'BIDDING');

  const renderTenderCard = (t, i, type = 'active') => {
    const isBiddingActive = type === 'active';
    const isAwaitingSelection = type === 'expired';
    const isContractor = user?.role?.toLowerCase() === 'contractor';
    
    return (
      <div key={t.address} className={`tenders-card ${isAwaitingSelection ? 'tenders-card--expired' : ''}`} onClick={() => setExpandedTender(expandedTender === t.address ? null : t.address)}>
        <div className="tenders-card__main">
          <div className="tenders-card__left">
             <div className="tenders-card__top">
                {isBiddingActive ? (
                  <span className="tenders-card__status tenders-card__status--bidding">Bidding Open</span>
                ) : isAwaitingSelection ? (
                  <span className="tenders-card__status tenders-card__status--pending">Selection Pending</span>
                ) : (
                  <span className={`tenders-card__status tenders-card__status--${t.status?.toLowerCase()}`}>{t.status}</span>
                )}
                <span className="tenders-card__id">Asset #{i+1}</span>
             </div>
             <p className="tenders-card__address">{t.address}</p>
          </div>
          <div className="tenders-card__right">
             <div className="tenders-card__bid-count">
                <span className="tenders-card__bid-number">{t.bidCount}</span>
                <span className="tenders-card__bid-text">Bids</span>
             </div>
          </div>
        </div>
        
        {expandedTender === t.address && (
          <div className="tenders-card__details" onClick={e => e.stopPropagation()}>
             <div className="tenders-card__info-row" style={{marginBottom:'15px', color: isAwaitingSelection ? 'var(--pink-700)' : 'inherit'}}>
               <span>{isAwaitingSelection ? 'Bidding Closed At:' : 'Deadline:'} <strong>{new Date(t.biddingEndTime * 1000).toLocaleString()}</strong></span>
             </div>

             <div className="tenders-card__cta">
               {isBiddingActive && isContractor ? (
                 <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <div style={{display:'flex', gap:'10px'}}>
                      <input 
                        type="number" 
                        className="admin-form__input"
                        style={{flex:1}}
                        value={bidAmount} 
                        onChange={e => setBidAmount(e.target.value)} 
                        placeholder="Enter bid amount (Wei)" 
                      />
                      <button 
                        className="admin-header__back" 
                        style={{background:'var(--pink-600)', color:'white', border:'none', padding:'0 20px'}}
                        onClick={() => handlePlaceBid(t.address)} 
                        disabled={bidding}
                      >
                        {bidding ? 'Signing...' : 'Submit Bid'}
                      </button>
                    </div>
                    {txStatus && <p style={{fontSize:'0.8rem', color:'var(--pink-700)', fontWeight:'500'}}>{txStatus}</p>}
                 </div>
               ) : (
                 <div style={{padding:'15px', background: isAwaitingSelection ? 'var(--pink-50)' : 'var(--gray-50)', borderRadius:'4px', border: isAwaitingSelection ? '1px solid var(--pink-200)' : 'none'}}>
                    <p style={{fontSize:'0.85rem', color: isAwaitingSelection ? 'var(--pink-700)' : 'var(--gray-500)', fontWeight:'500'}}>
                       {isBiddingActive 
                         ? `Read-only for ${user?.role || 'Guest'}. Contractors only.` 
                         : isAwaitingSelection 
                         ? `Bidding time has expired. This infrastructure project is now under administrative evaluation for selection.`
                         : `This project is now ${t.status}.`}
                    </p>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tenders-page">
      <div className="tenders-page__container">
        <header className="tenders-page__header">
          <div>
            <h1 className="tenders-page__title">Industrial Tenders Marketplace</h1>
            <p className="tenders-page__subtitle">Blockchain Sync: <strong>{syncStatus}</strong></p>
          </div>
          <button className="tenders-page__refresh" onClick={loadTenders} disabled={loading}>
            {loading ? 'Refreshing...' : '↻ Re-Sync Chain'}
          </button>
        </header>

        {loading ? (
          <LoadingOverlay active={true} context="tenders" inline={true} />
        ) : (
          <div className="tenders-page__list">
            
            {activeTenders.length > 0 && (
               <div className="tenders-section">
                  <h2 className="tenders-section__title">LIVE FOR BIDDING</h2>
                  <div className="tenders-section__grid">
                    {activeTenders.map((t, i) => renderTenderCard(t, i, 'active'))}
                  </div>
               </div>
            )}

            {expiredTenders.length > 0 && (
               <div className="tenders-section" style={{marginTop:'40px'}}>
                  <h2 className="tenders-section__title" style={{color:'var(--pink-700)', borderColor:'var(--pink-300)'}}>AWAITING ARBITRATION</h2>
                  <div className="tenders-section__grid tenders-section__grid--expired">
                    {expiredTenders.map((t, i) => renderTenderCard(t, i, 'expired'))}
                  </div>
               </div>
            )}

            {otherTenders.length > 0 && (
               <div className="tenders-section" style={{marginTop:'40px'}}>
                  <h2 className="tenders-section__title" style={{color:'var(--gray-400)', borderColor:'var(--gray-200)'}}>ARCHIVED ASSETS</h2>
                  <div className="tenders-section__grid tenders-section__grid--archived">
                    {otherTenders.map((t, i) => renderTenderCard(t, i, 'other'))}
                  </div>
               </div>
            )}

            {tenders.length === 0 && (
              <div className="tenders-page__empty">
                <span className="tenders-page__empty-icon">📁</span>
                <h3>No Ledger Data</h3>
                <p>The platform is online but no infrastructure projects were identified locally.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
