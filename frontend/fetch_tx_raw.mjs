import axios from 'axios';

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    console.log("Fetching block details...");
    
    // Call eth_getBlockByHash
    const response = await axios.post(RPC_URL, {
        jsonrpc: "2.0",
        method: "eth_getBlockByHash",
        params: ["0x97ddac2d529d3f2b307c3ac9715bc5b57b25d9601e4e6b230e26011f5db0176c", true],
        id: 1
    });
    
    if (!response.data.result) {
        console.log("Block not found.");
        return;
    }
    
    const txs = response.data.result.transactions;
    console.log(`Block contains ${txs.length} txs.`);
    
    for (const tx of txs) {
        if (tx.from && tx.from.toLowerCase() === "0x9D81F74e01C604ee3DB2040A48fB1fA19001f9cB".toLowerCase()) {
            console.log("Found user tx:", tx.hash);
            
            const receiptResp = await axios.post(RPC_URL, {
                jsonrpc: "2.0",
                method: "eth_getTransactionReceipt",
                params: [tx.hash],
                id: 1
            });
            
            const receipt = receiptResp.data.result;
            console.log("Tx Status:", receipt.status);
            console.log("Gas Used:", parseInt(receipt.gasUsed, 16));
            
            // Replay to get reason string
            const callResp = await axios.post(RPC_URL, {
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{
                    to: tx.to,
                    from: tx.from,
                    data: tx.input,
                    value: tx.value
                }, "0x" + (parseInt(response.data.result.number, 16) - 1).toString(16)],
                id: 1
            });
            console.log("Replay output:", callResp.data);
            
            // Try tracing
            const traceResp = await axios.post(RPC_URL, {
                jsonrpc: "2.0",
                method: "debug_traceCall",
                params: [{
                    to: tx.to,
                    from: tx.from,
                    data: tx.input,
                    value: tx.value
                }, "0x" + (parseInt(response.data.result.number, 16) - 1).toString(16), {"tracer": "callTracer"}],
                id: 1
            });
            console.log("Trace Out:", JSON.stringify(traceResp.data.result || traceResp.data.error, null, 2));
        }
    }
}
main();
