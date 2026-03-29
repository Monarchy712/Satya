import './Hero.css';

export default function Hero({ stats }) {
  const formatCurrency = (n) => {
    if (n >= 1e9) return `₹${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <section className="hero" id="hero">
      {/* Decorative background elements */}
      <div className="hero__bg-grid" />
      <div className="hero__bg-circle hero__bg-circle--1" />
      <div className="hero__bg-circle hero__bg-circle--2" />
      <div className="hero__bg-circle hero__bg-circle--3" />

      <div className="hero__content">
        <div className="hero__eyebrow">
          <span className="hero__eyebrow-dot" />
          <span>PUBLIC TRANSPARENCY INITIATIVE</span>
          <span className="hero__eyebrow-dot" />
        </div>

        <h1 className="hero__title">
          <span className="hero__title-line">सत्य</span>
          <span className="hero__title-sub">Transparency Ledger</span>
        </h1>

        <p className="hero__description">
          An open, immutable record of every government contract — who builds, what they build,
          and how public money flows. <em>Truth in every transaction.</em>
        </p>

        {/* Stats bar */}
        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-number">{stats.totalContractors}</span>
            <span className="hero__stat-label">Registered Contractors</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">{stats.totalContracts}</span>
            <span className="hero__stat-label">Total Contracts</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">{formatCurrency(stats.totalBudgetAllocated)}</span>
            <span className="hero__stat-label">Budget Allocated</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">{formatCurrency(stats.totalSpent)}</span>
            <span className="hero__stat-label">Funds Utilized</span>
          </div>
        </div>

        {/* Status pills */}
        <div className="hero__status-row">
          <div className="hero__status-pill hero__status-pill--ongoing">
            <span className="hero__status-dot hero__status-dot--ongoing" />
            <span>{stats.ongoingContracts} Ongoing</span>
          </div>
          <div className="hero__status-pill hero__status-pill--pending">
            <span className="hero__status-dot hero__status-dot--pending" />
            <span>{stats.pendingContracts} Pending</span>
          </div>
          <div className="hero__status-pill hero__status-pill--completed">
            <span className="hero__status-dot hero__status-dot--completed" />
            <span>{stats.completedContracts} Completed</span>
          </div>
        </div>

        <a href="#ledger" className="hero__cta">
          <span>VIEW LEDGER</span>
          <span className="hero__cta-arrow">↓</span>
        </a>
      </div>

      {/* Retro terminal tape */}
      <div className="hero__ticker">
        <div className="hero__ticker-track">
          <span>◈ SATYA TRANSPARENCY LEDGER — LIVE DATA FEED ◈ LAST UPDATED: {new Date(stats.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ◈ ALL RECORDS VERIFIED ◈ PUBLIC ACCESS ENABLED ◈ SATYA TRANSPARENCY LEDGER — LIVE DATA FEED ◈ LAST UPDATED: {new Date(stats.lastUpdated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ◈ ALL RECORDS VERIFIED ◈ PUBLIC ACCESS ENABLED ◈</span>
        </div>
      </div>
    </section>
  );
}
