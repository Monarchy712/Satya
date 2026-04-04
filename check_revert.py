import requests
import json
from web3 import Web3

RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE"
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# The tender address from the screenshot
TENDER_ADDRESS = "0xA511B506b3D31717356F4d93aBF610B4B4bD1E9c"
CONTRACTOR_ADDRESS = "0x9D81F74e01C604ee3DB2040A48fB1fA19001f9cB"

def check_revert():
    with open("c:/Users/samya/OneDrive/Desktop/Satya/Contracts/contracts/TenderABI.json", "r") as f:
        abi = json.load(f)
    
    tender = w3.eth.contract(address=w3.to_checksum_address(TENDER_ADDRESS), abi=abi)
    
    print("Checking tender state...")
    status = tender.functions.tenderStatus().call()
    print("Status:", status)
    
    cur_milestone = tender.functions.currentMilestone().call()
    print("Current Milestone:", cur_milestone)
    
    contractor = tender.functions.contractor().call()
    print("Contractor on chain:", contractor)
    
    dispute = tender.functions.dispute().call()
    print("Dispute state:", dispute)
    
    print("Simulating raiseDispute...")
    try:
        # Simulate what the frontend did
        tender.functions.raiseDispute(cur_milestone, "Conflict test").call({"from": w3.to_checksum_address(CONTRACTOR_ADDRESS)})
        print("Success! (No revert)")
    except Exception as e:
        print("REVERT REASON:", str(e))

if __name__ == "__main__":
    check_revert()
