# Project Satya - Copilot Instructions

## Project Overview

**Satya** is a blockchain-powered transparency and accountability platform for India's infrastructure procurement and delivery ecosystem. It uses smart contracts, EIP-712 multisig approvals, and AI-powered defect detection to prevent corruption in government tenders worth billions of rupees.

### Core Problem
India loses ₹2.17 trillion annually to corruption in public infrastructure. Satya eliminates single-point approval systems and makes corruption visible, traceable, and financially painful through cryptographic consensus and immutable audit trails.

### Architecture

**3-Tier Stack:**
- **Frontend**: React + Vite + ethers.js (Wallet-first UI)
- **Backend**: FastAPI + SQLAlchemy + Web3.py
- **Blockchain**: Solidity smart contracts (TenderFactory + Tender) with EIP-712 multisig

**Data Flow:**
1. User authenticates via MetaMask signature verification (nonce-based)
2. Government creates tenders → TenderFactory deploys Tender contracts
3. Contractors bid → Government selects winner
4. Contractor submits milestones → 4 admins sign EIP-712 messages off-chain
5. Backend collects signatures → calls `executeMilestone()` on-chain
6. Funds released automatically, milestone transitions to next phase

## Build, Test, and Run Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload  # Development server at http://127.0.0.1:8000
```

**Environment Setup:**
- Copy `.env.example` → `.env` (if exists)
- Required vars: `JWT_SECRET`, `FACTORY_ADDRESS`, `RPC_URL`, `PRIVATE_KEY`

**Database Initialization:**
```bash
python init_db.py        # Create tables
python seed_contractors.py  # Seed test data
```

**Testing:**
```bash
python test_gov.py       # Test government blockchain operations
pytest                   # Run test suite (if configured)
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev     # Dev server at http://localhost:5173
npm run build   # Production build
npm run lint    # ESLint check
```

### Smart Contracts
- **Location**: `contracts/` directory
- **ABI Files**: `TenderABI.json`, `TenderFactoryABI.json`
- **Deployment**: Manual deployment via Hardhat/Remix (no build scripts in repo)
- Contract addresses are hardcoded in `backend/config.py` and `frontend/src/utils/contracts.js`

## Key Conventions

### Authentication & Wallet Integration
- **Signature-based auth**: Users sign nonce messages with MetaMask, backend verifies with `eth_account`
- **JWT tokens**: Issued after successful signature verification, stored in frontend
- **Nonce rotation**: New nonce generated after each successful login (`auth.py::build_sign_message()`)
- **Role enforcement**: Smart contracts enforce roles (GOVERNMENT, CONTRACTOR, ON_SITE_ENGINEER, etc.)

### Smart Contract Interactions

**EIP-712 Multisig Pattern:**
- Admins sign typed data off-chain (domain: "Tender", type: "Approve")
- Backend aggregates 4 signatures → calls `executeMilestone(id, bytes[] signatures)`
- Contract verifies all signatures on-chain via `ecrecover`
- **Never** submit transactions directly from frontend for milestone approvals

**Transaction Priority Mapping** (for future gas optimization):
| Function | Priority | Note |
|----------|----------|------|
| `executeMilestone`, `finalize`, `selectContractor` | High (20s target) | Critical, no delay |
| `submitMilestone`, `submitReport` | Medium (40s target) | Allow small delay |
| `createTender`, `registerUser` | Low (60s target) | Wait for low congestion |

### Database Patterns
- **SQLAlchemy ORM**: All models in `backend/models.py`
- **UUID primary keys**: For Admin, Contractor tables
- **Nonce storage**: Per-user nonce stored in DB for auth challenges
- **Signature tracking**: `MilestoneApproval` table stores EIP-712 signatures
- **Tender metadata**: Off-chain data in `TenderMetadata` (selection notes, etc.)

### Frontend Structure
```
src/
├── components/
│   ├── Admin/          # SignatoryDashboard, AdminDashboard
│   ├── Contractor/     # ContractorDashboard
│   ├── Ledger/         # Contract cards, milestone views
│   ├── Tenders/        # Tender creation/bidding
│   └── Auth/           # Wallet authentication
├── utils/
│   ├── api.js          # Backend HTTP calls (axios)
│   ├── metamask.js     # Wallet connection
│   ├── contracts.js    # Contract ABIs + addresses
│   └── ledgerData.js   # Mock/test data
└── context/            # React context providers
```

**Component Patterns:**
- Wallet connection via `utils/metamask.js::connectMetaMask()`
- Contract calls use `ethers.Contract` with ABIs from `contracts.js`
- Backend API calls use axios with base URL `http://127.0.0.1:8000`

### API Routers (FastAPI)
- `citizen.py` - Citizen authentication
- `wallet.py` - Admin/contractor wallet auth
- `tenders.py` - Tender CRUD operations
- `admin_tasks.py` - Multisig signature collection
- `report.py` - Citizen oversight reports (IPFS integration)

### Module Integration Notes

