# 📄 SATYA – COMPLETE SYSTEM DOCUMENTATION

## Randomized Admin Selection + Jury-Based Dispute Resolution

---

# 🧩 1. SYSTEM OVERVIEW

This system enhances the traditional tender lifecycle by introducing:

* 🎲 Randomized Admin Assignment
* 🧑‍⚖️ Jury-Based Dispute Resolution
* 🗳️ On-Chain Voting Mechanism
* 💸 Automated Fund Settlement
* 🚫 VOID Tender State

These features collectively reduce bribery risk, improve fairness, and introduce decentralized governance.

---

# 🏗️ 2. ARCHITECTURE

## 📍 Contracts

### 1. TenderFactory.sol

* Manages:

  * Government roles
  * Role pools (Engineers, Auditors, etc.)
  * Tender deployment
  * Random admin assignment

### 2. Tender.sol

* Manages:

  * Bidding
  * Milestones
  * Fund distribution
  * Dispute resolution (NEW)

---

# 🎭 3. ROLE MANAGEMENT (FACTORY)

## Role Pools

```solidity
address[] public onSiteEngineers;
address[] public complianceOfficers;
address[] public financialAuditors;
address[] public sanctioningAuthorities;
```

Each address can belong to **only one role**.

---

## ➕ addToRole(address user, RoleType role)

### Purpose

Assign a user to a specific role pool.

### Parameters

* `user`: wallet address
* `role`: enum (Engineer, Auditor, etc.)

### Rules

* Only owner can call
* User cannot have multiple roles

---

## ➖ removeFromRole(address user)

### Purpose

Remove user from their assigned role pool.

---

## 📦 getAllRolePools()

### Returns

```solidity
(
  address[] onSiteEngineers,
  address[] complianceOfficers,
  address[] financialAuditors,
  address[] sanctioningAuthorities
)
```

### Used for

* Jury selection in dispute system

---

# 🎲 4. RANDOM ADMIN ASSIGNMENT

## 📍 Inside createTender()

### Logic

* 1 random address is picked from each role pool
* Assigned as:

  * On-Site Engineer
  * Compliance Officer
  * Financial Auditor
  * Sanctioning Authority

---

## Randomness

```solidity
keccak256(block.timestamp, block.prevrandao, msg.sender)
```

---

## Constraints

```solidity
require(onSiteEngineers.length > 0);
require(complianceOfficers.length > 0);
require(financialAuditors.length > 0);
require(sanctioningAuthorities.length > 0);
```

---

# ⚖️ 5. DISPUTE SYSTEM

## Dispute Struct

```solidity
struct Dispute {
    uint256 milestoneId;
    string reason;
    address[] voters;
    uint256 votesForGov;
    uint256 votesForContractor;
    bool resolved;
}
```

---

## State Variables

```solidity
address public tenderOwner;
Dispute public dispute;
mapping(address => bool) public hasVoted;
```

---

# 🚨 6. RAISE DISPUTE

## Function

```solidity
raiseDispute(uint256 milestoneId, string reason)
```

---

## Who Can Call

* Government
* Contractor

---

## Conditions

```solidity
require(dispute.voters.length == 0 || dispute.resolved);
require(pool.length >= 3);
require(milestoneId < milestones.length);
```

---

## Jury Selection Logic

| Total Pool Size | Jury Size   |
| --------------- | ----------- |
| ≤ 11            | nearest odd |
| > 11            | 11          |

---

## Examples

| Pool | Jury |
| ---- | ---- |
| 10   | 9    |
| 9    | 9    |
| 4    | 3    |

---

## Random Selection

```solidity
voters[i] = pool[random % pool.length];
```

---

## Frontend Behavior

When dispute is raised:

Display:

* Dispute reason
* Milestone ID
* Jury members

---

# 🗳️ 7. VOTING SYSTEM

## Function

```solidity
vote(bool supportGovernment)
```

---

## Parameters

* `true` → Government wins
* `false` → Contractor wins

---

## Conditions

* Must be part of jury
* Cannot vote twice

---

## Frontend Behavior

### If user is voter:

* Show voting buttons

### If already voted:

* Disable voting
* Show confirmation

### If not voter:

* Show read-only view

---

# ⚡ 8. DISPUTE RESOLUTION

## Trigger Condition

```solidity
totalVotes == voters.length
```

---

## Outcomes

### 🟥 Government Wins

* 100% funds → Government

```solidity
transfer entire balance → tenderOwner
```

---

### 🟩 Contractor Wins

* Contractor gets milestone payout
* Remaining funds → Government

```solidity
payout = (winningBid * milestonePercentage) / 100
```

---

## Final State

```solidity
tenderStatus = VOID;
```

---

# 🚫 9. VOID STATE

## Meaning

* Tender is terminated permanently
* No further actions allowed

---

## Frontend Behavior

| State  | UI                                |
| ------ | --------------------------------- |
| ACTIVE | normal                            |
| VOID   | disabled, show "Dispute Resolved" |

---

# 💰 10. FUND FLOW

## Before Dispute

* Funds locked in contract

## After Dispute

| Outcome         | Distribution                                |
| --------------- | ------------------------------------------- |
| Government wins | 100% → Government                           |
| Contractor wins | milestone % → contractor, rest → government |

---

# 🧠 11. FRONTEND REQUIREMENTS

## Dispute UI

Display:

* Reason
* Milestone
* Voters
* Vote counts
* Resolution status

---

## Voting UI

* Enable voting for jury members
* Disable after vote
* Show result status

---

## Tender Display

* Add support for:

```solidity
VOID
```

---

# 🔐 12. SECURITY NOTES

## Randomness

```solidity
block.timestamp + prevrandao
```

### Status

* ✅ Acceptable for hackathon
* ❌ Not secure for production

---

## Known Limitations

* Duplicate voters possible
* No early majority (all votes required)

---

# 🚀 13. SYSTEM STRENGTH

This system achieves:

* Anti-bribery admin assignment
* Decentralized arbitration
* Transparent voting
* Automated payouts
* Strong lifecycle control

---

# 🧾 FINAL SUMMARY

Your system now includes:

* 🎲 Random admin selection
* 🧑‍⚖️ Jury-based dispute resolution
* 🗳️ On-chain voting
* 💸 Automated fund settlement
* 🚫 VOID contract lifecycle

---

# 🔮 OPTIONAL FUTURE IMPROVEMENTS

* Chainlink VRF randomness
* Unique jury selection (no duplicates)
* Early majority resolution
* Commit-reveal voting

---
