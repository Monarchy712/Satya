# 📘 Tender System Implementation Guide (Backend-Driven Version)

This document explains the **updated architecture and usage** of:

* `TenderFactory.sol`
* `Tender.sol`

This version reflects your **final design change**:

> ⚠️ **All file uploads + ML processing happen OFF-CHAIN (backend)**
> Blockchain only handles **state + money + validation**

---

# 🧠 SYSTEM OVERVIEW

## 🔄 Updated Architecture

```text
Contractor → Backend (uploads images)
Backend → ML model → computes % completion
Backend → calls smart contract (evaluateMilestone)
Contract → handles logic + payments
```

### Key Principle:

👉 **Smart contract = financial + state engine**
👉 **Backend = intelligence (ML + validation)**

---

# 🏭 TENDER FACTORY CONTRACT

---

## 🔹 constructor()

### Purpose:

Sets the government address.

### Who calls:

* Government wallet (deployment)

---

## 🔹 createTender(...)

### Purpose:

Deploys a new Tender contract.

---

### Parameters:

| Parameter          | Description                                |
| ------------------ | ------------------------------------------ |
| `_admins`          | [Engineer, Compliance, Auditor, Authority] |
| `_startTime`       | Tender start time                          |
| `_endTime`         | Tender end time                            |
| `_biddingEndTime`  | Bidding deadline                           |
| `_retainedPercent` | % of deposit retained                      |
| `_names`           | Milestone names                            |
| `_percentages`     | Milestone payment distribution             |
| `_deadlines`       | Milestone deadlines                        |

---

### Backend Usage:

```javascript
await factory.createTender(
  admins,
  startTime,
  endTime,
  biddingEndTime,
  retainedPercent,
  names,
  percentages,
  deadlines
);
```

---

### Output:

* Deploys new Tender contract
* Emits event
* Stores metadata

---

## 🔹 getAllTenders()

### Purpose:

Returns all deployed tenders.

### Frontend Use:

* Dashboard listing

---

# 📄 TENDER CONTRACT

---

# 🔐 ROLES

| Role       | Responsibility                        |
| ---------- | ------------------------------------- |
| Government | Controls entire flow                  |
| Contractor | Executes work                         |
| Admins     | Stored but not actively used in logic |

---

# 🧾 CONSTRUCTOR

### Purpose:

Initializes tender.

### Validations:

* Admin count = 4
* Array lengths match
* Percentages sum = 100
* Timeline valid

---

# 💰 FUNDING

---

## 🔹 fundContract()

### Purpose:

Government deposits ETH for milestone payouts.

### When:

* Before milestone completion

### Backend Example:

```javascript
await tender.fundContract({
  value: totalBudgetInWei
});
```

---

# 🏁 BIDDING PHASE

---

## 🔹 placeBid(amount)

### Who:

* Contractors

### Conditions:

* Before `biddingEndTime`
* Only once per address

---

## 🔹 selectContractor(address, amount)

### Who:

* Government

### When:

* After bidding ends

### Logic:

* Verifies bidder exists
* Verifies exact bid amount
* Assigns contractor
* Moves contract → ACTIVE

---

# 💳 DEPOSIT SYSTEM

---

## 🔹 deposit()

### Who:

* Selected contractor

### Requirement:

* Must send **30% of winning bid**

---

### Logic:

```text
1. Calculate distributable deposit
2. Spread across milestones
3. Store depositShare per milestone
```

---

# 🏗️ MILESTONE FLOW (UPDATED)

---

## 🚨 IMPORTANT CHANGE

❌ No IPFS on-chain
❌ No contractor-triggered submission

✅ Backend controls evaluation trigger

---

# 🔄 FLOW PER MILESTONE

```text
1. Contractor completes work (off-chain)
2. Contractor uploads to backend
3. Backend runs ML model
4. Backend calls smart contract:
   → submitWorkForReview()
   → evaluateMilestone()
```

---

# 🔹 submitWorkForReview(id)

### Who:

* Government (or backend using gov wallet)

### Purpose:

Moves milestone into review state.

