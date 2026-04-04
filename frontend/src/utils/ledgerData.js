import { getFactoryContract, getTenderContract, getProvider, TENDER_STATUS } from './contracts';
import { contractors as syntheticContractors } from '../data/contractors';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toISOString().split('T')[0];
}

export async function getUnifiedLedgerData() {
  try {
    // 1. Fetch data from backend (Single trip for everything)
    const [contractorsRes, tendersRes] = await Promise.all([
      fetch('http://localhost:8000/api/contractors/list'),
      fetch('http://localhost:8000/api/tenders/list')
    ]);

    if (!contractorsRes.ok || !tendersRes.ok) throw new Error('Backend aggregation layer unavailable');
    
    const realContractorsRes = await contractorsRes.json();
    const allTenders = await tendersRes.json();
    
    // 2. Map real contractors to their on-chain projects (In-memory)
    const realContractors = realContractorsRes.map((rc) => {
      const wallet = rc.wallet_address.toLowerCase();
      
      // Filter the pre-aggregated tenders for this specific contractor
      const myTenders = allTenders.filter(t => {
        const isOwner = t.contractor.toLowerCase() === wallet;
        const isAdmin = [
          t.on_site_engineer, t.compliance_officer, 
          t.financial_auditor, t.sanctioning_authority
        ].some(addr => addr.toLowerCase() === wallet);
        
        return isOwner || isAdmin;
      }).map(t => {
        const status = t.status.toLowerCase();
        
        // Find current milestone info if active
        let milestones = [];
        if (status === 'active' || status === 'completed') {
           milestones = t.milestones.map(m => ({
              name: m.name,
              status: m.status,
              date: formatDate(m.deadline)
           }));
        }

        return {
          id: t.tender_address.slice(0, 10),
          title: `Project ${t.tender_address.slice(0, 8)}`,
          status: status,
          department: 'Public Works Department',
          startDate: formatDate(t.start_time),
          expectedEnd: formatDate(t.end_time),
          budget: Number(t.winning_bid) || 0,
          spent: Number(t.total_funds) || 0,
          description: 'Verified Blockchain Ledger Data.',
          milestones: milestones,
          location: rc.location || 'India',
          address: t.tender_address
        };
      });

      return {
        id: rc.registration_id || rc.id,
        name: rc.company_name,
        specialty: rc.specialty || 'Infrastructure',
        registrationDate: rc.created_at || '2026-01-01',
        rating: rc.trust_score / 20 || 4.5,
        totalContracts: myTenders.length,
        activeContracts: myTenders.filter(t => t.status === 'active').length,
        location: rc.location || 'India',
        licenseNo: rc.license_no || 'P-VERIFIED',
        contracts: myTenders,
        isReal: true
      };
    });

    return [...realContractors, ...syntheticContractors];
  } catch (err) {
    console.warn('[Satya] High-speed sync failed, using synthetic fallback:', err);
    return syntheticContractors;
  }
}

