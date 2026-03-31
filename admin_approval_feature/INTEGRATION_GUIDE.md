# Admin Approval Feature — Integration Guide

Hello! This folder contains a self-sufficient feature bundle for the **Admin Approval Panel**, built adhering precisely to the retro transparency style guidelines of the Satya ledger. It respects wallet access control and gracefully handles unauthenticated views.

Currently, it lives in the root as requested to avoid conflicts with your ongoing development. Here are the steps the local Antigravity (or any teammate) should follow to integrate it into the `frontend/src`:

---

### Step 1: Move the Component Directory
Move the `AdminApprovalPanel.jsx` and `AdminApprovalPanel.css` files into the standard components structure.
```bash
# Example shell command:
mkdir -p frontend/src/components/AdminApproval
cp admin_approval_feature/AdminApprovalPanel.* frontend/src/components/AdminApproval/
```

### Step 2: Merge the API Logic
We created `api_extensions.js` instead of directly modifying your `api.js` to avoid conflicts.
1. Open your live `frontend/src/utils/api.js`.
2. Copy the two export functions `getMilestoneDetails` and `approveMilestone` from `admin_approval_feature/api_extensions.js`.
3. Paste them at the bottom of `api.js`.

### Step 3: Update Imports in the Component
Inside `frontend/src/components/AdminApproval/AdminApprovalPanel.jsx`, update the placeholder imports to route to your live utilities:

```javascript
// Remove the mock data layer and uncomment these lines:
import { connectMetaMask } from '../../utils/metamask';
import { getMilestoneDetails, approveMilestone } from '../../utils/api';
```

Replace the `setTimeout` mock code block in the `useEffect` and `handleApprove` functions with the live `getMilestoneDetails` and `approveMilestone` calls. The skeleton is already coded perfectly to accept this.

### Step 4: Add the Panel into the UI Flow
Finally, pick where you want to render the panel. It is designed to look great inside `ContractCard.jsx` at the bottom, or in its own dedicated route. Simply pass down the `milestoneId` prop:

```jsx
// Import at top
import AdminApprovalPanel from '../AdminApproval/AdminApprovalPanel';

// Somewhere in your render method:
<AdminApprovalPanel 
  milestoneId={contract.currentMilestoneId} 
  onApprovalSuccess={() => refreshContractData()} 
/>
```

### Done! 🎉 
The component will automatically handle fetching its own data, ensuring the wallet belongs to an admin, and triggering success toasts.
