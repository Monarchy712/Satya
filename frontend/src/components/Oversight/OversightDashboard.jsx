import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFactoryContract, getTenderContract, getProvider, getSigner, TENDER_STATUS } from '../../utils/contracts';
import LoadingOverlay from '../UI/LoadingOverlay';
import './OversightDashboard.css';

export default function OversightDashboard() {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
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
      
      const approvals = [];

      await Promise.all(metas.map(async (meta) => {
        const tender = getTenderContract(meta.tender, provider);
        const statusNum = await tender.tenderStatus();
        if (TENDER_STATUS[Number(statusNum)] !== 'ACTIVE') return;

        const admins = await tender.getAdmins();
        const adminArray = [admins[0], admins[1], admins[2], admins[3]];
        const myIndex = adminArray.findIndex(a => a.toLowerCase() === user.wallet.toLowerCase());
        
        if (myIndex === -1) return; // Not an admin for this tender

        const currentIdx = await tender.currentMilestone();
        const milestone = await tender.milestones(currentIdx);
        
        if (Number(milestone.status) === 1) { // UNDER_REVIEW
          // Check if already signed via backend
          const res = await fetch(`http://localhost:8000/api/committee/has-signed?tender_address=${meta.tender}&milestone_id=${currentIdx}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('satya_token')}` }
          });
          const hasSigned = await res.json();

          approvals.push({
            tender: meta.tender,
            milestoneId: Number(currentIdx),
            milestoneName: milestone.name,
            myRole: ['Engineer', 'Compliance', 'Auditor', 'Authority'][myIndex],
            hasSigned,
            progress: milestone.completionPercent.toString()
          });
        }
      }));

      setPendingApprovals(approvals);
    } catch (err) {
      console.error('Failed to load oversight data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSign(tenderAddr, milestoneId) {
    setSigning(true);
    setMessage('Recording signature...');
    try {
      const res = await fetch('http://localhost:8000/api/committee/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('satya_token')}`
        },
        body: JSON.stringify({ tender_address: tenderAddr, milestone_id: milestoneId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setMessage('✅ Signature recorded!');
      loadData();
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="oversight-view">
      {/* Signing overlay */}
      <LoadingOverlay active={signing} context="signing" variant="dark" />

      <header className="oversight-view__header">
        <h1>Oversight Committee Portal</h1>
        <div className="oversight-view__badge">Oversight Role: {user.role === 'committee' ? 'Project Auditor' : 'Specialist'}</div>
      </header>

      {loading ? (
        <LoadingOverlay active={true} context="oversight" inline={true} variant="dark" />
      ) : (
        <div className="oversight-view__container">
          <section className="oversight-view__list">
            <h2>Pending Milestone Reviews</h2>
            {pendingApprovals.length === 0 ? (
              <div className="oversight-view__empty">
                <span className="oversight-view__empty-icon">✓</span>
                <p>All clear! No milestones currently awaiting your signature for this period.</p>
              </div>
            ) : (
              pendingApprovals.map(a => (
                <div key={a.tender + a.milestoneId} className={`oversight-card ${a.hasSigned ? 'oversight-card--signed' : ''}`}>
                  <div className="oversight-card__info">
                    <h3>{a.tender.slice(0, 10)}...</h3>
                    <div className="oversight-card__milestone">
                      Milestone #{a.milestoneId + 1}: <strong>{a.milestoneName}</strong>
                    </div>
                    <div className="oversight-card__role">Your Slot: {a.myRole}</div>
                  </div>
                  
                  <div className="oversight-card__action">
                    {a.hasSigned ? (
                      <div className="oversight-card__status oversight-card__status--signed">Signature Recorded ✓</div>
                    ) : (
                      <button 
                        className="oversight-card__btn"
                        onClick={() => handleSign(a.tender, a.milestoneId)}
                        disabled={signing}
                      >
                        Sign & Approve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          <aside className="oversight-view__rules">
            <h3>Verification Checklist</h3>
            <ul>
              <li>Physical work matches reported progress ({pendingApprovals[0]?.progress || '0'}%).</li>
              <li>Photos in Ledger and ML analysis verified.</li>
              <li>No reports of non-compliance or fraud alerts.</li>
              <li>Financial audit matches disbursement schedule.</li>
            </ul>
            <p className="oversight-view__note">Note: Once 4/4 members sign, funds are automatically released to the contractor.</p>
          </aside>
        </div>
      )}

      {message && (
        <div className="oversight-view__toast" onClick={() => setMessage('')}>
          {message}
        </div>
      )}
    </div>
  );
}
