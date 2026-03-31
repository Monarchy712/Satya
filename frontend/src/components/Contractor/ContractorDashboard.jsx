import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFactoryContract, getTenderContract, getProvider, getSigner, TENDER_STATUS } from '../../utils/contracts';
import './ContractorDashboard.css';

export default function ContractorDashboard() {
  const { user } = useAuth();
  const [myContracts, setMyContracts] = useState([]);
  const [biddingTenders, setBiddingTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.wallet) return;
    setLoading(true);
    try {
      const provider = getProvider();
      const factory = getFactoryContract(provider);
      const metas = await factory.getAllTenders();
      
      const won = [];
      const bidding = [];

      await Promise.all(metas.map(async (meta) => {
        const tender = getTenderContract(meta.tender, provider);
        const statusNum = await tender.tenderStatus();
        const status = TENDER_STATUS[Number(statusNum)];
        const contractorAddr = await tender.contractor();
        
        const isMe = contractorAddr.toLowerCase() === user.wallet.toLowerCase();
        
        if (isMe && status !== 'BIDDING') {
          const currentIdx = await tender.currentMilestone();
          won.push({
            address: meta.tender,
            status,
            currentMilestone: Number(currentIdx),
            startTime: Number(meta.startTime),
            endTime: Number(meta.endTime)
          });
        } else if (status === 'BIDDING') {
          const hasBid = await tender.hasBid(user.wallet);
          const bids = await tender.getAllBids();
          // Find my bid if it exists
          const myBid = bids.find(b => b.bidder.toLowerCase() === user.wallet.toLowerCase());
          
          bidding.push({
            address: meta.tender,
            hasBid,
            myBid: myBid ? myBid.amount.toString() : null,
            bidCount: bids.length,
            endTime: Number(meta.biddingEndTime)
          });
        }
      }));

      setMyContracts(won);
      setBiddingTenders(bidding);
    } catch (err) {
      console.error('Failed to load contractor data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyMilestone(tenderAddr, milestoneId) {
    setActionLoading(true);
    setMessage('Submitting work for review...');
    try {
      const signer = await getSigner();
      const tender = getTenderContract(tenderAddr, signer);
      // Note: In our current Tender.sol, submitWorkForReview is onlyGovernment.
      // We will relay this via the backend if needed, or if the contract was updated.
      // For now, let's assume the backend handles the coordination.
      
      const res = await fetch('http://localhost:8000/api/contractor/apply-milestone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('satya_token')}`
        },
        body: JSON.stringify({ tender_address: tenderAddr, milestone_id: milestoneId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setMessage('✅ Milestone submitted for review!');
      loadData();
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div className="contractor-view__loading">Loading Workspace...</div>;

  return (
    <div className="contractor-view">
      <header className="contractor-view__header">
        <h1>Contractor Portal</h1>
        <div className="contractor-view__badge">Verified Partner</div>
      </header>

      <section className="contractor-view__section">
        <h2>Active Project & Milestones</h2>
        {myContracts.length === 0 ? (
          <p className="contractor-view__empty">No active projects assigned yet.</p>
        ) : (
          <div className="contractor-view__grid">
            {myContracts.map(c => (
              <div key={c.address} className="contractor-card">
                <h3>Project {c.address.slice(0, 8)}...</h3>
                <div className="contractor-card__status">{c.status}</div>
                <div className="contractor-card__meta">
                  <span>Current Milestone: #{c.currentMilestone + 1}</span>
                </div>
                <button 
                  className="contractor-card__btn"
                  onClick={() => handleApplyMilestone(c.address, c.currentMilestone)}
                  disabled={actionLoading}
                >
                  Apply for Milestone Review
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="contractor-view__section">
        <h2>Open Bids</h2>
        <div className="contractor-view__grid">
          {biddingTenders.map(t => (
            <div key={t.address} className="contractor-card contractor-card--bidding">
              <h3>Tender {t.address.slice(0, 8)}...</h3>
              <div className="contractor-card__meta">
                <span>Ends: {new Date(t.endTime * 1000).toLocaleDateString()}</span>
                <span>Total Bids: {t.bidCount}</span>
              </div>
              {t.hasBid ? (
                <div className="contractor-card__bid-status">
                  Your Bid: ₹{t.myBid} (Placed)
                </div>
              ) : (
                <button className="contractor-card__btn contractor-card__btn--alt" onClick={() => window.location.href='/tenders'}>
                  Place Bid
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {message && <div className="contractor-view__toast">{message}</div>}
    </div>
  );
}
