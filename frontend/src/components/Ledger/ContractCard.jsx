import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ReportModal from './ReportModal';
import './ContractCard.css';

export default function ContractCard({ contract }) {
  const [expanded, setExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user } = useAuth();

  const formatCurrency = (n) => {
    if (n >= 1e9) return `₹${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const progress = Math.min(100, Math.round((contract.spent / contract.budget) * 100)) || 0;

  return (
    <div className={`contract-card ${expanded ? 'contract-card--expanded' : ''} contract-card--${contract.status}`}>
      {/* ── Card Header (Always visible) ── */}
      <div 
        className="contract-card__header" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="contract-card__header-main">
          <div className="contract-card__id">{contract.id}</div>
          <h3 className="contract-card__title">{contract.title}</h3>
          <div className="contract-card__department">{contract.department} • {contract.location}</div>
        </div>

        <div className="contract-card__header-side">
          <div className={`contract-card__status contract-card__status--${contract.status}`}>
            <span className="contract-card__status-dot" />
            {contract.status.toUpperCase()}
          </div>
          <div className="contract-card__budget">
            <span className="contract-card__budget-amount">{formatCurrency(contract.budget)}</span>
            <span className="contract-card__budget-label">Total Budget</span>
          </div>
          <button className="contract-card__toggle">
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div className="contract-card__details">
          <div className="contract-card__divider" />
          
          <p className="contract-card__description">{contract.description}</p>
          
          <div className="contract-card__grid">
            <div className="contract-card__meta">
              <span className="contract-card__meta-label">Contract Type</span>
              <span className="contract-card__meta-value">{contract.contractType}</span>
            </div>
            <div className="contract-card__meta">
              <span className="contract-card__meta-label">Timeline</span>
              <span className="contract-card__meta-value">
                {new Date(contract.startDate).toLocaleDateString('en-IN')} — {new Date(contract.expectedEnd).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div className="contract-card__meta">
              <span className="contract-card__meta-label">Payment Terms</span>
              <span className="contract-card__meta-value">{contract.paymentTerms}</span>
            </div>
            <div className="contract-card__meta contract-card__meta--progress">
              <span className="contract-card__meta-label">Funds Utilization ({progress}%)</span>
              <div className="contract-card__progress-bar">
                <div 
                  className="contract-card__progress-fill" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <span className="contract-card__meta-subvalue">
                {formatCurrency(contract.spent)} spent of {formatCurrency(contract.budget)}
              </span>
            </div>
          </div>

          {/* Milestones Tracker */}
          <div className="contract-card__milestones-wrapper">
            <h4 className="contract-card__milestones-title">PROJECT MILESTONES</h4>
            <div className="contract-card__milestones">
              {contract.milestones.map((milestone, idx) => (
                <div 
                  key={idx} 
                  className={`contract-card__step contract-card__step--${milestone.status}`}
                >
                  <div className="contract-card__step-marker">
                    <div className="contract-card__step-dot" />
                    {idx < contract.milestones.length - 1 && (
                      <div className="contract-card__step-line" />
                    )}
                  </div>
                  <div className="contract-card__step-content">
                    <span className="contract-card__step-name">{milestone.name}</span>
                    <span className="contract-card__step-date">
                      {new Date(milestone.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Button for Citizens */}
          {user?.role === 'citizen' && contract.status === 'completed' && (
            <div className="contract-card__report-section">
              <div className="contract-card__divider" />
              <button 
                className="contract-card__report-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReportModal(true);
                }}
              >
                <span className="contract-card__report-icon">🚩</span>
                Report Quality Issue
              </button>
            </div>
          )}
        </div>
      )}

      {showReportModal && (
        <ReportModal 
          contract={contract} 
          onClose={() => setShowReportModal(false)} 
        />
      )}
    </div>
  );
}
