import { useState, useEffect } from 'react';
import { 
  getFactoryContract, 
  getTenderContract, 
  getSigner,
} from '../../utils/contracts';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now] = useState(Math.floor(Date.now() / 1000));

  // Form State
  const [formData, setFormData] = useState({
    admins: ['', '', '', ''],
    startTime: '',
    endTime: '',
    biddingEndTime: '',
    retainedPercent: '30',
    milestones: [
      { name: 'Initial Research & Logistics', percentage: '20', deadline: '' },
      { name: 'Primary Infrastructure Execution', percentage: '50', deadline: '' },
      { name: 'Final Integration & Compliance', percentage: '30', deadline: '' }
    ]
  });

  // Derived State
  const totalPercentage = formData.milestones.reduce((acc, m) => acc + (Number(m.percentage) || 0), 0);
  const isFormValid = totalPercentage === 100 && formData.admins.every(a => a.startsWith('0x'));

  // Winner Selection State
  const [selection, setSelection] = useState({
    show: false,
    tender: null,
    contractor: '',
    amount: '',
    note: ''
  });

  useEffect(() => {
    if (activeTab === 'ongoing' || activeTab === 'finalize') {
      loadTenderData();
    }
  }, [activeTab]);

  async function loadTenderData() {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/tenders/list');
      if (!response.ok) throw new Error('Failed to load aggregated tender data');
      const data = await response.json();
      setTenders(data);
    } catch (err) {
      console.error('[Admin] Sync failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTender = async (e) => {
    e.preventDefault();
    if (totalPercentage !== 100) {
      alert(`The sum of milestone percentages must equal exactly 100%. Current: ${totalPercentage}%`);
      return;
    }
    setLoading(true);
    try {
      const signer = await getSigner();
      const factory = getFactoryContract(signer);
      
      const tx = await factory.createTender(
        formData.admins,
        BigInt(Math.floor(new Date(formData.startTime).getTime() / 1000)),
        BigInt(Math.floor(new Date(formData.endTime).getTime() / 1000)),
        BigInt(Math.floor(new Date(formData.biddingEndTime).getTime() / 1000)),
        BigInt(formData.retainedPercent),
        formData.milestones.map(m => m.name),
        formData.milestones.map(m => BigInt(m.percentage)),
        formData.milestones.map(m => BigInt(Math.floor(new Date(m.deadline).getTime() / 1000)))
      );
      await tx.wait();
      alert('Tender Deployed Successfully!');
      setActiveTab('ongoing');
    } catch (err) {
      alert(`Deployment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhase = (index) => {
    if (formData.milestones.length <= 1) return; // Must have at least one phase
    const nm = formData.milestones.filter((_, i) => i !== index);
    setFormData({...formData, milestones: nm});
  };

  const handleSelectWinner = async () => {
    if (!selection.contractor || !selection.amount) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      const tender = getTenderContract(selection.tender.tender_address, signer);
      const tx = await tender.selectContractor(selection.contractor, BigInt(selection.amount));
      await tx.wait();
      alert('Contractor Finalized & Tender Activated!');
      setSelection({ show: false, tender: null, contractor: '', amount: '', note: '' });
      loadTenderData();
    } catch (err) {
      alert(`Finalization failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__container">
        <header className="admin-header">
           <div className="admin-header__info">
            <h1 className="admin-header__title">Infrastructure Governance Portal</h1>
            <div className="admin-header__badge">
              Official {user?.role === 'admin' ? 'Government Authority' : 'Oversight Officer'}
            </div>
          </div>
        </header>

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'ongoing' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('ongoing')}>
            <span className="admin-tab__icon">📁</span> Vault View
          </button>
          <button className={`admin-tab ${activeTab === 'create' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('create')}>
            <span className="admin-tab__icon">📜</span> Tender Portal
          </button>
          <button className={`admin-tab ${activeTab === 'finalize' ? 'admin-tab--active' : ''}`} onClick={() => setActiveTab('finalize')}>
            <span className="admin-tab__icon">⚖️</span> Settlement
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading__spinner"></div>
            <p>Scanning Decentralized Ledger...</p>
          </div>
        ) : (
          <main className="admin-dashboard__content">
            {activeTab === 'ongoing' && (
              <div className="admin-ongoing__grid">
                {tenders.map((t, i) => (
                  <div key={t.tender_address} className="admin-tender-card">
                    <div className="admin-tender-card__header">
                       <div className={`admin-tender-card__status admin-tender-card__status--${t.status.toLowerCase()}`}>{t.status}</div>
                       <span className="admin-tender-card__index">Asset #{i+1}</span>
                    </div>
                    <div className="admin-tender-card__address">{t.tender_address}</div>
                    <div className="admin-tender-card__meta">
                      <div className="admin-tender-card__meta-row">
                        <span className="admin-tender-card__meta-label">Active Bids</span>
                        <span className="admin-tender-card__meta-value">{t.bids.length}</span>
                      </div>
                      <div className="admin-tender-card__meta-row">
                        <span className="admin-tender-card__meta-label">Termination Date</span>
                        <span className="admin-tender-card__meta-value">{new Date(t.end_time * 1000).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {tenders.length === 0 && <div className="admin-ongoing__empty">No active assets identified on chain.</div>}
              </div>
            )}

            {activeTab === 'create' && (
              <form className="admin-form" onSubmit={handleCreateTender}>
                <div className="admin-form__section">
                  <h3 className="admin-form__section-title"><span className="admin-form__section-icon">🔐</span> Multi-Signature Activation</h3>
                  <div className="admin-form__grid">
                    {formData.admins.map((admin, idx) => (
                      <div key={idx} className="admin-form__field">
                        <label className="admin-form__label">Authority Wallet {idx+1}</label>
                        <input type="text" className="admin-form__input" placeholder="0x..." value={admin} onChange={(e) => {
                          const newAdmins = [...formData.admins];
                          newAdmins[idx] = e.target.value;
                          setFormData({...formData, admins: newAdmins});
                        }} required />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-form__section">
                  <h3 className="admin-form__section-title"><span className="admin-form__section-icon">📅</span> Temporal Constraints</h3>
                  <div className="admin-form__grid">
                    <div className="admin-form__field">
                      <label className="admin-form__label">Bidding Deadline (Cut-off)</label>
                      <input type="datetime-local" className="admin-form__input" value={formData.biddingEndTime} onChange={(e) => setFormData({...formData, biddingEndTime: e.target.value})} required />
                    </div>
                    <div className="admin-form__field">
                      <label className="admin-form__label">Execution Commencement</label>
                      <input type="datetime-local" className="admin-form__input" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required />
                    </div>
                    <div className="admin-form__field">
                      <label className="admin-form__label">Estimated Termination</label>
                      <input type="datetime-local" className="admin-form__input" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required />
                    </div>
                  </div>
                </div>

                <div className="admin-form__section">
                  <div className="admin-form__section-title">
                    <span className="admin-form__section-icon">🚧</span> Execution Roadmap
                    <div className="admin-form__pct-total">
                      <span className="admin-form__label" style={{marginRight:'10px', fontSize:'0.7rem'}}>Retention:</span>
                      <input 
                        type="number" 
                        className="admin-form__input" 
                        style={{width:'50px', padding:'2px 5px', fontSize:'0.75rem'}}
                        value={formData.retainedPercent} 
                        onChange={(e) => setFormData({...formData, retainedPercent: e.target.value})} 
                      />
                      <span style={{color:'var(--pink-700)', fontWeight:'800', marginLeft:'5px'}}>% Locked</span>
                    </div>
                  </div>

                  <div className="admin-form__milestones">
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px', padding:'0 16px', fontSize:'0.7rem', fontWeight:'700', color:'var(--gray-400)'}}>
                       <span style={{flex: 2}}>PHASE DESCRIPTION</span>
                       <span style={{width: '70px', textAlign:'center'}}>ALLOCATION %</span>
                       <span style={{flex: 1.5}}>ESTIMATED DEADLINE</span>
                       <span style={{width: '30px'}}></span>
                    </div>
                    {formData.milestones.map((m, idx) => (
                      <div key={idx} className="admin-form__milestone-row">
                        <span className="admin-form__milestone-num">0{idx+1}</span>
                        <input type="text" placeholder="Phase Deliverable" className="admin-form__input admin-form__input--name" value={m.name} onChange={e => {
                          const nm = [...formData.milestones];
                          nm[idx].name = e.target.value;
                          setFormData({...formData, milestones: nm});
                        }} required />
                        <input type="number" placeholder="%" className="admin-form__input admin-form__input--pct" value={m.percentage} onChange={e => {
                          const nm = [...formData.milestones];
                          nm[idx].percentage = e.target.value;
                          setFormData({...formData, milestones: nm});
                        }} required />
                        <input type="datetime-local" className="admin-form__input admin-form__input--date" value={m.deadline} onChange={e => {
                          const nm = [...formData.milestones];
                          nm[idx].deadline = e.target.value;
                          setFormData({...formData, milestones: nm});
                        }} required />
                        <button type="button" className="admin-form__remove" onClick={() => handleRemovePhase(idx)} style={{background:'none', border:'none', cursor:'pointer', color:'var(--pink-500)', fontSize:'1.2rem'}} title="Remove Phase">×</button>
                      </div>
                    ))}
                    
                    <div className="admin-form__pct-summary" style={{
                      display:'flex', 
                      justifyContent:'space-between', 
                      alignItems:'center',
                      background: totalPercentage === 100 ? 'var(--status-completed-bg)' : 'var(--status-pending-bg)',
                      padding:'12px 20px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px dashed ${totalPercentage === 100 ? 'var(--status-completed)' : 'var(--status-pending)'}`
                    }}>
                       <span style={{fontFamily:'var(--font-mono)', fontSize:'0.8rem', color: totalPercentage === 100 ? 'var(--status-completed)' : 'var(--status-pending)'}}>
                         {totalPercentage === 100 ? '✓ Milestone allocation verified (100%)' : `⚠ Total allocation must equal 100% (Current: ${totalPercentage}%)`}
                       </span>
                       <button type="button" className="admin-header__back" onClick={() => setFormData({...formData, milestones: [...formData.milestones, {name:'', percentage:'', deadline:''}]})}>
                        + Add Phase
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="admin-form__submit" disabled={!isFormValid}>
                   {totalPercentage !== 100 ? 'Awaiting Allocation Balance' : 'Authorize Contract Deployment'}
                </button>
              </form>
            )}

            {activeTab === 'finalize' && (
              <div className="admin-ongoing">
                <div className="admin-ongoing__header">
                   <h3 className="admin-ongoing__title">PROJECTS AWAITING SETTLEMENT</h3>
                </div>
                <div className="admin-ongoing__grid">
                  {tenders.filter(t => t.status === 'BIDDING' && now >= Number(t.bidding_end_time)).map((t, n) => (
                    <div key={t.tender_address} className="admin-tender-card">
                      <div className="admin-tender-card__header">
                        <div className="admin-tender-card__status admin-tender-card__status--bidding">SEALED</div>
                        <span className="admin-tender-card__index">Ready for Finalization</span>
                      </div>
                      <div className="admin-tender-card__address">{t.tender_address}</div>
                      <div className="admin-tender-card__meta">
                        <div className="admin-tender-card__meta-row">
                          <span className="admin-tender-card__meta-label">Bids Received</span>
                          <span className="admin-tender-card__meta-value">{t.bids.length}</span>
                        </div>
                      </div>
                      <button className="admin-denied__btn" style={{width:'100%', marginTop:'15px'}} onClick={() => setSelection({ ...selection, show: true, tender: t })}>
                        Open Envelopes & Settle
                      </button>
                    </div>
                  ))}
                </div>
                {tenders.filter(t => t.status === 'BIDDING' && now >= Number(t.bidding_end_time)).length === 0 && (
                   <div className="admin-ongoing__empty">No projects currently require finalization.</div>
                )}
              </div>
            )}
          </main>
        )}

        {selection.show && (
          <div className="admin-modal">
            <div className="admin-modal__content">
              <h3>Arbitration & Winning Bid Selection</h3>
              <p style={{fontSize:'0.8rem', color:'var(--gray-500)', marginBottom:'20px'}}>Evaluating bids for asset: {selection.tender.tender_address}</p>
              
              <div className="admin-form__field">
                <label className="admin-form__label">Protocol Verified Top 3 (Lowest Bids)</label>
                <select className="admin-form__input" value={selection.contractor} onChange={(e) => {
                  const b = selection.tender.bids.find(bid => bid.bidder === e.target.value);
                  setSelection({...selection, contractor: e.target.value, amount: b ? b.amount : ''});
                }}>
                  <option value="">Select Candidate...</option>
                  {[...selection.tender.bids].sort((a,b) => Number(a.amount) - Number(b.amount)).slice(0,3).map(b => (
                    <option key={b.bidder} value={b.bidder}>{b.bidder.slice(0,18)}... ({b.amount} Wei)</option>
                  ))}
                </select>
              </div>

              <div className="admin-form__field" style={{marginTop:'15px'}}>
                <label className="admin-form__label">Selection Justification</label>
                <textarea placeholder="Provide reasoning for public oversight..." className="admin-form__input" rows="3" value={selection.note} onChange={(e) => setSelection({...selection, note: e.target.value})}></textarea>
              </div>

              <div className="admin-modal__actions">
                <button className="admin-header__back" onClick={() => setSelection({...selection, show: false})}>Abort</button>
                <button className="admin-denied__btn" onClick={handleSelectWinner}>Authorize Activation</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
