import { ethers } from 'ethers';

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const blockHash = "0x97ddac2d529d3f2b307c3ac9715bc5b57b25d9601e4e6b230e26011f5db0176c";
    console.log("Fetching block:", blockHash);
    const block = await provider.getBlock(blockHash, true); // true = prefetched transactions
    
    if (!block) {
        console.log("Block not found!");
        return;
    }
    
    console.log("Total txs:", block.transactions.length);
    for (const tx of block.transactions) {
        if (tx.from.toLowerCase() === "0x9D81F74e01C604ee3DB2040A48fB1fA19001f9cB".toLowerCase() && 
            tx.to && tx.to.toLowerCase() === "0xA511B506b3D31717356F4d93aBF610B4B4bD1E9c".toLowerCase()) {
            console.log("Found our tx:", tx.hash);
            
            // Get receipt
            const receipt = await provider.getTransactionReceipt(tx.hash);
            console.log("Status:", receipt.status);
            console.log("Gas Used:", receipt.gasUsed.toString());
            
            // Try to replay to get revert reason
            try {
                await provider.call({
                    to: tx.to,
                    from: tx.from,
                    data: tx.data,
                    value: tx.value
                }, block.number - 1);
                console.log("Replay successful (no revert)?!");
            } catch (e) {
                console.log("Replay Revert Reason:", e.info || e.message || e);
            }
        }
    }
}

main();
