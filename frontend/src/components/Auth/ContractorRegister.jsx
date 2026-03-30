import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerContractor, listContractors } from '../../utils/api';
import './ContractorRegister.css';

export default function ContractorRegister() {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractors, setContractors] = useState([]);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const data = await listContractors();
      setContractors(data);
    } catch {
      // silent fail on list
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid wallet address. Must be a valid Ethereum address (0x...)');
      return;
    }
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await registerContractor(walletAddress, companyName.trim());
      setSuccess(res.message);
      setWalletAddress('');
      setCompanyName('');
      fetchContractors();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-page">
      <button className="cr-back-home" onClick={() => navigate('/')}>
        ← Back to Home
      </button>
      <div className="cr-container">
        <div className="cr-header">
          <h2 className="cr-header__title">Register Contractor</h2>
          <p className="cr-header__sub">Add a new contractor to the Satya network</p>
        </div>

        <div className="cr-content">
          <form className="cr-form" onSubmit={handleSubmit}>
          <div className="cr-input-group">
            <label className="cr-label">Company / Contractor Name</label>
            <input
              className="cr-input"
              type="text"
              placeholder="e.g. Sharma Construction Pvt. Ltd."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="cr-input-group">
            <label className="cr-label">MetaMask Wallet Address</label>
            <input
              className="cr-input cr-input--mono"
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
          </div>

          {error && <div className="cr-msg cr-msg--error">{error}</div>}
          {success && <div className="cr-msg cr-msg--success">{success}</div>}

          <button className="cr-btn" type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register Contractor'}
          </button>
        </form>

        {contractors.length > 0 && (
          <div className="cr-list">
            <h3 className="cr-list__title">Registered Contractors ({contractors.length})</h3>
            <div className="cr-list__items">
              {contractors.map((c) => (
                <div key={c.id} className="cr-list__item">
                  <div className="cr-list__name">{c.company_name}</div>
                  <div className="cr-list__wallet">
                    {c.wallet_address.slice(0, 6)}...{c.wallet_address.slice(-4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
