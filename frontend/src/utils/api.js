const API_BASE = 'http://localhost:8000';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }

  return data;
}

// ── Citizen Auth ──
export function sendAadhaarOTP(aadhaar_number) {
  return request('/api/auth/aadhaar/send-otp', {
    method: 'POST',
    body: JSON.stringify({ aadhaar_number }),
  });
}

export function verifyAadhaarOTP(aadhaar_number, otp) {
  return request('/api/auth/aadhaar/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ aadhaar_number, otp }),
  });
}

// ── Wallet Auth ──
export function walletConnect(wallet_address) {
  return request('/api/auth/wallet/connect', {
    method: 'POST',
    body: JSON.stringify({ wallet_address }),
  });
}

export function walletVerify(wallet_address, signature) {
  return request('/api/auth/wallet/verify', {
    method: 'POST',
    body: JSON.stringify({ wallet_address, signature }),
  });
}

// ── Contractor Management ──
export function registerContractor(wallet_address, company_name) {
  return request('/api/contractors/register', {
    method: 'POST',
    body: JSON.stringify({ wallet_address, company_name }),
  });
}

export function listContractors() {
  return request('/api/contractors/list', { method: 'GET' });
}

export function validateReport(description, imageUrls = []) {
  const token = localStorage.getItem('satya_token');
  return request('/api/reports/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ description, image_urls: imageUrls }),
  });
}

export function submitReport(contract_id, cid) {
  const token = localStorage.getItem('satya_token');
  return request('/api/reports/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ contract_id, cid }),
  });
}
