import { ethers } from 'ethers';

// ── Factory Contract ──
export const FACTORY_ADDRESS = '0x557f0988F9cD626799eb35E4D0a1b4B7fC484B11';

export const FACTORY_ABI = [
  {
    inputs: [{ internalType: "address", name: "_gov", type: "address" }],
    name: "addGovernment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address[]", name: "_admins", type: "address[]" },
      { internalType: "uint256", name: "_startTime", type: "uint256" },
      { internalType: "uint256", name: "_endTime", type: "uint256" },
      { internalType: "uint256", name: "_biddingEndTime", type: "uint256" },
      { internalType: "uint256", name: "_retainedPercent", type: "uint256" },
      { internalType: "string[]", name: "_names", type: "string[]" },
      { internalType: "uint256[]", name: "_percentages", type: "uint256[]" },
      { internalType: "uint256[]", name: "_deadlines", type: "uint256[]" }
    ],
    name: "createTender",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getAllTenders",
    outputs: [
      {
        components: [
          { internalType: "address", name: "tender", type: "address" },
          { internalType: "uint256", name: "startTime", type: "uint256" },
          { internalType: "uint256", name: "endTime", type: "uint256" },
          { internalType: "uint256", name: "biddingEndTime", type: "uint256" }
        ],
        internalType: "struct TenderFactory.TenderMeta[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isGovernment",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

// ── Tender Contract (individual tender instances) ──
export const TENDER_ABI = [
  {
    inputs: [], name: "tenderStatus",
    outputs: [{ internalType: "enum Tender.TenderStatus", name: "", type: "uint8" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "startTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "endTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "biddingEndTime",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "winningBid",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "contractor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "contractorDeposit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "retainedPercent",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "currentMilestone",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "onSiteEngineer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "complianceOfficer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "financialAuditor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [], name: "sanctioningAuthority",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [],
    name: "getAllBids",
    outputs: [
      {
        components: [
          { internalType: "address", name: "bidder", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" }
        ],
        internalType: "struct Tender.Bid[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getMilestone",
    outputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "uint256", name: "percentage", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "completionPercent", type: "uint256" },
          { internalType: "uint256", name: "depositShare", type: "uint256" },
          { internalType: "enum Tender.MilestoneStatus", name: "status", type: "uint8" }
        ],
        internalType: "struct Tender.Milestone",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "placeBid",
    outputs: [],
    stateMutability: "nonpayable", type: "function"
  },
  {
    inputs: [], name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view", type: "function"
  }
];

// ── Status Enums (matching Solidity) ──
export const TENDER_STATUS = ['BIDDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const MILESTONE_STATUS = ['PENDING', 'UNDER_REVIEW', 'APPROVED'];

// ── Helper: get a provider (read-only, no wallet) ──
export function getProvider() {
  // Use Sepolia RPC for read-only calls
  return new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE');
}

// ── Helper: get signer from MetaMask ──
export async function getSigner() {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// ── Contract instances ──
export function getFactoryContract(signerOrProvider) {
  return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signerOrProvider);
}

export function getTenderContract(address, signerOrProvider) {
  return new ethers.Contract(address, TENDER_ABI, signerOrProvider);
}
