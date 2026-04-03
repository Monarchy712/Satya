import { useState, useEffect } from 'react';
import { 
  getTenderContract, 
  getSigner,
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import LoadingOverlay from '../UI/LoadingOverlay';
import './AdminDashboard.css'; // Reusing styles for consistency

export default function SignatoryDashboard() {
  const { user, token } = useAuth();
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
      
      // Parallel status checks for each milestone
      const taskPromises = [];

      allTenders.forEach(t => {
        const signatories = [
          t.on_site_engineer?.toLowerCase(),
          t.compliance_officer?.toLowerCase(),
          t.financial_auditor?.toLowerCase(),
          t.sanctioning_authority?.toLowerCase()
        ];
        
        if (signatories.includes(myAddr)) {
          t.milestones.forEach((m, idx) => {
            if (m.status === 1) { // UNDER_REVIEW
              const checkSigned = async () => {
                const res = await fetch(`http://localhost:8000/api/committee/has-signed?tender_address=${t.tender_address}&milestone_id=${idx}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const alreadySignedDB = res.ok ? await res.json() : false;
                
                return {
                  tenderAddress: t.tender_address,
                  milestoneIndex: idx,
                  milestoneName: m.name,
                  percentage: m.percentage,
                  deadline: m.deadline,
                  signaturesCollected: m.signatures_collected || 0,
                  alreadySigned: alreadySignedDB,
                  isExecuted: m.is_executed
                };
              };
              taskPromises.push(checkSigned());
            }
          });
        }
      });
      
      const finalTasks = await Promise.all(taskPromises);
      setPendingTasks(finalTasks);
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
      
      // 1. Sign EIP-712 typed data via MetaMask
      // Helper: signMilestoneApproval(signer, tenderAddress, milestoneId) from contracts.js
      const { signMilestoneApproval } = await import('../../utils/contracts');
      const signature = await signMilestoneApproval(signer, task.tenderAddress, task.milestoneIndex);
      
      // 2. Submit signature to Backend for collection
      const response = await fetch('http://localhost:8000/api/committee/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          tender_address: task.tenderAddress,
          milestone_id: task.milestoneIndex,
          signature: signature
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Backend failed to record signature');
      }

      const result = await response.json();
      
      if (result.executed) {
        alert('All 4 signatures collected! Milestone executed on-chain! 🎉');
      } else {
        alert(`Signature Recorded Successfully! (${result.count}/4)`);
      }
      
      loadPendingTasks();
    } catch (err) {
      console.error('[Signatory] Approval Error:', err);
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

        <LoadingOverlay active={!!processingId} context="signing" />

        {loading ? (
          <LoadingOverlay active={true} context="oversight" inline={true} />
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
                      <div key={i} className="admin-tender-card" style={{display:'flex', alignItems:'center', justifyContent:'space-between', opacity: task.alreadySigned ? 0.7 : 1}}>
                        <div>
                          <div className="admin-tender-card__header">
                             <div className={`admin-tender-card__status admin-tender-card__status--${task.alreadySigned ? 'completed' : 'pending'}`}>
                               {task.alreadySigned ? '✓ SIGNED' : 'WAITING FOR REVIEW'}
                             </div>
                             <span className="admin-tender-card__index">Approvals: <strong>{task.signaturesCollected}/4</strong></span>
                          </div>
                          <div style={{fontWeight:'700', fontSize:'1.1rem', color:'var(--gray-800)', marginBottom:'10px'}}>{task.milestoneName}</div>
                          
                          <div className="admin-tender-card__asset-info" style={{justifyContent: 'flex-start', margin: '5px 0'}}>
                            <div className="admin-tender-card__info-btn">
                              i
                              <span className="admin-tender-card__tooltip">{task.tenderAddress}</span>
                            </div>
                          </div>

                          <div style={{display:'flex', gap:'20px', marginTop:'15px'}}>
                             <span style={{fontSize:'0.75rem', color:'var(--gray-500)'}}>Phase Weight: <strong>{task.percentage}%</strong></span>
                             <span style={{fontSize:'0.75rem', color:'var(--gray-500)'}}>Due: <strong>{new Date(task.deadline * 1000).toLocaleDateString()}</strong></span>
                          </div>
                        </div>
                        
                        <div style={{textAlign: 'right'}}>
                          <button 
                            className="admin-form__submit" 
                            style={{
                              width:'auto', 
                              padding:'12px 30px', 
                              background: task.alreadySigned ? 'var(--gray-200)' : 'var(--status-completed)',
                              color: task.alreadySigned ? 'var(--gray-500)' : 'white'
                            }}
                            onClick={() => handleApprove(task)}
                            disabled={task.alreadySigned || processingId === `${task.tenderAddress}-${task.milestoneIndex}`}
                          >
                            {processingId === `${task.tenderAddress}-${task.milestoneIndex}` ? 'Signing...' : task.alreadySigned ? 'Approved' : 'Sign & Approve'}
                          </button>
                          {task.alreadySigned && <p style={{fontSize:'0.65rem', color:'var(--status-completed)', marginTop:'5px', fontWeight:'600'}}>Awaiting remaining committee members</p>}
                        </div>
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
