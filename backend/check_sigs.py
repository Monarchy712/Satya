from database import SessionLocal
from models import MilestoneApproval
import json

db = SessionLocal()
tender_addr = "0xEBff8CF2e22dB40e1d0835B51ba289Cf452E0eEf".lower()
sigs = db.query(MilestoneApproval).filter(MilestoneApproval.tender_address == tender_addr).all()

print(f"Total signatures for {tender_addr}: {len(sigs)}")
for s in sigs:
    print(f"Milestone {s.milestone_id}: {s.admin_address} ({s.role})")

db.close()
