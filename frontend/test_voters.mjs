import { ethers } from 'ethers';
import fs from 'fs';

const TENDER_ADDRESS = "0xA511B506b3D31717356F4d93aBF610B4B4bD1E9c";
const FACTORY_ADDRESS = "0x760a12501f98E1b4Fbd4b821C55c0432C17C3C8c";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tenderAbi = JSON.parse(fs.readFileSync('c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderABI.json', 'utf8'));
    const factoryAbi = JSON.parse(fs.readFileSync('c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderFactoryABI.json', 'utf8'));
    
    const tender = new ethers.Contract(TENDER_ADDRESS, tenderAbi, provider);
    const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);

    const pools = await factory.getAllRolePools();
    const allAddresses = [
        ...pools[0], ...pools[1], ...pools[2], ...pools[3]
    ];
    
    console.log("Found members in pools:", allAddresses);
    
    for (const addr of allAddresses) {
        try {
            await tender.vote.staticCall(true, { from: addr, gasLimit: 300000 });
            console.log(`Address ${addr} CAN vote (Success)`);
        } catch (e) {
            console.log(`Address ${addr} staticCall Reverted with:`, e.reason || e.message || "Unknown error");
        }
    }
}
main();
