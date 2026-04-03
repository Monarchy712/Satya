# 🏗️ Tender Management System (Blockchain + EIP-712 Multisig)

This system implements a **fully on-chain tender lifecycle** with **EIP-712 multisignature milestone approvals**.

It replaces backend-driven approvals with **cryptographic consensus between 4 admins (4/4 required)**.

---

# 📦 CONTRACTS OVERVIEW

## 1. TenderFactory

* Deploys new Tender contracts
* Tracks all tenders
* Maps users → involved tenders

## 2. Tender 

* Handles bidding, contractor selection
* Manages milestones
* Enforces multisig approval (EIP-712)

---

# 🔁 COMPLETE SYSTEM FLOW

### Step 1 — Government creates tender

→ `TenderFactory.createTender()`

### Step 2 — Government selects contractor

→ `Tender.selectContractor()`

### Step 3 — Contractor submits milestone

→ `Tender.submitMilestone()`

### Step 4 — Admins sign off-chain (EIP-712)

### Step 5 — Anyone executes milestone

→ `Tender.executeMilestone()`

### Step 6 — Contract finalizes and pays contractor

---

# 🏭 TENDER FACTORY FUNCTIONS

## 1. `createTender(...)`

### 🔹 Who calls?

Government only

### 🔹 Purpose:

Creates a new Tender contract

### 🔹 When to call?

When a new project/tender is created

### 🔹 Inputs:

* `_admins` → 4 admin wallet addresses
* `_startTime`, `_endTime`, `_biddingEndTime`
* `_retainedPercent`
* `_names`, `_percentages`, `_deadlines` → milestone data

### 🔹 Output:

* Returns new Tender contract address

---

## 2. `getUserTenders(address user)`

### 🔹 Purpose:

Returns all tender contracts a user is involved in

### 🔹 When to call?

* Dashboard load
* User login

---

## 3. `getAllTenders()`

### 🔹 Purpose:

Returns all tenders created

### 🔹 When to call?

* Admin panel
* Explorer view

---

# 📜 TENDER CONTRACT FUNCTIONS

---

# 👤 ROLE & USER FUNCTIONS

## 1. `getUserRole(address user)`

### 🔹 Returns:

Enum role

### 🔹 Used internally

---

## 2. `getRoleName(address user)`

### 🔹 Returns:

String role

### 🔹 When to call?

Frontend display

### 🔹 Possible values:

* "OnSiteEngineer"
* "ComplianceOfficer"
* "FinancialAuditor"
* "SanctioningAuthority"
* "Contractor"
* "Government"

---

## 3. `getUserInfo(address user)`

### 🔹 Returns:

* `involved` → bool
* `role` → string
* `milestoneId` → current milestone
* `status` → milestone status

### 🔹 When to call?

* Dashboard load
* Contract detail page

---

## 4. `hasUserSigned(uint256 id, address user)`

### 🔹 Returns:

Whether user has signed milestone

### 🔹 When to call?

* Show "Signed / Pending" UI
* Approval progress tracking

---

# 🏗️ BIDDING / SETUP

## 5. `selectContractor(address _contractor, uint256 _winningBid)`

### 🔹 Who calls?

Government

### 🔹 When?

After bidding phase ends

### 🔹 Effect:

* Sets contractor
* Activates contract
* Assigns CONTRACTOR role

---

# 📊 MILESTONE FLOW

---

## 6. `submitMilestone(uint256 id)`

### 🔹 Who calls?

Contractor

### 🔹 When?

When milestone work is completed

### 🔹 Conditions:

* Must be current milestone
* Must be ACTIVE

### 🔹 Effect:

* Changes status → `UNDER_REVIEW`
* Starts multisig process

---

## 7. `executeMilestone(uint256 id, bytes[] signatures)`

### 🔹 Who calls?

Anyone (backend or relayer typically)

### 🔹 When?

After collecting all 4 admin signatures

### 🔹 Inputs:

* `id` → milestone id
* `signatures` → 4 EIP-712 signatures

### 🔹 What it does:

1. Verifies all signatures
2. Confirms each signer is an admin
3. Ensures no duplicates
4. Executes milestone

### 🔹 Effect:

* Funds transferred
* Milestone → APPROVED
* Moves to next milestone

---

# 🔐 EIP-712 SIGNING (Frontend / Backend)

Each admin signs:

```
Domain:
- name: "Tender"
- version: "1"
- chainId
- verifyingContract

Types:
Approve:
  - milestoneId (uint256)
  - tender (address)
```

---

# 📌 MILESTONE ID

* Milestone ID = index in array
* Starts from 0
* Controlled by `currentMilestone`

---

# 🔄 IMPORTANT RULES

* Only **current milestone** can be processed
* Requires **exactly 4 signatures**
* Each admin can sign **only once**
* Execution happens **only after all signatures**

---

# 🧠 FRONTEND FLOW (ANTIGRAVITY)

## Dashboard Load

1. Call `getUserTenders(user)`
2. For each tender:

   * `getUserInfo(user)`
   * `getRoleName(user)`

---

## Milestone View

1. Fetch `currentMilestone`
2. Show:

   * Status
   * Who signed → `hasUserSigned`

---

## Signing Flow

1. Admin clicks "Sign"
2. Generate EIP-712 signature (OFF-CHAIN)
3. Send signature to backend

---

## Execution Flow

1. Collect 4 signatures
2. Call:

```
executeMilestone(id, signatures)
```

---

# ⚠️ IMPORTANT DESIGN NOTES

* Multisig is **fully on-chain verified**
* Backend is **NOT trusted**, only used for coordination
* No duplicate signatures allowed
* Signatures are tied to:

  * milestoneId
  * contract address

---

# 🚀 SUMMARY

This system provides:

* ✅ Trustless milestone approvals
* ✅ Gas-efficient multisig (1 tx instead of 4)
* ✅ Role-based access control
* ✅ Clean frontend integration
* ✅ Production-grade architecture

---

# 🧩 OPTIONAL FUTURE EXTENSIONS

* Partial multisig (3/4 quorum)
* Rejection flow
* Deadline penalties
* Meta-transactions (gasless execution)
* Event indexing for real-time UI

---

**End of Documentation**
