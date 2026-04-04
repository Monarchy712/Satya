import { ethers } from 'ethers';
import fs from 'fs';

const TENDER_ADDRESS = "0xA511B506b3D31717356F4d93aBF610B4B4bD1E9c";
const CONTRACTOR_ADDRESS = "0x9D81F74e01C604ee3DB2040A48fB1fA19001f9cB";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    console.log("Connecting...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    const abi = JSON.parse(fs.readFileSync('c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderABI.json', 'utf8'));
    const tender = new ethers.Contract(TENDER_ADDRESS, abi, provider);

    const m = await tender.currentMilestone();
    console.log("Current Milestone:", m.toString());

    console.log("Simulating raiseDispute from:", CONTRACTOR_ADDRESS);
    try {
        await tender.raiseDispute.staticCall(m, "test reason", { from: CONTRACTOR_ADDRESS });
        console.log("Success! No revert.");
    } catch (e) {
        console.error("REVERT INFO:", e);
    }
}

main();
