import { useState } from 'react';
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
import ContractorDashboard from './components/Contractor/ContractorDashboard';
import OversightDashboard from './components/Oversight/OversightDashboard';
import { contractors as staticContractors, ledgerStats as staticStats } from './data/contractors';
import { getUnifiedLedgerData } from './utils/ledgerData';

import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
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
      
      // Dynamic stats calculation
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
            <div className="app__loading-screen">
              <div className="app__spinner" />
              <p>Fetching Truth from Blockchain...</p>
            </div>
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

function TendersRoute() {
  const { user, logout } = useAuth();
  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <TendersPage />
    </>
  );
}

function AdminRoute() {
  const { user, logout } = useAuth();
  return (
    <ProtectedRoute>
      <Navbar user={user} onLogout={logout} />
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function ContractorRoute() {
  const { user, logout } = useAuth();
  return (
    <ProtectedRoute>
      <Navbar user={user} onLogout={logout} />
      <ContractorDashboard />
    </ProtectedRoute>
  );
}

function OversightRoute() {
  const { user, logout } = useAuth();
  return (
    <ProtectedRoute>
      <Navbar user={user} onLogout={logout} />
      <OversightDashboard />
    </ProtectedRoute>
  );
}


function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register-contractor" element={<ContractorRegister />} />
      <Route path="/tenders" element={<TendersRoute />} />
      <Route path="/admin" element={<AdminRoute />} />
      <Route path="/contractor" element={<ContractorRoute />} />
      <Route path="/oversight" element={<OversightRoute />} />
      <Route
        path="/*"
        element={<Dashboard />}
      />
    </Routes>
  );
}

export default App;
