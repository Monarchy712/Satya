import os
import requests
import urllib3
import json
from web3 import Web3
from eth_utils import keccak
from config import CONTRACT_ADDRESS, RPC_URL, PRIVATE_KEY, FACTORY_ADDRESS

# ── Factory Info ──
# FACTORY_ADDRESS imported from config

FACTORY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "_gov", "type": "address"}],
        "name": "addGovernment",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllTenders",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "tender", "type": "address"},
                    {"internalType": "uint256", "name": "startTime", "type": "uint256"},
                    {"internalType": "uint256", "name": "endTime", "type": "uint256"},
                    {"internalType": "uint256", "name": "biddingEndTime", "type": "uint256"}
                ],
                "internalType": "struct TenderFactory.TenderMeta[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "isGovernment",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
        "name": "getUserTenders",
        "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function"
    }
]


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
    """Aggregates all tender data from the blockchain. Uses the new admins array and EIP-712 multisig fields."""
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
    }

    # Admins array lookup
    try:
        data["on_site_engineer"] = tender_contract.functions.admins(0).call()
        data["compliance_officer"] = tender_contract.functions.admins(1).call()
        data["financial_auditor"] = tender_contract.functions.admins(2).call()
        data["sanctioning_authority"] = tender_contract.functions.admins(3).call()
    except Exception:
        # Fallback for older contracts if any exist
        zero_addr = "0x0000000000000000000000000000000000000000"
        data["on_site_engineer"] = zero_addr
        data["compliance_officer"] = zero_addr
        data["financial_auditor"] = zero_addr
        data["sanctioning_authority"] = zero_addr

    # Bids (Index Loop)
    bids = []
    idx = 0
    while True:
        try:
            # Note: Tender.sol doesnt have a bids count, so we loop until error
            bid = tender_contract.functions.bids(idx).call()
            bids.append({"bidder": bid[0], "amount": str(bid[1])})
            idx += 1
        except Exception:
            break
    data["bids"] = bids

    # Milestones (Index Loop)
    milestones = []
    idx = 0
    while True:
        try:
            m = tender_contract.functions.milestones(idx).call()
            # New Indices: 0: name, 1: percentage, 2: deadline, 3: status
            
            # Check signatures for this milestone
            sig_count = 0
            # Indices for admins: on_site(0), compliance(1), financial(2), sanctioning(3)
            for i in range(4):
                try:
                    admin_addr = tender_contract.functions.admins(i).call()
                    if admin_addr and admin_addr != "0x0000000000000000000000000000000000000000":
                        if tender_contract.functions.hasSigned(idx, admin_addr).call():
                            sig_count += 1
                except:
                    continue

            milestones.append({
                "name": m[0],
                "percentage": m[1],
                "deadline": m[2],
                "status": m[3],
                "signatures_collected": sig_count,
                "is_executed": tender_contract.functions.executed(idx).call()
            })
            idx += 1
        except Exception:
            break
    data["milestones"] = milestones

    return data


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
