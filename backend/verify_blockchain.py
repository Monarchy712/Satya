from blockchain import w3, factory_contract, FACTORY_ADDRESS, check_is_government
from config import RPC_URL

def verify_blockchain():
    print(f"Connecting to RPC: {RPC_URL}")
    print(f"Factory Address: {FACTORY_ADDRESS}")
    
    if not w3.is_connected():
        print("❌ Failed to connect to Ethereum node.")
        return

    print("✓ Connected to Ethereum node.")
    
    try:
        # Check factory contract
        is_gov = check_is_government("0x88adD22b0107A7C7Ac4AEBD3C70ca057A933Ae71")
        print(f"✓ Check isGovernment for 0x88adD...: {is_gov}")
        
        # Get tender count
        if factory_contract:
            tenders = factory_contract.functions.getAllTenders().call()
            print(f"✓ Total Tenders found on-chain: {len(tenders)}")
            for t in tenders:
                print(f"  - Tender: {t[0]}, EndTime: {t[2]}")
        else:
            print("❌ Factory contract not initialized correctly.")
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")

if __name__ == "__main__":
    verify_blockchain()
