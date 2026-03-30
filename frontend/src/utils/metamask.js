import { BrowserProvider } from 'ethers';

/**
 * Check if MetaMask is available in the browser.
 */
export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Request MetaMask to connect and return the first account address.
 */
export async function connectMetaMask() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install the MetaMask browser extension.');
  }

  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found. Please unlock MetaMask.');
  }

  return accounts[0].toLowerCase();
}

/**
 * Sign a message using MetaMask to prove wallet ownership.
 * @param {string} message - The message to sign (contains the nonce from backend)
 * @returns {string} The signature
 */
export async function signMessage(message) {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(message);
  return signature;
}
