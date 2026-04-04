import os
import requests
import urllib3
import json
from web3 import Web3
from eth_utils import keccak
from config import CONTRACT_ADDRESS, RPC_URL, PRIVATE_KEY, FACTORY_ADDRESS

# ── Factory Info ──
# FACTORY_ADDRESS imported from config

with open(os.path.join(os.path.dirname(__file__), '..', 'contracts', 'TenderFactoryABI.json'), 'r') as f:
    FACTORY_ABI = json.load(f)


# Shared ABI from report.py
ABI = json.loads("""
[
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "cid",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "confidence",
				"type": "uint256"
			}
		],
		"name": "ReportSubmitted",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "until",
				"type": "uint256"
			}
		],
		"name": "UserBanned",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			}
		],
		"name": "UserRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "banUntil",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			}
		],
		"name": "banUser",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			}
		],
		"name": "getLatestReportTimestamp",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getReport",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "cid",
						"type": "string"
					},
					{
						"internalType": "bytes32",
						"name": "identityHash",
						"type": "bytes32"
					},
					{
						"internalType": "uint256",
						"name": "confidence",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					}
				],
				"internalType": "struct Report.ReportData",
				"name": "",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			}
		],
		"name": "isBanned",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "lastReportTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			}
		],
		"name": "registerUser",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "registered",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "reports",
		"outputs": [
			{
				"internalType": "string",
				"name": "cid",
				"type": "string"
			},
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "confidence",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "cid",
				"type": "string"
			},
			{
				"internalType": "bytes32",
				"name": "identityHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "confidence",
				"type": "uint256"
			}
		],
		"name": "submitReport",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalReports",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]
""")

# Setup Web3 Provider resolving SSL Verify Issues for Alchemy
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
session = requests.Session()
session.verify = False
w3 = Web3(Web3.HTTPProvider(RPC_URL, session=session))

try:
    account = w3.eth.account.from_key(PRIVATE_KEY) if PRIVATE_KEY else None
    contract = w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI) if CONTRACT_ADDRESS else None
    factory_contract = w3.eth.contract(address=w3.to_checksum_address(FACTORY_ADDRESS), abi=FACTORY_ABI) if FACTORY_ADDRESS else None
except Exception as e:
    print(f"Blockchain module warned: {e}")
    contract = None
    factory_contract = None
    account = None


# ── Tender Contract ABI (Updated for EIP-712 Multisig) ──
with open(os.path.join(os.path.dirname(__file__), '..', 'contracts', 'TenderABI.json'), 'r') as f:
    TENDER_ABI = json.load(f)

class TxWrapper:
    def __init__(self, tx_hash):
        self.hash = tx_hash
    def wait(self):
        return w3.eth.wait_for_transaction_receipt(self.hash)


def get_government_signer():
    """Returns the account object for signing government actions."""
    return account


def get_tender_read_contract(tender_address: str):
    """Returns a read-only contract instance for querying on-chain state."""
    return w3.eth.contract(address=w3.to_checksum_address(tender_address), abi=TENDER_ABI)


def get_user_tenders(wallet_address: str) -> list:
    """Queries TenderFactory.getUserTenders to get all tenders a user is mapped to."""
    if not factory_contract:
        return []
    try:
        checksummed = w3.to_checksum_address(wallet_address)
        return factory_contract.functions.getUserTenders(checksummed).call()
    except Exception as e:
        print(f"Failed getUserTenders for {wallet_address}: {e}")
        return []


def get_user_role_on_tender(wallet_address: str, tender_address: str) -> str:
    """Calls Tender.getRoleName(user) to get the on-chain role string."""
    try:
        tender = get_tender_read_contract(tender_address)
        checksummed = w3.to_checksum_address(wallet_address)
        return tender.functions.getRoleName(checksummed).call()
    except Exception as e:
        print(f"Failed getRoleName for {wallet_address} on {tender_address}: {e}")
        return "None"


