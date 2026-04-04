from database import SessionLocal
from models import MilestoneApproval
from blockchain import execute_milestone_with_signatures, is_milestone_executed, w3, get_tender_details
import json

def run():
    db = SessionLocal()
    tender_addr = "0xEBff8CF2e22dB40e1d0835B51ba289Cf452E0eEf".lower()
    milestone_id = 0
    
    # 1. Check On-Chain
    try:
        details = get_tender_details(tender_addr)
        balance = w3.eth.get_balance(w3.to_checksum_address(tender_addr))
        print(f"Contract Balance: {w3.from_wei(balance, 'ether')} ETH")
        
        m = details["milestones"][milestone_id]
        payout = (int(details["winning_bid"]) * m["percentage"]) // 100
        print(f"Required Payout: {w3.from_wei(payout, 'ether')} ETH")
        
        if balance < payout:
            print("WARNING: Insufficient funds in contract for payout.")
            # but we proceed anyway to see the revert message or if the user funds it meanwhile
            
        if m["is_executed"]:
            print("Milestone already executed.")
            return
    except Exception as e:
        print(f"On-chain check failed: {e}")

    # 2. Get Sigs from DB
    sigs = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id
    ).all()
    
    print(f"Signatures in DB: {len(sigs)}")
    if len(sigs) < 4:
        print(f"Cannot execute: Only {len(sigs)} signatures found.")
        return

    # 3. Execute
    sig_list = [s.signature for s in sigs[:4]]
    try:
        print(f"Executing milestone {milestone_id} on-chain...")
        tx = execute_milestone_with_signatures(tender_addr, milestone_id, sig_list)
        print(f"SUCCESS: Transaction sent to blockchain.")
        print(f"Transaction Hash: {tx.hash.hex()}")
        print("Note: You can check this hash on Sepolia Etherscan. If it reverts, ensure the contract has enough ETH balance for payout.")
    except Exception as e:
        print(f"EXECUTION FAILED: {e}")

    db.close()

if __name__ == "__main__":
    run()
