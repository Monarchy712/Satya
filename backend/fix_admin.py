import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Admin

def fix_admin():
    db = SessionLocal()
    target_wallet = "0x8e5C8265Bc79222a9a03a6B12c802A62dC7e53F0".lower()
    
    print(f"Looking for admin: {target_wallet}")
    admin = db.query(Admin).filter(Admin.wallet_address == target_wallet).first()
    
    if admin:
        print(f"Admin found: {admin.wallet_address}, Role/Access Level: {admin.access_level}")
        if admin.access_level != 0:
            admin.access_level = 0
            db.commit()
            print("Access level updated to 0.")
    else:
        print("Admin not found in DB. Creating...")
        new_admin = Admin(
            wallet_address=target_wallet, 
            name="Primary Admin", 
            access_level=0
        )
        db.add(new_admin)
        db.commit()
        print("Admin created successfully.")

if __name__ == "__main__":
    fix_admin()
