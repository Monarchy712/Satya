import { useState, useEffect } from 'react';
import { 
  getTenderContract, 
  getSigner,
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css'; // Reusing styles for consistency

export default function SignatoryDashboard() {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadPendingTasks();
  }, []);

  async function loadPendingTasks() {
    setLoading(true);
    try {
      // Fetch aggregated data
      const response = await fetch('http://localhost:8000/api/tenders/list');
      if (!response.ok) throw new Error('Failed to load tasks');
      const allTenders = await response.json();
      
      const tasks = [];
      const myAddr = user.wallet.toLowerCase();
      
      allTenders.forEach(t => {
        // Check if I am a signatory for this tender
        const signatories = [
          t.on_site_engineer?.toLowerCase(),
          t.compliance_officer?.toLowerCase(),
          t.financial_auditor?.toLowerCase(),
          t.sanctioning_authority?.toLowerCase()
        ];
        
        if (signatories.includes(myAddr)) {
          // Find milestones waiting for review (status 1)
          t.milestones.forEach((m, idx) => {
            if (m.status === 1) { // IN_PROGRESS / Waiting for Review
              tasks.push({
                tenderAddress: t.tender_address,
                milestoneIndex: idx,
                milestoneName: m.name,
                percentage: m.percentage,
                deadline: m.deadline
              });
            }
          });
        }
      });
      
      setPendingTasks(tasks);
    } catch (err) {
      console.error('[Signatory] Load error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (task) => {
    setProcessingId(`${task.tenderAddress}-${task.milestoneIndex}`);
    try {
      const signer = await getSigner();
      const tender = getTenderContract(task.tenderAddress, signer);
      
      // Multi-sig signing: evaluateMilestone as 100% completion
      // Note: In this MVP, we treat 'Approval' as 100% completion
      const tx = await tender.evaluateMilestone(BigInt(task.milestoneIndex), BigInt(100));
      await tx.wait();
      
      alert('Milestone Approved & Signature Recorded!');
      loadPendingTasks();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__container">
        <header className="admin-header">
           <div className="admin-header__info">
            <h1 className="admin-header__title">Signatory Approval Portal</h1>
            <div className="admin-header__badge" style={{background:'var(--status-ongoing-bg)', color:'var(--status-ongoing)'}}>
              <span className="admin-badge__dot" style={{background:'var(--status-ongoing)'}}></span>
              Authorized Project Signatory
            </div>
          </div>
        </header>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading__spinner" />
            <p>Scanning Ledger for Pending Authorizations...</p>
          </div>
        ) : (
          <main className="admin-dashboard__content">
             <div className="admin-form__section">
                <h3 className="admin-form__section-title">
                  <span className="admin-form__section-icon">⚖️</span> 
                  Awaiting Project Signatures
                </h3>
                
                {pendingTasks.length > 0 ? (
                  <div className="admin-ongoing__grid" style={{gridTemplateColumns:'1fr'}}>
                    {pendingTasks.map((task, i) => (
                      <div key={i} className="admin-tender-card" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                        <div>
                          <div className="admin-tender-card__header">
                             <div className="admin-tender-card__status admin-tender-card__status--bidding">WAITING FOR REVIEW</div>
                             <span className="admin-tender-card__index">Task #{i+1}</span>
                          </div>
                          <div style={{fontWeight:'700', fontSize:'1.1rem', color:'var(--gray-800)', marginBottom:'5px'}}>{task.milestoneName}</div>
                          <div className="admin-tender-card__address">{task.tenderAddress.slice(0,24)}...</div>
                          <div style={{display:'flex', gap:'20px', marginTop:'10px'}}>
                             <span style={{fontSize:'0.8rem', color:'var(--gray-500)'}}>Weight: <strong>{task.percentage}%</strong></span>
                             <span style={{fontSize:'0.8rem', color:'var(--gray-500)'}}>Deadline: <strong>{new Date(task.deadline * 1000).toLocaleDateString()}</strong></span>
                          </div>
                        </div>
                        <button 
                          className="admin-form__submit" 
                          style={{width:'auto', padding:'12px 30px', background:'var(--status-completed)'}}
                          onClick={() => handleApprove(task)}
                          disabled={processingId === `${task.tenderAddress}-${task.milestoneIndex}`}
                        >
                          {processingId === `${task.tenderAddress}-${task.milestoneIndex}` ? 'Signing...' : 'Approve Phase'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-ongoing__empty" style={{padding:'60px 0'}}>
                    <span className="admin-ongoing__empty-icon">✅</span>
                    <h3 style={{color:'var(--gray-700)'}}>Compliance Achieved</h3>
                    <p>There are no pending milestone approvals required for your wallet at this time.</p>
                  </div>
                )}
             </div>
          </main>
        )}
      </div>
    </div>
  );
}