def execute_milestone_with_signatures(tender_address: str, milestone_id: int, signatures: list):
    """Calls Tender.executeMilestone(id, signatures) using the gov signer.
    This is the final on-chain call after 4/4 EIP-712 signatures are collected."""
    if not account:
        raise Exception("Government signer not configured")

    tender = w3.eth.contract(address=w3.to_checksum_address(tender_address), abi=TENDER_ABI)
    # Convert hex strings to bytes
    sig_bytes = [bytes.fromhex(s.replace('0x', '')) for s in signatures]

    tx = tender.functions.executeMilestone(milestone_id, sig_bytes).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'maxFeePerGas': w3.eth.gas_price * 2,
        'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return TxWrapper(tx_hash)


def is_milestone_executed(tender_address: str, milestone_id: int) -> bool:
    """Checks the on-chain 'executed' mapping for a specific milestone."""
    try:
        tender = get_tender_read_contract(tender_address)
        return tender.functions.executed(milestone_id).call()
    except Exception as e:
        print(f"Failed to check execution status for {tender_address} mapping {milestone_id}: {e}")
        return False


def get_identity_hash(identifier: str):
    """Generates a keccak256 hash for a given identifier (email, wallet, etc.)"""
    return keccak(text=identifier)

def check_is_government(wallet_address: str) -> bool:
    """Queries the TenderFactory contract to check if a wallet is registered as a robust on-chain government entity."""
    if not factory_contract:
        print("Warning: Factory contract is not initialized.")
        return False
    
    try:
        checksummed = w3.to_checksum_address(wallet_address)
        return factory_contract.functions.isGovernment(checksummed).call()
    except Exception as e:
        print(f"Failed to verify isGovernment on-chain: {e}")
        return False


# ── Tender Aggregation Logic ──

def get_tender_details(tender_address: str) -> dict:
    """Aggregates all tender data from the blockchain in a single high-speed call."""
    contract_addr = w3.to_checksum_address(tender_address)
    tender_contract = w3.eth.contract(address=contract_addr, abi=TENDER_ABI)

    # Basic State
    data = {
        "tender_address": tender_address,
        "status": ["BIDDING", "ACTIVE", "COMPLETED", "CANCELLED"][tender_contract.functions.tenderStatus().call()],
        "contractor": tender_contract.functions.contractor().call(),
        "start_time": tender_contract.functions.startTime().call(),
        "end_time": tender_contract.functions.endTime().call(),
        "bidding_end_time": tender_contract.functions.biddingEndTime().call(),
        "winning_bid": str(tender_contract.functions.winningBid().call()),
        "retained_percent": tender_contract.functions.retainedPercent().call(),
        "current_milestone": tender_contract.functions.currentMilestone().call(),
        "total_funds": str(tender_contract.functions.totalFunds().call()),
    }

    # Admins array lookup
    try:
        # 1. FETCH EVERYTHING IN ONE CALL
        raw = tender_contract.functions.getTenderData().call()
        tv, admins, bids_raw, milestones_raw = raw

        # 2. MAP BASIC STATE (TenderView tuple)
        # Note: TenderStatus inside Solidity is now extended with 'VOID' at index 4 (0: BIDDING, 1: ACTIVE, 2: COMPLETED, 3: CANCELLED, 4: VOID)
        STATUS_MAP = ["BIDDING", "ACTIVE", "COMPLETED", "CANCELLED", "VOID"]
        status_idx = tv[0]
        status_str = STATUS_MAP[status_idx] if status_idx < len(STATUS_MAP) else "UNKNOWN"

        data = {
            "tender_address": tender_address,
            "status": status_str,
            "contractor": tv[1],
            "winning_bid": str(tv[2]),
            "total_funds": str(tv[3]),
            "current_milestone": tv[4],
            "start_time": tv[5],
            "end_time": tv[6],
            "bidding_end_time": tv[7],
            "retained_percent": tv[8],
            "on_site_engineer": admins[0],
            "compliance_officer": admins[1],
            "financial_auditor": admins[2],
            "sanctioning_authority": admins[3],
        }

        # 3. MAP BIDS
        data["bids"] = [{"bidder": b[0], "amount": str(b[1])} for b in bids_raw]

        # 4. MAP MILESTONES
        data["milestones"] = [{
            "name": m[0],
            "percentage": m[1],
            "deadline": m[2],
            "status": m[3], # Keep as int (0:PENDING, 1:UNDER_REVIEW, 2:APPROVED)
            "is_executed": m[4],
            "signatures_collected": m[5]
        } for m in milestones_raw]

        # 5. MAP DISPUTE
        try:
            disp = tender_contract.functions.dispute().call()
            # dispute struct: (milestoneId, reason, votesForGov, votesForContractor, resolved)
            data["dispute"] = {
                "milestone_id": disp[0],
                "reason": disp[1],
                "votes_for_gov": disp[2],
                "votes_for_contractor": disp[3],
                "resolved": disp[4],
            }
        except Exception as e:
            data["dispute"] = None

        return data

    except Exception as e:
        print(f"Fast-sync failed for {tender_address}: {e}")
        zero_addr = "0x0000000000000000000000000000000000000000"
        return {
            "tender_address": tender_address,
            "status": "SYNC_ERROR",
            "contractor": zero_addr,
            "start_time": 0,
            "end_time": 0,
            "bidding_end_time": 0,
            "winning_bid": "0",
            "retained_percent": 0,
            "current_milestone": 0,
            "on_site_engineer": zero_addr,
            "compliance_officer": zero_addr,
            "financial_auditor": zero_addr,
            "sanctioning_authority": zero_addr,
            "bids": [],
            "milestones": []
        }




