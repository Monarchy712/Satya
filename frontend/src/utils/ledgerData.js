import { getFactoryContract, getTenderContract, getProvider, TENDER_STATUS } from './contracts';
import { contractors as syntheticContractors } from '../data/contractors';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(Number(ts) * 1000).toISOString().split('T')[0];
}

export async function getUnifiedLedgerData() {
  try {
    const provider = getProvider();
    const factory = getFactoryContract(provider);
    
    // 1. Fetch real contractors from backend
    const res = await fetch('http://localhost:8000/api/contractors/list');
    if (!res.ok) throw new Error('Backend unavailable');
    const realContractorsRes = await res.json();
    
    // 2. Fetch all tenders from blockchain
    const tenderMetas = await factory.getAllTenders();
    
    // 3. Map real contractors to their on-chain projects
    const realContractors = await Promise.all(realContractorsRes.map(async (rc) => {
      const myTenders = [];
      const wallet = rc.wallet_address.toLowerCase();
      
      await Promise.all(tenderMetas.map(async (meta) => {
        try {
          const tender = getTenderContract(meta.tender, provider);
          const [contractorAddr, statusNum, bids] = await Promise.all([
            tender.contractor(),
            tender.tenderStatus(),
            tender.getAllBids()
          ]);
          
          const status = TENDER_STATUS[Number(statusNum)].toLowerCase();
          
          // Case A: Contractor WON or project is ACTIVE
          if (contractorAddr.toLowerCase() === wallet && status !== 'bidding') {
            const currentIdx = await tender.currentMilestone();
            const milestone = await tender.getMilestone(currentIdx);
            
            myTenders.push({
              id: meta.tender.slice(0, 10),
              title: `Project ${meta.tender.slice(0, 8)}`,
              status: status,
              department: 'Public Works Department',
              startDate: formatDate(meta.startTime),
              expectedEnd: formatDate(meta.endTime),
              budget: 0,
              spent: 0,
              description: 'Live blockchain contract data.',
              milestones: [{ 
                name: milestone.name, 
                status: ['PENDING', 'UNDER_REVIEW', 'APPROVED'][Number(milestone.status)], 
                date: formatDate(milestone.deadline)
              }],
              location: rc.location || 'Unknown',
              address: meta.tender
            });
          }
          // Case B: Currently BIDDING and is in Top 3
          else if (status === 'bidding') {
            const sortedBids = [...bids].sort((a, b) => Number(a.amount) - Number(b.amount));
            const top3 = sortedBids.slice(0, 3);
            const myRankIdx = top3.findIndex(b => b.bidder.toLowerCase() === wallet);
            
            const now = Math.floor(Date.now() / 1000);
            if (myRankIdx !== -1 && now >= Number(meta.biddingEndTime)) {
              myTenders.push({
                id: meta.tender.slice(0, 10),
                title: `Tender ${meta.tender.slice(0, 8)}`,
                status: 'bidding',
                shortlisted: true,
                rank: myRankIdx + 1,
                department: 'Public Works Department',
                startDate: formatDate(meta.startTime),
                expectedEnd: formatDate(meta.endTime),
                description: `Finalist: Ranked #${myRankIdx + 1} in competitive bidding.`,
                milestones: [],
                location: rc.location || 'India',
                address: meta.tender
              });
            }

          }
        } catch (e) {
          console.warn('Tender mapping error:', e);
        }
      }));

      return {
        id: rc.registration_id || rc.id,
        name: rc.company_name,
        specialty: rc.specialty || 'Infrastructure',
        registrationDate: rc.created_at || '2026-01-01',
        rating: rc.trust_score / 20 || 4.5,
        totalContracts: myTenders.length,
        activeContracts: myTenders.filter(t => t.status === 'active' || t.status === 'ongoing').length,
        location: rc.location || 'India',
        licenseNo: rc.license_no || 'P-VERIFIED',
        contracts: myTenders,
        isReal: true
      };
    }));

    return [...realContractors, ...syntheticContractors];
  } catch (err) {
    console.warn('Fallback to synthetic data:', err);
    return syntheticContractors;
  }
}
