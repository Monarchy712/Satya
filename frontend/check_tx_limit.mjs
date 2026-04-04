import axios from 'axios';

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE";

async function main() {
    const response = await axios.post(RPC_URL, {
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: ["0xa67980f9eea393e09cde213f11c8c7b0ca40b84b03704115c704f3691e037400"],
        id: 1
    });
    
    if (response.data.result) {
        console.log("Gas Limit:", parseInt(response.data.result.gas, 16));
    }
}
main();
