import { ethers } from 'ethers';
import fs from 'fs';

const FACTORY_ADDRESS = "0x760a12501f98E1b4Fbd4b821C55c0432C17C3C8c";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const abi = JSON.parse(fs.readFileSync('c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderFactoryABI.json', 'utf8'));
    const factory = new ethers.Contract(FACTORY_ADDRESS, abi, provider);

    const pools = await factory.getAllRolePools();
    console.log("Pools:", pools);
    const total = pools[0].length + pools[1].length + pools[2].length + pools[3].length;
    console.log("Total members in factory pools:", total);
}

main();
