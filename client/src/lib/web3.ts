import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';

export type Web3State = {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  connected: boolean;
};

export const initialWeb3State: Web3State = {
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  connected: false,
};

export async function connectWallet(): Promise<Web3State> {
  if (!window.ethereum) {
    toast({
      title: "MetaMask Not Found",
      description: "Please install MetaMask to interact with this application",
      variant: "destructive"
    });
    throw new Error("MetaMask not found");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    
    return {
      provider,
      signer,
      account: accounts[0],
      chainId: Number(network.chainId),
      connected: true
    };
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    toast({
      title: "Connection Failed",
      description: "Failed to connect to MetaMask",
      variant: "destructive"
    });
    throw error;
  }
}

export function subscribeToAccountChanges(callback: (accounts: string[]) => void) {
  if (!window.ethereum) return;
  
  window.ethereum.on('accountsChanged', callback);
  return () => {
    window.ethereum.removeListener('accountsChanged', callback);
  };
}

export function subscribeToChainChanges(callback: (chainId: string) => void) {
  if (!window.ethereum) return;
  
  window.ethereum.on('chainChanged', callback);
  return () => {
    window.ethereum.removeListener('chainChanged', callback);
  };
}
