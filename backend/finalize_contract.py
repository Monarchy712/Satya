from database import SessionLocal
from models import MilestoneApproval
from blockchain import execute_milestone_with_signatures, is_milestone_executed
import time

def run_finalize():
    db = SessionLocal()
    tender_addr = "0xEBff8CF2e22dB40e1d0835B51ba289Cf452E0eEf".lower()
    milestone_id = 0 # Assuming milestone 0 based on user UI state
    
    print(f"Checking signatures for {tender_addr} milestone {milestone_id}...")
    
    # 1. Check if already executed
    if is_milestone_executed(tender_addr, milestone_id):
        print("Milestone already executed on-chain.")
        return

    # 2. Get sigs
    sigs = db.query(MilestoneApproval).filter(
        MilestoneApproval.tender_address == tender_addr,
        MilestoneApproval.milestone_id == milestone_id
    ).all()
    
    print(f"Found {len(sigs)} signatures in DB.")
    
    if len(sigs) >= 4:
        sig_list = [s.signature for s in sigs[:4]]
        try:
            print(f">>> Executing milestone {milestone_id} for tender {tender_addr}...")
            tx = execute_milestone_with_signatures(tender_addr, milestone_id, sig_list)
            receipt = tx.wait()
            print(f"Success! Tx Hash: {receipt.transactionHash.hex()}")
        except Exception as e:
            print(f"Execution failed: {e}")
    else:
        print(f"Not enough signatures to execute (need 4, got {len(sigs)})")
    
    db.close()

if __name__ == "__main__":
    run_finalize()
