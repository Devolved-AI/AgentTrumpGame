import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';

// BASE Sepolia network configuration
const BASE_CHAIN_ID = 84532; // Base Sepolia Chain ID
const BASE_RPC_URL = 'https://sepolia.base.org';
const BASE_NETWORK = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: 'Base Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [BASE_RPC_URL],
  blockExplorerUrls: ['https://sepolia.basescan.org/'],
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

const WALLET_STATE_KEY = 'wallet_connected';

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
        description: "Please switch to the Base Sepolia network to continue",
        variant: "destructive"
      });
      throw new Error("Wrong network");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    const state = {
      provider,
      signer,
      account: accounts[0],
      chainId: Number(network.chainId),
      connected: true
    };

    // Store wallet state in localStorage
    localStorage.setItem(WALLET_STATE_KEY, JSON.stringify({
      account: accounts[0],
      chainId: Number(network.chainId),
      connected: true
    }));

    return state;
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

export async function disconnectWallet(): Promise<Web3State> {
  localStorage.removeItem(WALLET_STATE_KEY);
  toast({
    title: "Wallet Disconnected",
    description: "Your wallet has been disconnected",
  });
  return initialWeb3State;
}

// Function to check if wallet was previously connected
export async function restoreWalletConnection(): Promise<Web3State | null> {
  try {
    const stored = localStorage.getItem(WALLET_STATE_KEY);
    if (!stored) return null;

    const { account, chainId } = JSON.parse(stored);
    if (!window.ethereum) return null;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();

    // Verify the stored account is still connected
    if (accounts.length > 0 && accounts[0].address.toLowerCase() === account.toLowerCase()) {
      const signer = await provider.getSigner();
      return {
        provider,
        signer,
        account,
        chainId,
        connected: true
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to restore wallet connection:', error);
    return null;
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