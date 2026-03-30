import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import ContractorRegister from './components/Auth/ContractorRegister';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Hero from './components/Hero/Hero';
import Ledger from './components/Ledger/Ledger';
import { contractors, ledgerStats } from './data/contractors';
import './App.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function Dashboard() {
  const [activeContractorId, setActiveContractorId] = useState(contractors[0].id);
  const { user, logout } = useAuth();

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
          <Hero stats={ledgerStats} />

          <div id="ledger-view">
            <Ledger
              contractors={contractors}
              activeContractorId={activeContractorId}
            />
          </div>

          <footer className="app__footer">
            <p>Satya Transparency Ledger © {new Date().getFullYear()} — Public Data Initiative</p>
            <p className="app__footer-sub">Bringing truth to public contracts</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register-contractor" element={<ContractorRegister />} />
      <Route
        path="/*"
        element={<Dashboard />}
      />
    </Routes>
  );
}

export default App;
