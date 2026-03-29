import { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Hero from './components/Hero/Hero';
import Ledger from './components/Ledger/Ledger';
import { contractors, ledgerStats } from './data/contractors';
import './App.css';

function App() {
  const [activeContractorId, setActiveContractorId] = useState(contractors[0].id);

  const handleContractorClick = (id) => {
    setActiveContractorId(id);
    document.getElementById('ledger-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app">
      <Navbar />
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

export default App;
