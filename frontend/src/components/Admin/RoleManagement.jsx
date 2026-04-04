import { useState, useEffect } from 'react';
import { getSigner, assignRole, revokeRole, getFactoryContract } from '../../utils/contracts';
import LoadingOverlay from '../UI/LoadingOverlay';

export default function RoleManagement() {
  const [pools, setPools] = useState({
    onSiteEngineers: [],
    complianceOfficers: [],
    financialAuditors: [],
    sanctioningAuthorities: []
  });
  const [loading, setLoading] = useState(true);
  const [addressInput, setAddressInput] = useState('');
  const [roleSelect, setRoleSelect] = useState('0'); // 0: None, but Factory wants 1: OnSiteEngineer etc. Roles mapping in solidity matches index? 
  // Wait, Solidity Enum: 0: None, 1: OnSiteEngineer, 2: ComplianceOfficer, 3: FinancialAuditor, 4: SanctioningAuthority.
  
  useEffect(() => {
    fetchPools();
  }, []);

  async function fetchPools() {
    setLoading(true);
    try {
      // Use backend API since it returns mapped object, OR ethers.js
      const res = await fetch('/api/roles/all');
      if (res.ok) {
        const data = await res.json();
        setPools(data);
      } else {
        // Fallback to direct reading from blockchain if backend is down
        const signer = await getSigner();
        const factory = getFactoryContract(signer);
        const fetched = await factory.getAllRolePools();
        setPools({
          onSiteEngineers: fetched[0] || [],
          complianceOfficers: fetched[1] || [],
          financialAuditors: fetched[2] || [],
          sanctioningAuthorities: fetched[3] || []
        });
      }
    } catch (err) {
      console.error('Failed to load role pools', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!addressInput) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      await assignRole(signer, addressInput, parseInt(roleSelect));
      alert('Role Assigned successfully! Please wait for chain confirmation.');
      setAddressInput('');
      fetchPools();
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeRole = async (address) => {
    setLoading(true);
    try {
      const signer = await getSigner();
      await revokeRole(signer, address);
      alert('Role Revoked successfully!');
      fetchPools();
    } catch (err) {
      alert(`Revocation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-ongoing">
      <div className="admin-ongoing__header">
        <h3 className="admin-ongoing__title">Role Management</h3>
      </div>
      
      <form onSubmit={handleAddRole} className="admin-form" style={{ marginBottom: '20px' }}>
        <div className="admin-form__grid">
          <div className="admin-form__field">
            <label className="admin-form__label">Wallet Address</label>
            <input 
              type="text" className="admin-form__input" 
              placeholder="0x..." value={addressInput} 
              onChange={(e) => setAddressInput(e.target.value)} required 
            />
          </div>
          <div className="admin-form__field">
            <label className="admin-form__label">Select Role</label>
            <select 
              className="admin-form__input" 
              value={roleSelect} 
              onChange={(e) => setRoleSelect(e.target.value)} required
            >
              <option value="1">On-Site Engineer</option>
              <option value="2">Compliance Officer</option>
              <option value="3">Financial Auditor</option>
              <option value="4">Sanctioning Authority</option>
            </select>
          </div>
        </div>
        <button type="submit" className="admin-form__submit" style={{ marginTop: '15px' }}>
          Assign Role
        </button>
      </form>

      {loading && <LoadingOverlay active={true} context="roles" inline={true} />}

      {!loading && (
        <div className="admin-grid" style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          <RoleList title="On-Site Engineers" users={pools.onSiteEngineers} onRevoke={handleRevokeRole} />
          <RoleList title="Compliance Officers" users={pools.complianceOfficers} onRevoke={handleRevokeRole} />
          <RoleList title="Financial Auditors" users={pools.financialAuditors} onRevoke={handleRevokeRole} />
          <RoleList title="Sanctioning Authorities" users={pools.sanctioningAuthorities} onRevoke={handleRevokeRole} />
        </div>
      )}
    </div>
  );
}

function RoleList({ title, users, onRevoke }) {
  return (
    <div className="admin-tender-card" style={{ padding: '20px' }}>
      <h4 style={{ marginBottom: '15px', color: 'var(--gray-300)' }}>{title} ({users?.length || 0})</h4>
      {users?.length === 0 ? <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>Empty pool</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(u => (
            <li key={u} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', background: 'var(--surface-color)', padding: '10px', borderRadius: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary-color)' }}>{u.slice(0, 18)}...</span>
              <button 
                onClick={() => onRevoke(u)} 
                style={{ backgroundColor: 'transparent', color: 'var(--pink-500)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
