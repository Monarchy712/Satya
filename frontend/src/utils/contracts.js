import { ethers } from 'ethers';

// ── Factory Contract ──
export const FACTORY_ADDRESS = "0x760a12501f98E1b4Fbd4b821C55c0432C17C3C8c";

import FACTORY_ABI_JSON from './TenderFactoryABI.json';
export const FACTORY_ABI = FACTORY_ABI_JSON;

// ── Tender Contract (EIP-712 Multisig) ──
import TENDER_ABI_JSON from './TenderABI.json';
export const TENDER_ABI = TENDER_ABI_JSON;

// ── Status Enums (matching Solidity) ──
export const TENDER_STATUS = ['BIDDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
export const MILESTONE_STATUS = ['PENDING', 'UNDER_REVIEW', 'APPROVED'];
export const ROLE_NAMES = ['None', 'OnSiteEngineer', 'ComplianceOfficer', 'FinancialAuditor', 'SanctioningAuthority', 'Contractor', 'Government'];

// ── Helper: get a provider (read-only, no wallet) ──
export function getProvider() {
  return new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE');
}

// ── Helper: get signer from MetaMask ──
export async function getSigner() {
  if (!window.ethereum) throw new Error('MetaMask not installed');
  
  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SepoliaETH',
                decimals: 18,
              },
              rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Sepolia network to MetaMask');
      }
    } else if (switchError.code === 4001) {
       throw new Error('User rejected network switch');
    } else {
       console.error('Switch error', switchError);
    }
  }

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

// ── EIP-712 Signing Helper ──
export async function signMilestoneApproval(signer, tenderAddress, milestoneId) {
  const domain = {
    name: 'Tender',
    version: '1',
    chainId: 11155111, // Sepolia
    verifyingContract: tenderAddress,
  };

  const types = {
    Approve: [
      { name: 'milestoneId', type: 'uint256' },
      { name: 'tender', type: 'address' },
    ],
  };

  const value = {
    milestoneId: milestoneId,
    tender: tenderAddress,
  };

  const signature = await signer.signTypedData(domain, types, value);
  return signature;
}

// ── Role Management Helpers ──
export async function assignRole(signer, userAddress, roleEnum) {
  const factory = getFactoryContract(signer);
  const tx = await factory.addToRole(userAddress, roleEnum);
  return tx.wait();
}

export async function revokeRole(signer, userAddress) {
  const factory = getFactoryContract(signer);
  const tx = await factory.removeFromRole(userAddress);
  return tx.wait();
}

// ── Dispute & Voting Helpers ──
export async function submitDispute(signer, tenderAddress, milestoneId, reason) {
  const tender = getTenderContract(tenderAddress, signer);
  // Add an explicit gasLimit override to prevent MetaMask OOG estimations due to variable storage strings
  const tx = await tender.raiseDispute(milestoneId, reason, { gasLimit: 800000 });
  return tx.wait();
}

export async function castDisputeVote(signer, tenderAddress, supportGovernment) {
  const tender = getTenderContract(tenderAddress, signer);
  const tx = await tender.vote(supportGovernment, { gasLimit: 300000 });
  return tx.wait();
}
