import os
from web3 import Web3
from dotenv import load_dotenv
import json

# Ensure we're in the right directory or provide full path to .env
load_dotenv('backend/.env')

RPC_URL = os.getenv("RPC_URL")
TENDER_ADDR = "0x898E3ceff1c43AA8AC6f58592C06F448DBe6c6d0"

# Find ABI file
abi_path = 'contracts/TenderABI.json'

with open(abi_path, 'r') as f:
    ABI = json.load(f)

w3 = Web3(Web3.HTTPProvider(RPC_URL))
tender = w3.eth.contract(address=w3.to_checksum_address(TENDER_ADDR), abi=ABI)

print(f"--- Tender Diagnostics for {TENDER_ADDR} ---")
try:
    balance = w3.eth.get_balance(TENDER_ADDR)
    print(f"Contract Balance: {w3.from_wei(balance, 'ether')} ETH")
    
    status = tender.functions.tenderStatus().call()
    print(f"Tender Status: {['BIDDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'][status]}")
    
    curr_m = tender.functions.currentMilestone().call()
    print(f"Current Milestone Index: {curr_m}")
    
    winning_bid = tender.functions.winningBid().call()
    print(f"Winning Bid: {w3.from_wei(winning_bid, 'ether')} ETH")
    
    m_info = tender.functions.milestones(curr_m).call()
    # 0: name, 1: percentage, 2: deadline, 3: depositShare, 4: status
    percentage = m_info[1]
    m_status = m_info[4]
    print(f"Milestone {curr_m} Name: {m_info[0]}")
    print(f"Milestone {curr_m} Weight: {percentage}%")
    print(f"Milestone {curr_m} Status: {['PENDING', 'UNDER_REVIEW', 'APPROVED'][m_status]}")
    
    payout_needed = (winning_bid * percentage) // 100
    print(f"Payout Needed for Milestone {curr_m}: {w3.from_wei(payout_needed, 'ether')} ETH")
    
    if balance < payout_needed:
        print(f"!!! ALERT: Insufficient balance. Need {w3.from_wei(payout_needed, 'ether')} ETH, but only have {w3.from_wei(balance, 'ether')} ETH.")
    else:
        print("Balance is sufficient for payout.")

    # Check signatures on-chain
    sig_count = 0
    for i in range(4):
        admin = tender.functions.admins(i).call()
        if tender.functions.hasSigned(curr_m, admin).call():
            sig_count += 1
    print(f"On-chain Signatures for Milestone {curr_m}: {sig_count}/4")

except Exception as e:
    print(f"Error during diagnostics: {e}")
