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
    account = w3.eth.account.from_key(PRIVATE_KEY)
    contract = w3.eth.contract(address=w3.to_checksum_address(CONTRACT_ADDRESS), abi=ABI)
    factory_contract = w3.eth.contract(address=w3.to_checksum_address(FACTORY_ADDRESS), abi=FACTORY_ABI)
except Exception as e:
    print(f"Blockchain module warned: {e}")
    contract = None
    factory_contract = None
    account = None


# ── Tender Contract Info ──
TENDER_ABI = json.loads("""
[
    {
        "inputs": [],
        "name": "tenderStatus",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "contractor",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "startTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "endTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "biddingEndTime",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "winningBid",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "contractorDeposit",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "retainedPercent",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentMilestone",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "onSiteEngineer",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "complianceOfficer",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "financialAuditor",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "sanctioningAuthority",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "bids",
        "outputs": [
            {"internalType": "address", "name": "bidder", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "milestones",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint256", "name": "percentage", "type": "uint256"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"},
            {"internalType": "uint256", "name": "completionPercent", "type": "uint256"},
            {"internalType": "uint256", "name": "depositShare", "type": "uint256"},
            {"internalType": "uint8", "name": "status", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "percent",
				"type": "uint256"
			}
		],
		"name": "evaluateMilestone",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			}
		],
		"name": "submitWorkForReview",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
""")

class TxWrapper:
    def __init__(self, tx_hash):
        self.hash = tx_hash
    def wait(self):
        return w3.eth.wait_for_transaction_receipt(self.hash)

class TenderContractWrapper:
    def __init__(self, address, signer):
        self.contract = w3.eth.contract(address=w3.to_checksum_address(address), abi=TENDER_ABI)
        self.signer = signer
    
    def _send_tx(self, func, *args):
        tx = func(*args).build_transaction({
            'from': self.signer.address,
            'nonce': w3.eth.get_transaction_count(self.signer.address),
            'maxFeePerGas': w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': w3.eth.max_priority_fee or w3.to_wei(1, 'gwei'),
        })
        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        return TxWrapper(tx_hash)

    def evaluateMilestone(self, milestone_id, percent):
        return self._send_tx(self.contract.functions.evaluateMilestone, milestone_id, percent)

    def submitWorkForReview(self, milestone_id):
        return self._send_tx(self.contract.functions.submitWorkForReview, milestone_id)

def get_government_signer():
    """Returns the account object for signing government actions."""
    return account

def get_tender_contract(tender_address: str, signer):
    """Returns a wrapped contract instance that supports Brownie-style .wait() syntax."""
    return TenderContractWrapper(tender_address, signer)

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
    """Aggregates all tender data from the blockchain by iterating through missing getters."""
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
        "contractor_deposit": str(tender_contract.functions.contractorDeposit().call()),
        "retained_percent": tender_contract.functions.retainedPercent().call(),
        "current_milestone": tender_contract.functions.currentMilestone().call(),
        "on_site_engineer": tender_contract.functions.onSiteEngineer().call(),
        "compliance_officer": tender_contract.functions.complianceOfficer().call(),
        "financial_auditor": tender_contract.functions.financialAuditor().call(),
        "sanctioning_authority": tender_contract.functions.sanctioningAuthority().call(),
    }

    # Bids (Index Loop)
    bids = []
    idx = 0
    while True:
        try:
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
            milestones.append({
                "name": m[0],
                "percentage": m[1],
                "deadline": m[2],
                "completion_percent": m[3],
                "deposit_share": str(m[4]),
                "status": m[5]
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
    """Returns a list of tender addresses where this wallet is a signatory."""
    addr = wallet_address.lower()
    tenders = get_all_tenders_aggregated()
    signatory_for = []
    
    for t in tenders:
        # Check against on-chain signatories
        roles = [
            t.get("on_site_engineer", "").lower(),
            t.get("compliance_officer", "").lower(),
            t.get("financial_auditor", "").lower(),
            t.get("sanctioning_authority", "").lower()
        ]
        if addr in roles:
            signatory_for.append(t["tender_address"])
            
    return signatory_for
