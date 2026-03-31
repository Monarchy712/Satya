import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getFactoryContract, getTenderContract, getProvider, getSigner, TENDER_STATUS, FACTORY_ADDRESS } from '../../utils/contracts';
import './AdminDashboard.css';

const TABS = { CREATE: 'create', ONGOING: 'ongoing' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(TABS.CREATE);
  const [isGov, setIsGov] = useState(null); // null = loading, true/false = result
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [error, setError] = useState('');

  // ── Create Tender Form State ──
  const [admins, setAdmins] = useState(['', '', '', '']);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [biddingEndTime, setBiddingEndTime] = useState('');
  const [phaseCount, setPhaseCount] = useState(2);
  const [milestones, setMilestones] = useState([
    { name: '', percentage: '', deadline: '' },
    { name: '', percentage: '', deadline: '' },
  ]);

  // ── Ongoing Tenders State ──
  const [tenders, setTenders] = useState([]);
  const [tendersLoading, setTendersLoading] = useState(false);

  const adminLabels = ['On-Site Engineer', 'Compliance Officer', 'Financial Auditor', 'Sanctioning Authority'];

  // ── Access Control: check access_level 0 + isGovernment on-chain ──
  useEffect(() => {
    if (!user || user.access_level !== 0) {
      navigate('/');
      return;
    }

    async function checkGov() {
      try {
        const provider = getProvider();
        const factory = getFactoryContract(provider);
        if (!user.wallet) { setIsGov(false); return; }
        
        // Ensure address is properly checksummed for ethers v6
        const checksummedWallet = ethers.getAddress(user.wallet);
        
        const result = await factory.isGovernment(checksummedWallet);
        setIsGov(result);
      } catch (err) {
        console.error('isGovernment check failed:', err);
        setIsGov(false);
      }
    }
    checkGov();
  }, [user, navigate]);

  // ── Load tenders when switching to ongoing tab ──
  useEffect(() => {
    if (activeTab === TABS.ONGOING) loadTenders();
  }, [activeTab]);

  async function loadTenders() {
    setTendersLoading(true);
    try {
      const provider = getProvider();
      const factory = getFactoryContract(provider);
      const metas = await factory.getAllTenders();

      const enriched = await Promise.all(
        metas.map(async (meta) => {
          try {
            const tender = getTenderContract(meta.tender, provider);
            const statusNum = await tender.tenderStatus();
            const bids = await tender.getAllBids();
            const contractor = await tender.contractor();
            const winBid = await tender.winningBid();
            return {
              address: meta.tender,
              startTime: Number(meta.startTime),
              endTime: Number(meta.endTime),
              biddingEndTime: Number(meta.biddingEndTime),
              status: TENDER_STATUS[Number(statusNum)] || 'UNKNOWN',
              bidCount: bids.length,
              contractor,
              winningBid: winBid.toString(),
            };
          } catch {
            return {
              address: meta.tender,
              startTime: Number(meta.startTime),
              endTime: Number(meta.endTime),
              biddingEndTime: Number(meta.biddingEndTime),
              status: 'ERROR',
              bidCount: 0,
              contractor: '0x0',
              winningBid: '0',
            };
          }
        })
      );

      setTenders(enriched);
    } catch (err) {
      console.error('Failed to load tenders:', err);
    } finally {
      setTendersLoading(false);
    }
  }

  // ── Dynamic milestone rows ──
  function handlePhaseCountChange(count) {
    const n = Math.max(1, Math.min(10, parseInt(count) || 1));
    setPhaseCount(n);
    const newMilestones = Array.from({ length: n }, (_, i) =>
      milestones[i] || { name: '', percentage: '', deadline: '' }
    );
    setMilestones(newMilestones);
  }

  function updateMilestone(index, field, value) {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  }

  function updateAdmin(index, value) {
    const updated = [...admins];
    updated[index] = value;
    setAdmins(updated);
  }

  // ── Submit Tender ──
  async function handleCreateTender(e) {
    e.preventDefault();
    setError('');
    setTxStatus('');

    // Validate percentages sum to 100
    const totalPct = milestones.reduce((sum, m) => sum + (parseInt(m.percentage) || 0), 0);
    if (totalPct !== 100) {
      setError(`Milestone percentages must sum to 100. Current total: ${totalPct}`);
      return;
    }

    // Validate all admins filled
    if (admins.some(a => !a || !a.startsWith('0x'))) {
      setError('All 4 admin wallet addresses are required (0x...)');
      return;
    }

    // Validate times
    const start = Math.floor(new Date(startTime).getTime() / 1000);
    const end = Math.floor(new Date(endTime).getTime() / 1000);
    const bidEnd = Math.floor(new Date(biddingEndTime).getTime() / 1000);

    if (bidEnd >= start) {
      setError('Bidding end time must be before start time');
      return;
    }
    if (start >= end) {
      setError('Start time must be before end time');
      return;
    }

    // Validate milestone deadlines
    const names = milestones.map(m => m.name);
    const percentages = milestones.map(m => BigInt(parseInt(m.percentage)));
    const deadlines = milestones.map(m => BigInt(Math.floor(new Date(m.deadline).getTime() / 1000)));

    if (names.some(n => !n)) {
      setError('All milestone names are required');
      return;
    }

    setLoading(true);
    setTxStatus('Requesting MetaMask signature...');

    try {
      const signer = await getSigner();
      const factory = getFactoryContract(signer);

      setTxStatus('Submitting transaction to blockchain...');
      const tx = await factory.createTender(
        admins,
        BigInt(start),
        BigInt(end),
        BigInt(bidEnd),
        BigInt(0), // No deposit is retained
        names,
        percentages,
        deadlines
      );

      setTxStatus('Waiting for confirmation...');
      const receipt = await tx.wait();

      setTxStatus(`✅ Tender created! Tx: ${receipt.hash.slice(0, 10)}...`);

      // Reset form
      setAdmins(['', '', '', '']);
      setStartTime('');
      setEndTime('');
      setBiddingEndTime('');
      setPhaseCount(2);
      setMilestones([
        { name: '', percentage: '', deadline: '' },
        { name: '', percentage: '', deadline: '' },
      ]);
    } catch (err) {
      console.error('Create tender failed:', err);
      setError(err.reason || err.message || 'Transaction failed');
      setTxStatus('');
    } finally {
      setLoading(false);
    }
  }

  // ── Guard: loading / not government ──
  if (isGov === null) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">
          <div className="admin-loading__spinner" />
          <p>Verifying government status on-chain...</p>
        </div>
      </div>
    );
  }

  if (!isGov) {
    return (
      <div className="admin-dashboard">
        <div className="admin-denied">
          <span className="admin-denied__icon">🚫</span>
          <h2>Access Denied</h2>
          <p>Your wallet is not registered as a government address on the TenderFactory contract.</p>
          <p className="admin-denied__address">Wallet: {user?.wallet || 'N/A'}</p>
          <p className="admin-denied__factory">Factory: {FACTORY_ADDRESS}</p>
          <button className="admin-denied__btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const percentTotal = milestones.reduce((sum, m) => sum + (parseInt(m.percentage) || 0), 0);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <button className="admin-header__back" onClick={() => navigate('/')}>← Back</button>
        <div className="admin-header__info">
          <h1 className="admin-header__title">Government Admin Panel</h1>
          <span className="admin-header__badge">🏛️ Verified Government</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === TABS.CREATE ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab(TABS.CREATE)}
        >
          <span className="admin-tab__icon">📝</span>
          Create Tender
        </button>
        <button
          className={`admin-tab ${activeTab === TABS.ONGOING ? 'admin-tab--active' : ''}`}
          onClick={() => setActiveTab(TABS.ONGOING)}
        >
          <span className="admin-tab__icon">📊</span>
          Ongoing Contracts
        </button>
      </div>

      {/* ── Tab: Create Tender ── */}
      {activeTab === TABS.CREATE && (
        <form className="admin-form" onSubmit={handleCreateTender}>
          {/* Admin Wallets */}
          <div className="admin-form__section">
            <h3 className="admin-form__section-title">
              <span className="admin-form__section-icon">👤</span>
              Oversight Committee (4 Required)
            </h3>
            <div className="admin-form__grid">
              {admins.map((addr, i) => (
                <div key={i} className="admin-form__field">
                  <label className="admin-form__label">{adminLabels[i]}</label>
                  <input
                    className="admin-form__input"
                    type="text"
                    placeholder="0x..."
                    value={addr}
                    onChange={(e) => updateAdmin(i, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="admin-form__section">
            <h3 className="admin-form__section-title">
              <span className="admin-form__section-icon">⏱️</span>
              Timeline
            </h3>
            <div className="admin-form__grid admin-form__grid--three">
              <div className="admin-form__field">
                <label className="admin-form__label">Bidding End Time</label>
                <input className="admin-form__input" type="datetime-local" value={biddingEndTime}
                  onChange={(e) => setBiddingEndTime(e.target.value)} required />
              </div>
              <div className="admin-form__field">
                <label className="admin-form__label">Project Start Time</label>
                <input className="admin-form__input" type="datetime-local" value={startTime}
                  onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="admin-form__field">
                <label className="admin-form__label">Project End Time</label>
                <input className="admin-form__input" type="datetime-local" value={endTime}
                  onChange={(e) => setEndTime(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Phase Count */}
          <div className="admin-form__section">
            <h3 className="admin-form__section-title">
              <span className="admin-form__section-icon">⚙️</span>
              Milestone Configuration
            </h3>
            <div className="admin-form__grid">
              <div className="admin-form__field">
                <label className="admin-form__label">Number of Phases</label>
                <input className="admin-form__input" type="number" min="1" max="10" value={phaseCount}
                  onChange={(e) => handlePhaseCountChange(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Dynamic Milestones */}
          <div className="admin-form__section">
            <h3 className="admin-form__section-title">
              <span className="admin-form__section-icon">🏗️</span>
              Milestones ({phaseCount} phases)
              <span className={`admin-form__pct-total ${percentTotal === 100 ? 'admin-form__pct-total--valid' : 'admin-form__pct-total--invalid'}`}>
                Total: {percentTotal}%
              </span>
            </h3>
            <div className="admin-form__milestones">
              {milestones.map((m, i) => (
                <div key={i} className="admin-form__milestone-row">
                  <span className="admin-form__milestone-num">#{i + 1}</span>
                  <input
                    className="admin-form__input admin-form__input--name"
                    type="text"
                    placeholder="Phase name"
                    value={m.name}
                    onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                    required
                  />
                  <input
                    className="admin-form__input admin-form__input--pct"
                    type="number"
                    placeholder="%"
                    min="0"
                    max="100"
                    value={m.percentage}
                    onChange={(e) => updateMilestone(i, 'percentage', e.target.value)}
                    required
                  />
                  <input
                    className="admin-form__input admin-form__input--date"
                    type="datetime-local"
                    value={m.deadline}
                    onChange={(e) => updateMilestone(i, 'deadline', e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="admin-form__error">{error}</div>}
          {txStatus && <div className="admin-form__status">{txStatus}</div>}

          <button
            className="admin-form__submit"
            type="submit"
            disabled={loading || percentTotal !== 100}
          >
            {loading ? (
              <span className="admin-form__submit-spinner" />
            ) : (
              <>🦊 Create Tender via MetaMask</>
            )}
          </button>
        </form>
      )}

      {/* ── Tab: Ongoing Contracts ── */}
      {activeTab === TABS.ONGOING && (
        <div className="admin-ongoing">
          <div className="admin-ongoing__header">
            <h3 className="admin-ongoing__title">Deployed Tenders</h3>
            <button className="admin-ongoing__refresh" onClick={loadTenders} disabled={tendersLoading}>
              {tendersLoading ? '⟳ Loading...' : '⟳ Refresh'}
            </button>
          </div>

          {tendersLoading && tenders.length === 0 ? (
            <div className="admin-loading">
              <div className="admin-loading__spinner" />
              <p>Fetching tenders from blockchain...</p>
            </div>
          ) : tenders.length === 0 ? (
            <div className="admin-ongoing__empty">
              <span className="admin-ongoing__empty-icon">📭</span>
              <p>No tenders deployed yet.</p>
            </div>
          ) : (
            <div className="admin-ongoing__grid">
              {tenders.map((t, i) => (
                <div key={i} className="admin-tender-card">
                  <div className="admin-tender-card__header">
                    <span className={`admin-tender-card__status admin-tender-card__status--${t.status.toLowerCase()}`}>
                      {t.status}
                    </span>
                    <span className="admin-tender-card__index">Tender #{i + 1}</span>
                  </div>

                  <div className="admin-tender-card__address" title={t.address}>
                    📄 {t.address.slice(0, 8)}...{t.address.slice(-6)}
                  </div>

                  <div className="admin-tender-card__meta">
                    <div className="admin-tender-card__meta-row">
                      <span className="admin-tender-card__meta-label">Bidding Ends</span>
                      <span className="admin-tender-card__meta-value">{new Date(t.biddingEndTime * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="admin-tender-card__meta-row">
                      <span className="admin-tender-card__meta-label">Start</span>
                      <span className="admin-tender-card__meta-value">{new Date(t.startTime * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="admin-tender-card__meta-row">
                      <span className="admin-tender-card__meta-label">End</span>
                      <span className="admin-tender-card__meta-value">{new Date(t.endTime * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="admin-tender-card__meta-row">
                      <span className="admin-tender-card__meta-label">Bids</span>
                      <span className="admin-tender-card__meta-value admin-tender-card__meta-value--highlight">{t.bidCount}</span>
                    </div>
                  </div>

                  {t.contractor !== '0x0000000000000000000000000000000000000000' && (
                    <div className="admin-tender-card__contractor">
                      <span className="admin-tender-card__meta-label">Contractor</span>
                      <span className="admin-tender-card__meta-value">{t.contractor.slice(0, 6)}...{t.contractor.slice(-4)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
