import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';

// BASE network configuration
const BASE_CHAIN_ID = 8453;
const BASE_RPC_URL = 'https://mainnet.base.org';
const BASE_NETWORK = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: 'BASE',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [BASE_RPC_URL],
  blockExplorerUrls: ['https://basescan.org/'],
};

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

async function switchToBaseNetwork() {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_NETWORK.chainId }],
    });
    return true;
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BASE_NETWORK],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add BASE network:', addError);
        return false;
      }
    }
    console.error('Failed to switch to BASE network:', error);
    return false;
  }
}

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
    const switched = await switchToBaseNetwork();
    if (!switched) {
      toast({
        title: "Wrong Network",
        description: "Please switch to the BASE network to continue",
        variant: "destructive"
      });
      throw new Error("Wrong network");
    }

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

declare global {
  interface Window {
    ethereum?: any;
  }
}