---

### Logic:

```text
PENDING → UNDER_REVIEW
```

---

### When:

* After backend receives work

---

# 🔹 evaluateMilestone(id, percent)

### Who:

* Government (backend-controlled)

### Input:

* `percent` → ML output (0–100)

---

# ⚙️ DECISION ENGINE

---

## ✅ Case 1: Good Work

```text
percent >= 90 AND before deadline
```

➡️ Milestone approved
➡️ Contractor paid
➡️ Deposit returned

---

## 🔁 Case 2: Incomplete Work

```text
percent < 90 AND before deadline
```

➡️ Milestone reset
➡️ Contractor must redo
➡️ Status → PENDING

---

## ⏰ Case 3: Late Completion

```text
After deadline (any %)
```

➡️ Milestone finalized
➡️ Penalty applied

---

# 💸 FINALIZATION LOGIC

---

## 🔹 _finalize(id)

### Internal Function

---

## Step 1: Penalty

```text
If late → 50%
Else → 0%
```

---

## Step 2: Deposit Split

```text
slashAmount = depositShare * penalty
returnAmount = depositShare - slashAmount
```

---

## Step 3: Transfers

| Transfer | Destination |
| -------- | ----------- |
| Slash    | Government  |
| Return   | Contractor  |
| Payout   | Contractor  |

---

## Step 4: State Update

```text
Milestone → APPROVED
currentMilestone++
```

---

## Step 5: Completion Check

```text
if last milestone → COMPLETED
```

---

# ❌ CANCELLATION

---

## 🔹 cancelTender()

### Who:

* Government

### Logic:

* Cancels tender
* Refunds remaining deposit

---

# 📊 GETTERS

---

## 🔹 getMilestone(id)

Returns full milestone struct.

### Used in:

* Frontend milestone display

---

## 🔹 getAllBids()

Returns all bids.

### Used in:

* Backend sorting / analytics

---

# 💳 PAYMENT SYSTEM

All transfers use:

```solidity
(bool success, ) = receiver.call{value: amount}("");
require(success);
```

---

# 🌐 BACKEND RESPONSIBILITIES

---

## Backend MUST handle:

### 1. File Upload

* Store images/videos
* No blockchain involvement

---

### 2. ML Processing

* Compute completion %
* Ensure accuracy

---

### 3. Smart Contract Calls

```javascript
await tender.submitWorkForReview(id);

await tender.evaluateMilestone(id, percent);
```

---

### 4. Wallet Control

Backend must:

* Control government wallet OR
* Use secure signer

---

# 🖥️ FRONTEND FLOW

---

## 👷 Contractor UI

1. View tenders
2. Place bid
3. If selected → deposit
4. Complete work (off-chain)
5. Wait for evaluation

---

## 🏛️ Government UI

1. Create tender
2. View bids
3. Select contractor
4. Trigger evaluation
5. Monitor progress

---

# ⚠️ IMPORTANT RULES

---

## ❗ 1. Strict milestone order

```text
id == currentMilestone
```

---

## ❗ 2. Deposit required

No work allowed without deposit

---

## ❗ 3. Contract must be funded

Before payouts:

```text
fundContract()
```

---

## ❗ 4. Backend is trusted

Backend:

* Decides completion %
* Drives evaluation

---

## ❗ 5. Percent must sum to 100

---

# 🚀 DEPLOYMENT CHECKLIST

* [ ] Deploy Factory
* [ ] Create Tender
* [ ] Fund contract
* [ ] Test bidding
* [ ] Test evaluation flow
* [ ] Test penalty case
* [ ] Test cancellation

---

# 🧠 FINAL SYSTEM SUMMARY

This system is:

* ✔ Backend-driven (ML handled off-chain)
* ✔ Gas-efficient
* ✔ Simple and deterministic
* ✔ Financially secure
* ✔ Production-friendly

---

# 🔥 FINAL ARCHITECTURE

```text
Backend (ML + Storage)
        ↓
Smart Contract (State + Payments)
        ↓
Users (Contractor + Government)
```

---