**Feature Folders** (pending integration):
1. **admin_approval_feature/**: React component for milestone approval UI
   - Move to `frontend/src/components/AdminApproval/`
   - Merge API functions into `utils/api.js`

2. **fault_detection/**: Roboflow computer vision for construction defects
   - Integrate `imageAnalysis.py` into photo upload pipeline
   - Move API key to `.env`, return JSON (not plots)
   - Use for trust score calculation in fund approvals

3. **gas_price_prediction/**: Dynamic gas price optimizer
   - Run `optimalGasPricePrediction.py` every 5 seconds in background
   - Store 3 priority levels (20s, 40s, 60s confirmation targets)
   - Fetch from cache before sending transactions (never compute on-demand)

4. **context_comparator/**: Gemini embeddings for text similarity
   - `compare_texts(text1, text2)` uses cosine similarity
   - Migrate API key to environment variables
   - Potential use: duplicate report detection

5. **ipfs_folder/**: IPFS upload service (separate Vite app)
   - Integration pending with main frontend

## Environment Variables

**Backend (`backend/.env`):**
```env
JWT_SECRET=<random-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
FACTORY_ADDRESS=0xebc2847096aB4F2b747bC190515f288babda9211
RPC_URL=<ethereum-node-url>
PRIVATE_KEY=<deployer-wallet-private-key>
```

**Feature Modules:**
- `fault_detection/`: Roboflow API key (currently in `api_key.txt` - migrate to env)
- `context_comparator/`: Gemini API key (currently in `api_key.txt` - migrate to env)

## Blockchain Integration

### Contracts
- **TenderFactory**: Deploys Tender contracts, tracks government accounts
- **Tender**: Manages bidding, contractor selection, milestone lifecycle

### Key Functions
- `TenderFactory.createTender(...)` → Returns new Tender address
- `Tender.selectContractor(address, uint256)` → Activates contract
- `Tender.submitMilestone(uint256 id)` → Changes status to UNDER_REVIEW
- `Tender.executeMilestone(uint256 id, bytes[] signatures)` → Verifies 4 admins, releases funds

### Status Enums
- **TenderStatus**: BIDDING, ACTIVE, COMPLETED, CANCELLED
- **MilestoneStatus**: PENDING, UNDER_REVIEW, APPROVED
- **Role**: NONE, ON_SITE_ENGINEER, COMPLIANCE_OFFICER, FINANCIAL_AUDITOR, SANCTIONING_AUTHORITY, CONTRACTOR, GOVERNMENT

## Common Pitfalls

1. **Never bypass multisig**: All milestone approvals MUST go through EIP-712 signature collection
2. **MetaMask network**: Ensure frontend and backend use same chain ID
3. **Contract addresses**: Update both `backend/config.py` and `frontend/src/utils/contracts.js` after redeployment
4. **CORS**: Backend allows `localhost:5173` and `localhost:5174` only
5. **Nonce rotation**: Always generate new nonce after successful auth to prevent replay attacks

## Hackathon & UX preferences

- This project targets hackathons: prioritize polished, flashy UX that impresses judges. Prefer rich, animated loading overlays or modals with descriptive step text and progress indicators over small per-button toggles. Examples: a full-screen translucent overlay showing milestone status and an animated progress bar, skeleton loaders, or celebratory micro-interactions on success.

- Pay attention to the existing color scheme and design choices: align new animations, overlays, and components with the project's current palette and typography. Inspect `frontend/src/index.css`, `frontend/src/App.css`, and component styles for CSS variables, tokens, and spacing guidelines; prefer reusing those variables rather than introducing new colors.

- When adding animations or flashy UI, preserve existing behavior and avoid breaking changes: add new components rather than modifying existing props, use feature flags or separate routes, and keep backward-compatible API shapes. Run the frontend build and lint (npm run build && npm run lint) and run backend smoke checks before committing.

- Accessibility & fallback: respect user's `prefers-reduced-motion` and provide simpler spinners or text fallbacks for screen readers. Ensure overlays can be dismissed and do not block necessary keyboard interactions.

- Communication: always ask clarifying questions when requirements, assumptions, or scope are unclear. Open an issue or PR with `?`-tagged questions, request reviews for UI/UX changes, and document decisions in PR descriptions.

## Code Style

- **Python**: FastAPI conventions, type hints preferred
- **JavaScript**: ES6+ modules, async/await for Web3 calls
- **Solidity**: OpenZeppelin patterns, explicit visibility modifiers
- **Comments**: Minimal - only for complex blockchain interactions or crypto logic

## Dependencies

**Backend**: FastAPI, SQLAlchemy, Web3.py, eth-account, python-jose, uvicorn
**Frontend**: React 19, Vite 8, ethers.js 6, axios, react-router-dom
**AI Modules**: opencv-python, roboflow, google-genai, matplotlib (for fault detection/context comparison)

## Testing Guidance

- Integration tests should mock blockchain calls (use local Hardhat/Ganache)
- Test signature verification separately from API endpoints
- Frontend wallet tests should use test networks (Sepolia/Goerli)
- Always verify multisig signature recovery before executing milestones