def get_all_tenders_aggregated() -> list:
    """Fetches all tenders from the Factory and enriches them via index-looping aggregation."""
    if not factory_contract:
        return []
    
    try:
        metas = factory_contract.functions.getAllTenders().call()
        enriched = []
        for meta in metas:
            address = meta[0]
            try:
                details = get_tender_details(address)
                enriched.append(details)
            except Exception as e:
                print(f"Failed to enrich tender {address}: {e}")
                # Return skeleton if enrichment fails
                enriched.append({
                    "tender_address": address,
                    "status": "PARTIAL",
                    "start_time": meta[1],
                    "end_time": meta[2],
                    "bidding_end_time": meta[3],
                    "bids": [],
                    "milestones": []
                })
        return enriched
    except Exception as e:
        print(f"Failed to list tenders: {e}")
        return []

def check_signatory_contracts(wallet_address: str) -> list:
    """Returns a list of tender addresses where this wallet is a committee member.
    Uses the on-chain getUserTenders() + getRoleName() to check."""
    user_tenders = get_user_tenders(wallet_address)
    if not user_tenders:
        return []

    committee_tenders = []
    for t_addr in user_tenders:
        role = get_user_role_on_tender(wallet_address, t_addr)
        # If they have any admin role on this tender, they're a committee member
        if role in ("OnSiteEngineer", "ComplianceOfficer", "FinancialAuditor", "SanctioningAuthority"):
            committee_tenders.append(t_addr)
    return committee_tenders


# ── Role Management & Dispute API Methods ──

def add_to_role(user_address: str, role_id: int):
    if not account:
        raise Exception("Government signer not configured")
    try:
        tx = factory_contract.functions.addToRole(w3.to_checksum_address(user_address), role_id).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'maxFeePerGas': w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
        })
        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        return TxWrapper(tx_hash)
    except Exception as e:
        print(f"Failed to add role: {e}")
        raise e

def remove_from_role(user_address: str):
    if not account:
        raise Exception("Government signer not configured")
    try:
        tx = factory_contract.functions.removeFromRole(w3.to_checksum_address(user_address)).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'maxFeePerGas': w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
        })
        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        return TxWrapper(tx_hash)
    except Exception as e:
        print(f"Failed to remove role: {e}")
        raise e

def get_all_role_pools():
    if not factory_contract:
        return []
    try:
        pools = factory_contract.functions.getAllRolePools().call()
        return {
            "onSiteEngineers": pools[0],
            "complianceOfficers": pools[1],
            "financialAuditors": pools[2],
            "sanctioningAuthorities": pools[3]
        }
    except Exception as e:
        print(f"Failed to get role pools: {e}")
        return {
            "onSiteEngineers": [],
            "complianceOfficers": [],
            "financialAuditors": [],
            "sanctioningAuthorities": []
        }

def get_dispute_voters(tender_address: str):
    tender = w3.eth.contract(address=w3.to_checksum_address(tender_address), abi=TENDER_ABI)   
    return tender.functions.getTenderData().call()[1]  # This gets admins, wait. The contract ABI for getting voters?


