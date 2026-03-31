import { useState, useEffect } from 'react';
import { getFactoryContract, getTenderContract, getProvider, TENDER_STATUS } from '../../utils/contracts';
import './TendersPage.css';

export default function TendersPage() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTender, setExpandedTender] = useState(null);

  useEffect(() => {
    loadTenders();
  }, []);

  async function loadTenders() {
    setLoading(true);
    try {
      const provider = getProvider();
      const factory = getFactoryContract(provider);
      const metas = await factory.getAllTenders();

      const enriched = await Promise.all(
        metas.map(async (meta) => {
          try {
            const tender = getTenderContract(meta.tender, provider);
            const [statusNum, bids, contractor, winBid, retainedPct, currentMs] = await Promise.all([
              tender.tenderStatus(),
              tender.getAllBids(),
              tender.contractor(),
              tender.winningBid(),
              tender.retainedPercent(),
              tender.currentMilestone(),
            ]);

            return {
              address: meta.tender,
              startTime: Number(meta.startTime),
              endTime: Number(meta.endTime),
              biddingEndTime: Number(meta.biddingEndTime),
              status: TENDER_STATUS[Number(statusNum)] || 'UNKNOWN',
              bids: bids.map(b => ({ bidder: b.bidder, amount: b.amount.toString() })),
              contractor,
              winningBid: winBid.toString(),
              retainedPercent: Number(retainedPct),
              currentMilestone: Number(currentMs),
            };
          } catch {
            return {
              address: meta.tender,
              startTime: Number(meta.startTime),
              endTime: Number(meta.endTime),
              biddingEndTime: Number(meta.biddingEndTime),
              status: 'ERROR',
              bids: [],
              contractor: '0x0',
              winningBid: '0',
              retainedPercent: 0,
              currentMilestone: 0,
            };
          }
        })
      );

      setTenders(enriched);
    } catch (err) {
      console.error('Failed to load tenders:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }

  function getTimeRemaining(ts) {
    const now = Date.now() / 1000;
    const diff = ts - now;
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  }

  const isZeroAddr = (addr) => addr === '0x0000000000000000000000000000000000000000';

  return (
    <div className="tenders-page">
      <div className="tenders-page__container">
        {/* Header */}
        <div className="tenders-page__header">
          <div className="tenders-page__header-info">
            <h1 className="tenders-page__title">Public Tenders</h1>
            <p className="tenders-page__subtitle">
              Transparent government infrastructure contracts on Ethereum
            </p>
          </div>
          <button className="tenders-page__refresh" onClick={loadTenders} disabled={loading}>
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
        </div>

        {/* Stats Bar */}
        {!loading && tenders.length > 0 && (
          <div className="tenders-page__stats">
            <div className="tenders-page__stat">
              <span className="tenders-page__stat-value">{tenders.length}</span>
              <span className="tenders-page__stat-label">Total Tenders</span>
            </div>
            <div className="tenders-page__stat">
              <span className="tenders-page__stat-value tenders-page__stat-value--bidding">
                {tenders.filter(t => t.status === 'BIDDING').length}
              </span>
              <span className="tenders-page__stat-label">Open for Bids</span>
            </div>
            <div className="tenders-page__stat">
              <span className="tenders-page__stat-value tenders-page__stat-value--active">
                {tenders.filter(t => t.status === 'ACTIVE').length}
              </span>
              <span className="tenders-page__stat-label">Active</span>
            </div>
            <div className="tenders-page__stat">
              <span className="tenders-page__stat-value tenders-page__stat-value--completed">
                {tenders.filter(t => t.status === 'COMPLETED').length}
              </span>
              <span className="tenders-page__stat-label">Completed</span>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="tenders-page__loading">
            <div className="tenders-page__loading-spinner" />
            <p>Fetching tenders from blockchain...</p>
          </div>
        ) : tenders.length === 0 ? (
          <div className="tenders-page__empty">
            <span className="tenders-page__empty-icon">📭</span>
            <h3>No Tenders Available</h3>
            <p>Government tenders will appear here once deployed on-chain.</p>
          </div>
        ) : (
          <div className="tenders-page__list">
            {tenders.map((t, i) => (
              <div
                key={i}
                className={`tenders-card ${expandedTender === i ? 'tenders-card--expanded' : ''}`}
                onClick={() => setExpandedTender(expandedTender === i ? null : i)}
              >
                <div className="tenders-card__main">
                  <div className="tenders-card__left">
                    <div className="tenders-card__top">
                      <span className={`tenders-card__status tenders-card__status--${t.status.toLowerCase()}`}>
                        {t.status}
                      </span>
                      <span className="tenders-card__id">Tender #{i + 1}</span>
                    </div>
                    <div className="tenders-card__address" title={t.address}>
                      📄 {t.address.slice(0, 10)}...{t.address.slice(-8)}
                    </div>
                  </div>

                  <div className="tenders-card__right">
                    <div className="tenders-card__meta-group">
                      <div className="tenders-card__meta-item">
                        <span className="tenders-card__meta-label">Bidding Ends</span>
                        <span className="tenders-card__meta-value">{formatDate(t.biddingEndTime)}</span>
                        {t.status === 'BIDDING' && (
                          <span className="tenders-card__countdown">{getTimeRemaining(t.biddingEndTime)}</span>
                        )}
                      </div>
                      <div className="tenders-card__meta-item">
                        <span className="tenders-card__meta-label">Project Period</span>
                        <span className="tenders-card__meta-value">{formatDate(t.startTime)} — {formatDate(t.endTime)}</span>
                      </div>
                    </div>
                    <div className="tenders-card__bid-count">
                      <span className="tenders-card__bid-number">{t.bids.length}</span>
                      <span className="tenders-card__bid-text">Bid{t.bids.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTender === i && (
                  <div className="tenders-card__details">
                    {!isZeroAddr(t.contractor) && (
                      <div className="tenders-card__detail-row">
                        <span className="tenders-card__detail-label">Selected Contractor</span>
                        <span className="tenders-card__detail-value">{t.contractor.slice(0, 8)}...{t.contractor.slice(-6)}</span>
                      </div>
                    )}
                    {t.winningBid !== '0' && (
                      <div className="tenders-card__detail-row">
                        <span className="tenders-card__detail-label">Winning Bid</span>
                        <span className="tenders-card__detail-value">{t.winningBid} Wei</span>
                      </div>
                    )}
                    <div className="tenders-card__detail-row">
                      <span className="tenders-card__detail-label">Retained %</span>
                      <span className="tenders-card__detail-value">{t.retainedPercent}%</span>
                    </div>
                    <div className="tenders-card__detail-row">
                      <span className="tenders-card__detail-label">Current Milestone</span>
                      <span className="tenders-card__detail-value">#{t.currentMilestone}</span>
                    </div>

                    {t.bids.length > 0 && (
                      <div className="tenders-card__bids-section">
                        <h4 className="tenders-card__bids-title">Bids</h4>
                        <div className="tenders-card__bids-list">
                          {t.bids.map((bid, bi) => (
                            <div key={bi} className="tenders-card__bid-row">
                              <span className="tenders-card__bid-bidder">{bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}</span>
                              <span className="tenders-card__bid-amount">{bid.amount} Wei</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="tenders-card__cta">
                      <button className="tenders-card__bid-btn" disabled>
                        🔒 Connect wallet to bid (coming soon)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
