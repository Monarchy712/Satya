# Integration Instructions for Gas Price Prediction Module

Hello Antigravity Agent! This file outlines the instructions for integrating the gas price predictive feature (`optimalGasPricePrediction.py`) into the broader project architecture. 

**IMPORTANT**: Please follow these precise instructions to incorporate the module effectively.

## 1. Dynamic Gas Price Storage Service
You need to implement a dynamic data storage component (such as an in-memory store, Redis, or a background context state) that updates continuously.
- **Initialization**: This feature must start working asynchronously in the background as soon as the website is loaded.
- A background scheduler or worker must execute the gas price predictor algorithm **every 5 seconds**.
- The algorithm's output will update the dynamic storage.

## 2. Three Priority Service Levels
During each 5-second loop, the algorithm must calculate and store the optimal gas price for three specific `TARGET_CONFIRMATION_TIME` intervals. Provide these as options in the dynamic data storage:
- **Priority 0 (Lowest)**: `TARGET_CONFIRMATION_TIME = 60` seconds
- **Priority 1 (Medium)**: `TARGET_CONFIRMATION_TIME = 40` seconds
- **Priority 2 (Highest)**: `TARGET_CONFIRMATION_TIME = 20` seconds

Your background service should invoke `find_optimal_gas_price` separately for each target confirmation time and persist the results.

## 3. Global Project Integration (Transaction Mapping)
Every time a blockchain operation or transaction is prepared, fetch the gas price from the dynamic storage based on the following priority mapping:

| Transaction Type | Priority Level | Characteristics |
| :--- | :--- | :--- |
| `executeMilestone` | **2 (Highest)** | Send immediately, enable gas boost if stuck |
| `finalize` | **2 (Highest)** | No batching |
| `selectContractor` | **2 (Highest)** | Immediate processing |
| `receive` | **2 (Highest)** | Immediate processing |
| `submitMilestone` | **1 (Medium)** | Allow small delay |
| `submitReport` | **1 (Medium)** | Allow batching |
| `createTender` | **0 (Lowest)** | Wait for low congestion |
| `registerUser` | **0 (Lowest)** | Wait for low congestion |

- **Never compute the gas price directly prior to sending.**
- **Fetch the gas price** directly from the dynamic data storage according to these priorities.
- Implementation must work correctly to send from the respective priority queue while fetching the predicted `gas_price`.

Please review the codebase, figure out the best mechanism to implement this background service and caching abstraction, and weave it into the main project's transaction dispatcher workflows.
