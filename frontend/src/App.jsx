import { useState, useEffect } from 'react';
import LoadingOverlay from './components/UI/LoadingOverlay';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import ContractorRegister from './components/Auth/ContractorRegister';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Hero from './components/Hero/Hero';
import Ledger from './components/Ledger/Ledger';
import TendersPage from './components/Tenders/TendersPage';
import AdminDashboard from './components/Admin/AdminDashboard';
import SignatoryDashboard from './components/Admin/SignatoryDashboard';
import ContractorDashboard from './components/Contractor/ContractorDashboard';
import OversightDashboard from './components/Oversight/OversightDashboard';
import { contractors as staticContractors, ledgerStats as staticStats } from './data/contractors';
import { getUnifiedLedgerData } from './utils/ledgerData';

import './App.css';

/**
 * Enhanced Protected Route supporting granular role access.
 * If user does not meet role requirements, redirects to home or login.
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.warn(`[Satya] Access denied for role: ${user?.role}. Required: ${allowedRoles}`);
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function Dashboard() {
  const [unifiedContractors, setUnifiedContractors] = useState([]);
  const [stats, setStats] = useState(staticStats);
  const [activeContractorId, setActiveContractorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    async function load() {
      const data = await getUnifiedLedgerData();
      setUnifiedContractors(data);
      if (data.length > 0) setActiveContractorId(data[0].id);
      
      const ongoing = data.reduce((sum, c) => sum + c.contracts.filter(t => t.status === 'active' || t.status === 'ongoing').length, 0);
      const pending = data.reduce((sum, c) => sum + c.contracts.filter(t => t.status === 'bidding' || t.status === 'pending').length, 0);
      setStats({ ...staticStats, ongoingContracts: ongoing, pendingContracts: pending, totalContractors: data.length });
      
      setLoading(false);
    }
    load();
  }, []);

  const handleContractorClick = (id) => {
    setActiveContractorId(id);
    document.getElementById('ledger-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app">
      <Navbar user={user} onLogout={logout} />
      <div className="app__layout">
        <Sidebar
          activeContractorId={activeContractorId}
          onContractorClick={handleContractorClick}
        />
        <main className="app__main" id="main-scroll-area">
          {loading ? (
            <LoadingOverlay active={true} context="blockchain" inline={true} />
          ) : (
            <>
              <Hero stats={stats} />
              <div id="ledger-view">
                <Ledger
                  contractors={unifiedContractors}
                  activeContractorId={activeContractorId}
                />
              </div>
            </>
          )}
          <footer className="app__footer">
            <p>Satya Transparency Ledger © {new Date().getFullYear()} — Public Data Initiative</p>
            <p className="app__footer-sub">Bringing truth to public contracts</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function GlobalRoute({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <Navbar user={user} onLogout={logout} />
      {children}
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register-contractor" element={<ContractorRegister />} />
      
      {/* Public Pages */}
      <Route path="/tenders" element={<GlobalRoute><TendersPage /></GlobalRoute>} />
      
      {/* Role-Specific Protected Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
            <GlobalRoute><AdminDashboard /></GlobalRoute>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/signatory-portal" 
        element={
          <ProtectedRoute allowedRoles={['signatory']}>
            <GlobalRoute><SignatoryDashboard /></GlobalRoute>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/contractor" 
        element={
          <ProtectedRoute allowedRoles={['contractor']}>
            <GlobalRoute><ContractorDashboard /></GlobalRoute>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/oversight" 
        element={
          <ProtectedRoute allowedRoles={['committee']}>
            <GlobalRoute><OversightDashboard /></GlobalRoute>
          </ProtectedRoute>
        } 
      />

      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
