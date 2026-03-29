import { useMemo } from 'react';
import ContractCard from './ContractCard';
import './Ledger.css';

export default function Ledger({ contractors, activeContractorId }) {
  const activeContractor = useMemo(() => {
    return contractors.find((c) => c.id === activeContractorId) || contractors[0];
  }, [contractors, activeContractorId]);

  if (!activeContractor) return null;

  return (
    <section id="ledger" className="ledger">
      <div className="ledger__container">
        
        {/* Contractor Profile Header */}
        <div className="ledger__profile">
          <div className="ledger__profile-header">
            <h2 className="ledger__profile-name">{activeContractor.name}</h2>
            <div className="ledger__profile-rating">
              <span className="ledger__profile-rating-star">★</span>
              {activeContractor.rating} / 5.0
            </div>
          </div>
          
          <div className="ledger__profile-meta-grid">
            <div className="ledger__profile-meta">
              <span className="ledger__profile-meta-label">ID / REG</span>
              <span className="ledger__profile-meta-value">{activeContractor.id} • {new Date(activeContractor.registrationDate).getFullYear()}</span>
            </div>
            <div className="ledger__profile-meta">
              <span className="ledger__profile-meta-label">Specialty</span>
              <span className="ledger__profile-meta-value">{activeContractor.specialty}</span>
            </div>
            <div className="ledger__profile-meta">
              <span className="ledger__profile-meta-label">License No.</span>
              <span className="ledger__profile-meta-value ledger__profile-meta-value--mono">{activeContractor.licenseNo}</span>
            </div>
            <div className="ledger__profile-meta">
              <span className="ledger__profile-meta-label">Location</span>
              <span className="ledger__profile-meta-value">{activeContractor.location}</span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="ledger__section-title">
          <div className="ledger__section-title-line" />
          <h3>CONTRACTS PORTFOLIO</h3>
          <div className="ledger__section-title-line" />
        </div>

        {/* Contracts List */}
        <div className="ledger__contracts">
          {activeContractor.contracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
          {activeContractor.contracts.length === 0 && (
            <div className="ledger__empty-state">
              No contracts found for this contractor.
            </div>
          )}
        </div>
        
      </div>
    </section>
  );
}
