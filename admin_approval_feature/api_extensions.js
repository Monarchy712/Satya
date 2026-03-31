// =========================================================================
// API EXTENSIONS FOR ADMIN APPROVAL
// Integrate these functions into frontend/src/utils/api.js
// =========================================================================

// Assuming the base URL is defined in api.js
const API_BASE = 'http://localhost:8000';

// Helper function duplicate (or just use the one already in api.js)
async function fetchRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };
  headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed with status ${res.status}`);
  return data;
}

/**
 * Fetch the required data for a specific milestone
 * Endpoint can be adjusted if it differs in the live backend.
 */
export function getMilestoneDetails(milestoneId) {
  const token = localStorage.getItem('satya_token');
  return fetchRequest(`/api/milestones/${milestoneId}`, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
}

/**
 * Approve a milestone
 * Submits the approval to the backend which triggers the smart contract function.
 */
export function approveMilestone(milestoneId, walletAddress) {
  const token = localStorage.getItem('satya_token');
  return fetchRequest('/approve-milestone', {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ milestoneId, walletAddress })
  });
}
