import { ethers } from 'ethers';
import fs from 'fs';

const TENDER_ADDRESS = "0xA511B506b3D31717356F4d93aBF610B4B4bD1E9c";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    console.log("Connecting...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const abi = JSON.parse(fs.readFileSync('c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderABI.json', 'utf8'));
    const tender = new ethers.Contract(TENDER_ADDRESS, abi, provider);

    const dispute = await tender.dispute();
    console.log("Dispute on chain:");
    console.log("Reason:", dispute.reason);
    console.log("Resolved:", dispute.resolved);
}

main();
