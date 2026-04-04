import { useState, useEffect } from 'react';
import { 
  getTenderContract, 
  getSigner,
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import LoadingOverlay from '../UI/LoadingOverlay';
import LoadingSpinner from '../UI/LoadingSpinner';
import './SignatoryDashboard.css';

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
      const response = await fetch('http://localhost:8000/api/tenders/list');
      if (!response.ok) throw new Error('Failed to load tasks');
      const allTenders = await response.json();
      
      const taskPromises = [];
      const myAddr = user.wallet.toLowerCase();
      
      allTenders.forEach(t => {
        const signatories = [
          t.on_site_engineer?.toLowerCase(),
          t.compliance_officer?.toLowerCase(),
          t.financial_auditor?.toLowerCase(),
          t.sanctioning_authority?.toLowerCase()
        ];
        
        if (signatories.includes(myAddr)) {
          // Identify user's specific role for this project
          const roleMap = {
            [t.on_site_engineer?.toLowerCase()]: 'On-Site Engineer',
            [t.compliance_officer?.toLowerCase()]: 'Compliance Officer',
            [t.financial_auditor?.toLowerCase()]: 'Financial Auditor',
            [t.sanctioning_authority?.toLowerCase()]: 'Sanctioning Authority'
          };
          const myRole = roleMap[myAddr];

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
                  isExecuted: m.is_executed,
                  myRole: myRole
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
    const taskKey = `${task.tenderAddress}-${task.milestoneIndex}`;
    setProcessingId(taskKey);
    try {
      const signer = await getSigner();
      const { signMilestoneApproval } = await import('../../utils/contracts');
      const signature = await signMilestoneApproval(signer, task.tenderAddress, task.milestoneIndex);
      
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
      
      await loadPendingTasks();
    } catch (err) {
      console.error('[Signatory] Approval Error:', err);
      alert(`Approval failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="signatory-portal">
      <div className="signatory-container">
        
        <header className="signatory-header">
          <div className="signatory-header__left">
            <h1 className="signatory-header__title">Verification & Approval</h1>
            <div className="signatory-header__subtitle">
              <span className="signatory-header__dot" />
              Infrastructure Governance Node
            </div>
          </div>
          <button 
            className="signatory-header__refresh" 
            onClick={loadPendingTasks}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="14px" label="Syncing..." /> : '↻ Refresh Pipeline'}
          </button>
        </header>

        <LoadingOverlay active={!!processingId} context="signing" />

        <main className="signatory-main">
          {loading ? (
            <LoadingOverlay active={true} context="signatory" inline={true} />
          ) : (
            <div className="signatory-grid">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task, i) => {
                  const isProcessing = processingId === `${task.tenderAddress}-${task.milestoneIndex}`;
                  const sigCount = task.signaturesCollected;
                  const progressPct = (sigCount / 4) * 100;

                  return (
                    <div 
                      key={i} 
                      className={`milestone-card ${task.alreadySigned ? 'milestone-card--signed' : ''}`}
                    >
                      <div className="milestone-card__main">
                        <div className="milestone-card__header">
                          <div className={`milestone-card__badge ${task.alreadySigned ? 'milestone-card__badge--completed' : 'milestone-card__badge--pending'}`}>
                            {task.alreadySigned ? '✓ Signed' : 'Pending Review'}
                          </div>
                          <div className="info-tool">
                            i
                            <span className="info-tool__tip">{task.tenderAddress}</span>
                          </div>
                        </div>

                        <h3 className="milestone-card__name">{task.milestoneName}</h3>

                        <div className="milestone-card__details">
                          <div className="milestone-card__stat">
                            <span className="milestone-card__label">Signatory Role</span>
                            <span className="milestone-card__value milestone-card__value--highlight">{task.myRole}</span>
                          </div>
                          <div className="milestone-card__stat">
                            <span className="milestone-card__label">Project Weight</span>
                            <span className="milestone-card__value">{task.percentage}%</span>
                          </div>
                          <div className="milestone-card__stat">
                            <span className="milestone-card__label">Deadline</span>
                            <span className="milestone-card__value">{new Date(task.deadline * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="milestone-card__progress-container">
                          <div className="milestone-card__progress-info">
                            <span>Quorum Status</span>
                            <span>{sigCount}/4 Signatures</span>
                          </div>
                          <div className="milestone-card__track">
                            <div className="milestone-card__fill" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="milestone-card__actions">
                        <button 
                          className={`signatory-btn ${task.alreadySigned ? 'signatory-btn--completed' : 'signatory-btn--primary'}`}
                          onClick={() => handleApprove(task)}
                          disabled={task.alreadySigned || isProcessing}
                        >
                          {isProcessing ? (
                            <LoadingSpinner size="16px" color="white" label="Signing..." />
                          ) : task.alreadySigned ? (
                            'Approved'
                          ) : (
                            'Sign & Authorize'
                          )}
                        </button>
                        {task.alreadySigned && (
                          <p className="milestone-card__hint">
                            Awaiting consensus...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="signatory-empty">
                  <span className="signatory-empty__icon">🛡️</span>
                  <h3>Compliance Reached</h3>
                  <p>All infrastructure projects associated with your wallet are currently synchronized and approved.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

  );
}
