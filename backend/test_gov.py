from web3 import Web3
import json

w3 = Web3(Web3.HTTPProvider("https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE"))
factory_address = "0x557f0988F9cD626799eb35E4D0a1b4B7fC484B11"

# isGovernment ABI
abi = [{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isGovernment","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]

contract = w3.eth.contract(address=w3.to_checksum_address(factory_address), abi=abi)

target = "0x8e5C8265Bc79222a9a03a6B12c802A62dC7e53F0"
print(f"Address: {target}")
is_gov = contract.functions.isGovernment(w3.to_checksum_address(target)).call()
print(f"isGovernment: {is_gov}")
