import { ethers } from 'ethers';
import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';

const CONTRACT_ADDRESS = "0xc52fb4Db775903A5A9186ddBD307De55310Ed1bd"; // Updated Agent Trump Contract
const CHAIN_ID = "0x14a34"; // Base Sepolia: 84532 in hex
const BASE_SEPOLIA_CONFIG = {
  chainId: CHAIN_ID,
  chainName: "Base Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

// Updated ABI with fallback options and proper return types
const CONTRACT_ABI = [
  "function getPlayerPersuasionScore(address player) view returns (uint256)",
  "function gameEndBlock() view returns (uint256)",
  "function escalationStartBlock() view returns (uint256)",
  "function lastGuessBlock() view returns (uint256)",
  "function currentMultiplier() view returns (uint256)",
  "function totalCollected() view returns (uint256)",
  "function currentRequiredAmount() view returns (uint256)",
  "function lastPlayer() view returns (address)",
  "function gameWon() view returns (bool)",
  "function escalationActive() view returns (bool)",
  "function getTimeRemaining() view returns (uint256)",
  "function submitGuess(string calldata response) payable",
  "function getPlayerResponseCount(address player) view returns (uint256)",
  "function getPlayerResponseByIndex(address player, uint256 index) view returns (string memory response, uint256 timestamp, bool exists)",
  "function getContractBalance() view returns (uint256)",
  "function isGameOver() view returns (bool)",
  "function startEscalation()",
  "function getEscalationPrice() view returns (uint256)",
  "event GuessSubmitted(address indexed player, uint256 amount, uint256 multiplier, string response, uint256 blockNumber, uint256 responseIndex)"
];

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  address: string | null;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  clearMessages: () => void;
  getEscalationPrice: () => Promise<string>;
  isGameOver: () => Promise<boolean>;
}

export const useWeb3Store = create<Web3State>((set, get) => ({
  provider: null,
  signer: null,
  contract: null,
  address: null,
  balance: null,

  connect: async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        title: "MetaMask Required",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      set((state) => {
        state.clearMessages();
        return state;
      });

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [BASE_SEPOLIA_CONFIG],
            });
          } catch (addError) {
            toast({
              title: "Network Error",
              description: "Failed to add Base Sepolia network",
              variant: "destructive",
            });
            return;
          }
        } else {
          toast({
            title: "Network Error",
            description: "Please switch to Base Sepolia network",
            variant: "destructive",
          });
          return;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const signer = await provider.getSigner(address);
      const balance = ethers.formatEther(await provider.getBalance(address));

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      try {
        await contract.gameWon();
      } catch (error: any) {
        console.error("Contract connection error:", error);
        toast({
          title: "Contract Error",
          description: "Failed to connect to game contract. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      set({ provider, signer, contract, address, balance });

      toast({
        title: "Wallet Connected",
        description: "Successfully connected to Base Sepolia network",
      });

      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length === 0) {
          set({ provider: null, signer: null, contract: null, address: null, balance: null });
        } else {
          const newAddress = accounts[0];
          const newBalance = ethers.formatEther(await provider.getBalance(newAddress));
          set((state) => ({ ...state, address: newAddress, balance: newBalance }));
        }
      });

    } catch (error: any) {
      console.error("Failed to connect:", error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  },

  disconnect: () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
    }
    set({ 
      provider: null, 
      signer: null, 
      contract: null, 
      address: null, 
      balance: null 
    });
    set((state) => {
      state.clearMessages();
      return state;
    });
    toast({
      title: "Wallet Disconnected",
      description: "Successfully disconnected wallet",
    });
  },

  reset: () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
    }
    set({ 
      provider: null, 
      signer: null, 
      contract: null, 
      address: null, 
      balance: null 
    });
  },

  clearMessages: () => {
    set((state) => ({ ...state }));
  },

  getEscalationPrice: async () => {
    const { contract } = get();
    if (!contract) return "0";
    try {
      const price = await contract.getEscalationPrice();
      return formatEther(price);
    } catch (error) {
      console.error("Error getting escalation price:", error);
      return "0.0018"; 
    }
  },

  isGameOver: async () => {
    const { contract } = get();
    if (!contract) return false;
    try {
      return await contract.isGameOver();
    } catch (error) {
      console.error("Error checking game over state:", error);
      return false;
    }
  },
}));

export const formatEther = ethers.formatEther;
export const parseEther = ethers.parseEther;