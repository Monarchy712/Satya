const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // For FormData, we must let the browser set the Content-Type with the correct boundary
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
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

export function validateReport(files, contractId = null) {
  const token = localStorage.getItem('satya_token');
  const formData = new FormData();
  
  // Append up to 3 files for validation
  const filesArray = Array.from(files);
  filesArray.slice(0, 3).forEach((file) => {
    formData.append('files', file);
  });

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  if (contractId) {
    headers['contract-id'] = contractId;
  }

  return request('/api/reports/validate', {
    method: 'POST',
    headers,
    body: formData,
  });
}

export function submitReport(contract_id, cid, confidence) {
  const token = localStorage.getItem('satya_token');
  return request('/api/reports/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ contract_id, cid, confidence }),
  });
}
