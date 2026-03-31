import { getFactoryContract, getTenderContract, getProvider, TENDER_STATUS } from './contracts';
import { contractors as syntheticContractors } from '../data/contractors';

export async function getUnifiedLedgerData() {
  try {
    const provider = getProvider();
    const factory = getFactoryContract(provider);
    
    // 1. Fetch real contractors from backend
    const res = await fetch('http://localhost:8000/api/contractors/list');
    const realContractorsRes = await res.json();
    
    // 2. Fetch all tenders from blockchain
    const tenderMetas = await factory.getAllTenders();
    
    // 3. Map real contractors to their on-chain projects
    const realContractors = await Promise.all(realContractorsRes.map(async (rc) => {
      const myTenders = [];
      
      await Promise.all(tenderMetas.map(async (meta) => {
        try {
          const tender = getTenderContract(meta.tender, provider);
          const contractorAddr = await tender.contractor();
          
          if (contractorAddr.toLowerCase() === rc.wallet_address.toLowerCase()) {
            const statusNum = await tender.tenderStatus();
            const currentIdx = await tender.currentMilestone();
            const milestone = await tender.milestones(currentIdx);
            
            myTenders.push({
              id: meta.tender.slice(0, 10),
              title: `Project ${meta.tender.slice(0, 8)}`,
              status: TENDER_STATUS[Number(statusNum)].toLowerCase(),
              department: 'Public Works Department',
              startDate: new Date(Number(meta.startTime) * 1000).toISOString().split('T')[0],
              expectedEnd: new Date(Number(meta.endTime) * 1000).toISOString().split('T')[0],
              budget: 0, // In a real app, fetch winningBid
              spent: 0,
              description: 'Live blockchain contract data.',
              milestones: [{ 
                name: milestone.name, 
                status: ['PENDING', 'UNDER_REVIEW', 'APPROVED'][Number(milestone.status)], 
                date: new Date(Number(milestone.deadline)*1000).toISOString().split('T')[0] 
              }],

              location: rc.location || 'Unknown',
              address: meta.tender
            });
          }
        } catch (e) {
          console.error('Error fetching tender detail:', e);
        }
      }));

      return {
        id: rc.id,
        name: rc.company_name,
        specialty: rc.specialty || 'General Contractor',
        registrationDate: rc.created_at || '2026-01-01',
        rating: 5.0,
        totalContracts: myTenders.length,
        activeContracts: myTenders.filter(t => t.status === 'active').length,
        location: rc.location || 'India',
        licenseNo: rc.license_no || 'Pending',
        contracts: myTenders,
        isReal: true
      };
    }));

    // 4. Merge with synthetic data
    // We prioritize real contractors if they have the same ID (unlikely) 
    // or just append them.
    return [...realContractors, ...syntheticContractors];
  } catch (err) {
    console.error('Failed to unify ledger data:', err);
    return syntheticContractors;
  }
}
