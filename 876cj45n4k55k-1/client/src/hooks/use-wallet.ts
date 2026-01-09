import { useState } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  async function connect() {
    if (!(window as any).ethereum) throw new Error('No wallet found');
    const p = new ethers.BrowserProvider((window as any).ethereum as any);
    const accounts = await p.send('eth_requestAccounts', []);
    setProvider(p);
    setAddress(accounts[0]);
    return { provider: p, address: accounts[0] };
  }

  return { address, provider, connect };
}
